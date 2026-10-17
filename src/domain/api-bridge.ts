// Maps tic-api responses into the shapes this frontend already renders.
// Screens keep calling views(), payoutById() and verify(); this module is
// the only place that knows the HTTP contract.

import {
	approvePayout,
	askAgentApi,
	auditQuery,
	editInvoice,
	getPayout,
	ledgerQuery,
	offrampsQuery,
	payoutsQuery,
	payPayout,
	planAll,
	reconcilePayout,
	replayPlan,
	resetDemo,
	reviewSanctions,
	reviewSecurityHold,
	rulesQuery,
	settingsQuery,
	updateSettings,
	uploadInvoice,
	verifyQuery,
} from "@/lib/api";
import type {
	AgentReply,
	Plan as ApiPlan,
	Route as ApiRoute,
	Rule as ApiRule,
	Settings as ApiSettings,
	InvoicePatch,
	LedgerEntry,
	OfframpListing,
	PayoutDetail,
	Reroute,
} from "@/lib/contracts";
import { replaceCatalog } from "./data";
import { rememberFingerprint } from "./engine";
import { fmtDate, iso } from "./format";
import {
	type RemoteHit,
	remoteHit,
	setRemote,
	setServerVerify,
} from "./remote";
import type {
	AgentMessage,
	AppState,
	AuditEvent,
	Corridor,
	Invoice,
	Journal,
	Mut,
	Offramp,
	OfframpType,
	Outcome,
	Payout,
	Plan,
	RouteEval,
	Rule,
	Settings,
	Source,
	Status,
	ToastLine,
} from "./types";

const RAIL: Record<string, string> = {
	pix: "Pix",
	spei: "SPEI",
	cvu: "CVU",
	pse: "PSE",
	swift: "SWIFT",
};
const NET: Record<string, string> = {
	base: "Base",
	arbitrum: "Arbitrum",
	tron: "Tron",
};
const CITY: Record<string, string> = {
	BR: "São Paulo",
	MX: "Monterrey",
	AR: "Buenos Aires",
	VE: "Caracas",
	CO: "Bogotá",
};
const COUNTRY: Record<string, string> = {
	BR: "Brazil",
	MX: "Mexico",
	AR: "Argentina",
	VE: "Venezuela",
	CO: "Colombia",
};
const LOCALE: Record<string, string> = {
	BRL: "pt-BR",
	MXN: "es-MX",
	ARS: "es-AR",
	USD: "en-US",
	COP: "es-CO",
};

const LOW: Record<string, keyof Invoice | undefined> = {
	invoiceNumber: "number",
	payeeTaxId: "taxId",
	bankId: "bank",
	dueDate: "due",
	purposeCode: "purposeCode",
	description: "desc",
};

function dayFromIso(value: string) {
	return Math.round(
		(Date.parse(`${value}T00:00:00Z`) - Date.UTC(2026, 8, 25)) / 86_400_000,
	);
}

function outcome(value: string): Outcome {
	if (value === "require_fields") return "fields";
	if (
		value === "pass" ||
		value === "warn" ||
		value === "block" ||
		value === "fields"
	)
		return value;
	return "na";
}

function clock(at: string) {
	const day = at.slice(0, 10);
	const time = new Date(at).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${fmtDate(day)}, ${time}`;
}

function toOfframp(route: ApiRoute, country: Corridor): Offramp | null {
	const o = route.offramp;
	if (!o) return null;
	const asset = route.asset ?? o.assets[0] ?? "USDC";
	const net = NET[route.network ?? o.networks[0] ?? ""] ?? route.network ?? "";
	return {
		id: o.id,
		name: o.name,
		c: country,
		type: o.type as OfframpType,
		fee: route.feePct,
		asset,
		net,
		rail: RAIL[route.rail] ?? route.rail,
		min: route.minutes,
	};
}

function toRoute(route: ApiRoute, country: Corridor) {
	const off = toOfframp(route, country);
	const label = off
		? `${off.asset} · ${off.net} · ${off.name} · ${route.feePct.toFixed(2)}%`
		: `SWIFT wire · ${route.feePct.toFixed(2)}% · ${route.minutes >= 1440 ? `${route.minutes / 1440} days` : `${route.minutes} min`}`;
	return {
		id: route.id,
		kind: route.kind,
		off,
		fee: route.feePct,
		min: route.minutes,
		label,
	};
}

function toEval(
	route: ApiRoute,
	results: ApiPlan["evaluations"][number]["results"],
	country: Corridor,
): RouteEval {
	const mapped = results.map((r) => ({
		rule: {
			id: r.ruleId,
			c: country,
			from: r.effectiveFrom,
			to: null,
			kind: (r.outcome === "warn"
				? "warn"
				: r.outcome === "block"
					? "block"
					: "fields") as Rule["kind"],
			title: r.title,
			src: { name: r.source.name, short: r.source.name, url: r.source.url },
			ev: () => ["pass", ""] as [Outcome, string],
		},
		o: outcome(r.outcome),
		msg: r.message,
	}));
	return {
		route: toRoute(route, country),
		results: mapped,
		compliant: !mapped.some((x) => x.o === "block" || x.o === "fields"),
		warns: mapped.filter((x) => x.o === "warn").length,
	};
}

function toPlan(detail: PayoutDetail, country: Corridor): Plan {
	const api = detail.plan;
	const evals = (api?.evaluations ?? []).map((e) =>
		toEval(e.route, e.results, country),
	);
	const rec = api?.recommended
		? (evals.find((e) => e.route.id === api.recommended!.id) ?? null)
		: null;
	const status: Plan["status"] = rec
		? "ready"
		: evals.some((e) => e.results.some((x) => x.o === "fields"))
			? "needs_info"
			: "blocked";
	const plan: Plan = {
		iso: api?.asOf ?? "",
		evals,
		rec,
		engine: rec,
		overridden: false,
		overrideLost: false,
		status,
	};
	if (detail.fingerprint) rememberFingerprint(plan, detail.fingerprint);
	return plan;
}

function toPayout(detail: PayoutDetail): Payout {
	const inv = detail.invoice;
	const rate =
		detail.journal?.bookingRate ??
		(detail.amountUsd ? inv.amount / detail.amountUsd : 1);
	const bank = inv.bankId
		? `${RAIL[inv.bankId.type] ?? inv.bankId.type} · ${inv.bankId.value}`
		: "";
	const country = inv.payeeCountry as Corridor;
	const hold = detail.securityHold;
	return {
		id: detail.id,
		payee: inv.payeeName,
		city: CITY[country] ?? country,
		c: country,
		country: COUNTRY[country] ?? country,
		amount: inv.amount,
		cur: inv.currency,
		locale: LOCALE[inv.currency] ?? "en-US",
		rate,
		settle: detail.journal?.settleRate ?? rate,
		file: `${inv.invoiceNumber}.pdf`,
		low: inv.lowConfidence
			.map((f) => LOW[f])
			.filter((f): f is keyof Invoice => !!f),
		inv: {
			number: inv.invoiceNumber,
			taxId: inv.payeeTaxId ?? "",
			bank,
			due: inv.dueDate ?? "",
			purposeCode: inv.purposeCode,
			desc: inv.description,
		},
		usd: detail.amountUsd,
		...(hold
			? {
					security: {
						quote: hold.findings[0]?.quote ?? "",
						onFile: "",
						onInvoice: "",
						dupOf: "",
						findings: hold.findings,
						status: hold.status,
					},
				}
			: {}),
	};
}

function toMut(detail: PayoutDetail, plan: Plan): Mut {
	const terminal =
		detail.status === "approved" ||
		detail.status === "paid" ||
		detail.status === "booked" ||
		detail.status === "rejected";
	const rail = plan.rec?.route.off?.rail ?? "SWIFT";
	const journal: Journal | undefined = detail.journal
		? {
				id: detail.journal.id ?? detail.id,
				route: plan.rec?.route.label ?? "",
				lines: detail.journal.lines.map((l) => ({
					acct: l.description ? `${l.account} – ${l.description}` : l.account,
					dr: l.debit || null,
					cr: l.credit || null,
				})),
			}
		: undefined;
	return {
		approvals: detail.approvals.map((a) => ({
			who: a.approver,
			at: clock(a.at),
		})),
		...(terminal ? { final: detail.status as Status } : {}),
		...(terminal && plan.iso ? { lockedIso: plan.iso } : {}),
		...(detail.sanctionsReview?.decision === "released" &&
		detail.sanctionsReview.licenseRef
			? {
					license: {
						number: detail.sanctionsReview.licenseRef,
						by: detail.sanctionsReview.by,
					},
				}
			: {}),
		...(detail.securityHold?.status === "cleared" &&
		detail.securityHold.reviewedBy
			? {
					secCleared: {
						by: detail.securityHold.reviewedBy,
						note: detail.securityHold.reviewNote ?? "",
					},
				}
			: {}),
		...(detail.payment
			? {
					payment: {
						txHash: detail.payment.txHash ?? "",
						offrampRef: detail.payment.offrampRef ?? "",
						railRef: detail.payment.railRef,
						railName: rail,
						railMode: detail.payment.railMode,
					},
				}
			: {}),
		...(journal ? { journal } : {}),
	};
}

function toHit(detail: PayoutDetail): RemoteHit {
	const country = detail.invoice.payeeCountry as Corridor;
	const plan = detail.plan ? toPlan(detail, country) : emptyPlan();
	let status = (detail.status === "draft" ? "draft" : detail.status) as Status;
	const terminal = ["approved", "paid", "booked", "rejected"].includes(
		detail.status,
	);
	if (detail.onSecurityHold && !terminal) status = "security_hold"; // the security hold gates approval; a rejection is still final
	return {
		p: toPayout(detail),
		mut: toMut(detail, plan),
		plan,
		status,
		asOf: plan.iso,
	};
}

function emptyPlan(): Plan {
	return {
		iso: "",
		evals: [],
		rec: null,
		engine: null,
		overridden: false,
		overrideLost: false,
		status: "blocked",
	};
}

function catalog(rules: ApiRule[], offramps: OfframpListing[]) {
	const sources: Record<string, Source> = {};
	const mapped: Rule[] = rules.map((r) => {
		const key = r.source.url;
		sources[key] = {
			name: r.source.name,
			short: r.source.name,
			url: r.source.url,
		};
		return {
			id: r.id,
			c: r.corridor as Corridor,
			from: r.effectiveFrom,
			to: r.effectiveTo,
			kind:
				r.outcome === "warn"
					? "warn"
					: r.outcome === "block"
						? "block"
						: "fields",
			title: r.title,
			src: sources[key]!,
			liftedBy: r.liftedBy,
			ev: () => ["na", ""],
		};
	});
	const providers: Offramp[] = offramps.map((o) => ({
		id: o.id,
		name: o.name,
		c: o.country as Corridor,
		type: o.type as OfframpType,
		fee: o.feePct,
		asset: o.assets[0] ?? "USDC",
		net: NET[o.networks[0] ?? ""] ?? "",
		rail: RAIL[o.rail] ?? o.rail,
		min: o.minutes,
	}));
	replaceCatalog(mapped, providers, sources);
}

function describe(
	e: { type: string; payload: Record<string, unknown> },
	payee: string,
): string {
	const p = e.payload;
	const by = typeof p.by === "string" ? p.by : "";
	if (e.type === "extracted") return "Fields extracted from the invoice";
	if (e.type === "security_flagged") {
		const n = typeof p.findings === "number" ? p.findings : 0;
		return (
			"Injection scan: " +
			n +
			" instruction-like line" +
			(n === 1 ? "" : "s") +
			" flagged · security hold placed"
		);
	}
	if (e.type === "security_reviewed")
		return p.decision === "cleared"
			? `Security hold cleared by a person${by ? ` (${by})` : ""}`
			: `Kept on hold as suspicious${by ? ` (${by})` : ""}`;
	if (e.type === "sanctions_reviewed")
		return p.decision === "released"
			? "Sanctions hold released" +
					(p.licenseRef ? ` · general license ${String(p.licenseRef)}` : "") +
					(by ? ` · by ${by}` : "")
			: `Sanctions hold confirmed blocked${by ? ` · by ${by}` : ""}`;
	if (e.type === "screened")
		return p.match
			? `OFAC SDN: ${String(p.status)} · ${String(p.match)}`
			: "OFAC SDN: clear";
	if (e.type === "planned")
		return typeof p.recommendedRouteId === "string"
			? `Route ${p.recommendedRouteId}`
			: "Plan updated";
	if (e.type === "memo") return "Memo drafted";
	if (e.type === "approved") return `Approved${by ? ` by ${by}` : ""}`;
	if (e.type === "rejected") return `Rejected${by ? ` by ${by}` : ""}`;
	if (e.type === "paid") return `Sent${by ? ` · confirmed by ${by}` : ""}`;
	if (e.type === "reconciled") return "Matched and booked";
	if (e.type === "asof_changed")
		return `As-of moved to ${fmtDate(String(p.asOf ?? ""))}`;
	if (e.type === "settings_changed")
		return `Settings changed${by ? ` by ${by}` : ""}`;
	if (e.type === "edited") return `Fields reviewed${by ? ` · by ${by}` : ""}`;
	return payee ? `${payee} · ${e.type}` : e.type;
}

function settingsFrom(api: ApiSettings, prev: Settings): Settings {
	const disabled: Record<string, boolean> = {};
	for (const id of api.disabledOfframps) disabled[id] = true;
	return {
		...prev,
		threshold: api.policy.secondApproverAboveUsd,
		cap: api.policy.dailyCapUsd,
		objective: api.objective,
		disabled,
	};
}

/** Pull payouts, rules, settings, the audit chain and the ledger into the screens' state. */
export async function syncServer(local: AppState): Promise<Partial<AppState>> {
	const [details, settings, rules, offramps, events, verify, ledger] =
		await Promise.all([
			payoutsQuery.queryFn(),
			settingsQuery.queryFn(),
			rulesQuery.queryFn(),
			offrampsQuery.queryFn(),
			auditQuery.queryFn(),
			verifyQuery().queryFn(),
			ledgerQuery.queryFn(),
		]);
	catalog(rules, offramps);
	const hits = details.map(toHit);
	// Ledger rows carry the route label the journal card shows.
	for (const row of ledger) attachLedger(hits, row);
	setRemote(hits);
	setServerVerify(local.tamperSeq, {
		ok: verify.ok,
		brokenAt: verify.brokenAt,
	});

	const mut: Record<string, Mut> = {};
	for (const hit of hits) {
		const prev = local.mut[hit.p.id];
		mut[hit.p.id] = {
			...hit.mut,
			ack: prev?.ack,
			override: prev?.override,
			secCleared: prev?.secCleared,
			license: prev?.license,
		};
	}
	const ponte = offramps.find((o: OfframpListing) => /ponte/i.test(o.name));
	const ponteOn = !!(
		ponte && settings.registry[ponte.id] === "vasp_authorized"
	);
	const loaded =
		details.length > 0 &&
		details.every((p: PayoutDetail) => p.status !== "draft");
	return {
		loaded: loaded || local.loaded,
		day: dayFromIso(settings.asOf),
		settings: settingsFrom(settings, local.settings),
		mut,
		events: events
			.slice()
			.reverse()
			.map((e: (typeof events)[number]) => toAudit(e, hits)),
		registry: ponteOn ? { ponte: true } : {},
		radar: ponteOn
			? "approved"
			: local.radar === "rejected"
				? "rejected"
				: "pending",
	};
}

function attachLedger(hits: RemoteHit[], row: LedgerEntry) {
	const hit = hits.find((h) => h.p.id === row.payoutId);
	if (!hit) return;
	hit.mut.journal = {
		id: row.id,
		route: row.routeLabel,
		lines: row.lines.map((l) => ({
			acct: l.description ? `${l.account} – ${l.description}` : l.account,
			dr: l.debit || null,
			cr: l.credit || null,
		})),
	};
	if (row.match.txHash || row.match.railRef) {
		hit.mut.payment = {
			txHash: row.match.txHash ?? hit.mut.payment?.txHash ?? "",
			offrampRef: hit.mut.payment?.offrampRef ?? "",
			railRef: row.match.railRef ?? hit.mut.payment?.railRef ?? "",
			railName: RAIL[row.match.rail] ?? hit.mut.payment?.railName ?? "SWIFT",
		};
	}
}

function toAudit(
	e: {
		seq: number;
		type: string;
		payoutId: string | null;
		payload: Record<string, unknown>;
		createdAt: string;
		prevMac: string;
		mac: string;
	},
	hits: RemoteHit[],
): AuditEvent {
	const payee = e.payoutId
		? (hits.find((h) => h.p.id === e.payoutId)?.p.payee ?? "")
		: "";
	const time = new Date(e.createdAt).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
	return {
		seq: e.seq,
		type: e.type,
		pid: e.payoutId,
		payee,
		summary: describe(e, payee),
		time,
		payload: JSON.stringify(e.payload),
		prev: e.prevMac,
		hash: e.mac,
	};
}

export function rerouteLines(reroutes: Reroute[]): ToastLine[] {
	return reroutes.map((r) => {
		const hit = remoteHit(r.payoutId);
		const name = hit ? hit.p.payee.split(" ").slice(0, 2).join(" ") : "Payout";
		const num = hit ? hit.p.inv.number.slice(-4) : "";
		const nameOf = (id: string | null) => {
			if (!id) return "no compliant route";
			const ev = hit?.plan.evals.find((e) => e.route.id === id);
			if (ev) return ev.route.off ? ev.route.off.name : "SWIFT wire";
			return id.includes("wire") ? "SWIFT wire" : id;
		};
		return {
			head: `Rerouted ${name}${num ? ` ${num}` : ""}:`,
			body:
				nameOf(r.from) +
				" → " +
				nameOf(r.to) +
				(r.reason ? ` · ${r.reason}` : ""),
		};
	});
}

export function invoicePatch(
	current: Invoice,
	next: Invoice,
	bankType: InvoicePatch["bankId"],
): InvoicePatch {
	const patch: InvoicePatch = {};
	if (next.number !== current.number) patch.invoiceNumber = next.number;
	if ((next.taxId || null) !== (current.taxId || null))
		patch.payeeTaxId = next.taxId || null;
	if ((next.due || null) !== (current.due || null))
		patch.dueDate = next.due || null;
	if ((next.purposeCode || null) !== (current.purposeCode || null))
		patch.purposeCode = next.purposeCode;
	if (next.desc !== current.desc) patch.description = next.desc;
	if (next.bank !== current.bank && bankType) {
		const value = next.bank.split("·").pop()?.trim() || next.bank;
		patch.bankId = { type: bankType.type, value };
	}
	return patch;
}

export function agentMessage(reply: AgentReply): AgentMessage {
	return {
		role: "agent",
		tools: reply.tools,
		paras: reply.text.split(/\n{2,}/).filter(Boolean),
		bullets: [],
		cites: reply.cites,
		note: reply.removedCites.length
			? "Dropped citations that are not in the rules pack: " +
				reply.removedCites.join(", ")
			: "",
		cta: null,
	};
}

export const api = {
	getPayout,
	planAll,
	approvePayout,
	payPayout,
	reconcilePayout,
	editInvoice,
	updateSettings,
	resetDemo,
	askAgentApi,
	replayPlan,
	reviewSanctions,
	reviewSecurityHold,
	uploadInvoice,
	verify: (tamper?: number) => verifyQuery(tamper).queryFn(),
	iso,
};

export function bankTypeOf(detailId: string, details: PayoutDetail[]) {
	return details.find((d) => d.id === detailId)?.invoice.bankId ?? undefined;
}
