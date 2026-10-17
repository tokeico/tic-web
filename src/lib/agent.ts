// The Corredor agent, as designed: it reads payouts and the engine's results,
// explains with sources, and prepares actions. It has no tool that approves,
// pays, clears a hold or changes a rule: every consequential step lands in the
// queue for a person.
//
// The replies are scripted (the design's "preview: scripted agent over the demo
// data") but run over live API data, so they stay true when the data changes.
// In the full build the local model writes them with the same read-only tools.

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	ApiRequestError,
	agentStatusQuery,
	askAgentApi,
	payoutsQuery,
	previewPlan,
	settingsQuery,
} from "./api";
import type { AgentReply, AgentTurn, PayoutDetail, Plan } from "./contracts";
import {
	type AgentAction,
	type AgentMessage,
	getDemo,
	later,
	setDemo,
	showToast,
} from "./demo-store";
import { formatDate, formatLocal, formatUsd, formatUsd0 } from "./format";
import { CUTOFF, radarImpact, radarState } from "./radar";
import { useActions } from "./use-actions";
import {
	approvalsNeeded,
	recommendedEval,
	routeName,
	STATUS,
	warnCount,
	wireEval,
} from "./view";

type Proposal = Omit<AgentAction, "id" | "status">;
interface Reply {
	msg: AgentMessage;
	actions?: Proposal[];
	/** Low-risk step the agent may take itself when autonomy = auto. */
	auto?: () => void;
}

const uniq = <T>(a: T[]) => a.filter((x, i) => a.indexOf(x) === i);
const FROZEN = ["approved", "paid", "booked", "rejected"];
const isOpen = (p: PayoutDetail) =>
	p.approvals.length === 0 && !FROZEN.includes(p.status);
const num = (p: PayoutDetail) => p.invoice.invoiceNumber;
const last4 = (s: string) => s.replace(/\D/g, "").slice(-4);

interface Ctx {
	details: PayoutDetail[];
	asOf: string;
	threshold: number;
	autonomy: "suggest" | "prepare" | "auto";
	requireAck: boolean;
	radar: "pending" | "approved" | "rejected";
	pendingActions: number;
	setAsOf: (asOf: string) => void;
}

function countryOf(t: string): string | null {
	if (/brazil|brasil|paulista|estúdio|estudio/.test(t)) return "BR";
	if (/mexico|méxico|autopartes|norte/.test(t)) return "MX";
	if (/argentina|luc[ií]a|fern[aá]ndez/.test(t)) return "AR";
	if (/venezuela|orinoco/.test(t)) return "VE";
	return null;
}

export async function respond(text: string, c: Ctx): Promise<Reply> {
	const t = text.toLowerCase();
	const msg: AgentMessage = {
		role: "agent",
		tools: [],
		paras: [],
		bullets: [],
		cites: [],
		note: "",
		cta: null,
	};
	const loaded =
		c.details.length > 0 && c.details.every((p) => p.status !== "draft");
	if (!loaded) {
		msg.paras!.push(
			"There are no invoices in the inbox yet. Load the demo invoices from the Inbox or the Overview, then ask me again.",
		);
		msg.cta = { label: "Go to inbox", kind: "inbox" };
		return { msg };
	}
	const prepare = c.autonomy !== "suggest";
	const suggestNote =
		"Autonomy is set to Suggest only, so I haven’t queued anything. Switch to “Prepare for approval” in Customize to get action cards.";
	const country = countryOf(t);
	const pick = (cc: string) => c.details.find((p) => p.country === cc);
	const dl = formatDate(c.asOf);
	const label = (p: PayoutDetail) => STATUS[p.status].label;

	// ---- What changes on Oct 31? (a dry run: the API previews each open payout) ----
	if (
		/oct(ober)?\.?\s*3[01]|deadline|cutoff|what if|what-if|simulate|dry.?run|upcoming|what changes/.test(
			t,
		)
	) {
		msg.tools = [`plan_all(asOf="${CUTOFF}", dry_run=true)`];
		if (c.asOf >= CUTOFF) {
			msg.paras!.push(
				`The as-of date is already ${dl}, past the Oct 31 cutoff. Nothing else is scheduled in rules pack v1 before Nov 6.`,
			);
			return { msg };
		}
		let pendingProvider: { p: PayoutDetail; name: string } | undefined;
		for (const p of c.details.filter(isOpen)) {
			const b: Plan = await previewPlan(p.id, CUTOFF);
			const ai = p.plan?.recommended?.id ?? null;
			const bi = b.recommended?.id ?? null;
			if (ai !== bi) {
				const hit = ai
					? b.evaluations
							.find((e) => e.route.id === ai)
							?.results.find((r) => r.outcome === "block")
					: undefined;
				msg.bullets!.push(
					`${p.payeeName} ${num(p)}: ${routeName(p.plan?.recommended)} → ${routeName(b.recommended)}${hit ? ` (${hit.ruleId} takes effect)` : ""}`,
				);
				if (hit) msg.cites!.push(hit.ruleId);
			}
			const off = p.plan?.recommended?.offramp;
			if (
				!pendingProvider &&
				off &&
				(off.type === "vasp_unfiled" || off.type === "vasp_pending")
			)
				pendingProvider = { p, name: off.name };
		}
		msg.paras!.push("Dry run as of Oct 31, 2026. Nothing has changed yet.");
		const changes = msg.bullets!.length;
		if (!changes) msg.bullets!.push("No open payout changes route on Oct 31.");
		if (pendingProvider) {
			msg.paras!.push(
				`To keep the cheaper ${pendingProvider.name} route for ${pendingProvider.p.payeeName}, it has to be approved and paid before Oct 31, unless ${pendingProvider.name}’s registry status changes first (see the Regulatory radar).`,
			);
		}
		if (!changes) return { msg };
		if (c.autonomy === "auto") {
			msg.note =
				"This is low-risk, so I moved the demo clock to Oct 31 automatically. Use the date bar to go back.";
			return { msg, auto: () => c.setAsOf(CUTOFF) };
		}
		if (prepare) {
			msg.note = "I queued that as an action in case you want to apply it.";
			return {
				msg,
				actions: [
					{
						kind: "asof",
						payoutId: null,
						risk: "Low",
						title: "Move the demo clock to Oct 31",
						why: "Applies the dry run so you can see the reroute in the inbox.",
						cites: uniq(msg.cites!),
						asOf: CUTOFF,
					},
				],
			};
		}
		msg.note = suggestNote;
		return { msg };
	}

	// ---- Fraud / security hold ----
	if (
		/fraud|suspicious|security|hold|injection|duplicate|0419|second est/.test(t)
	) {
		msg.tools = [
			"scan_injection()",
			"compare_vendor_master()",
			"find_duplicates()",
		];
		msg.paras!.push(
			"No invoice is on security hold. Every invoice so far has been read as data (instructions inside an invoice are never followed), and no payee’s bank details differ from what we have on file.",
		);
		msg.note =
			"I can only flag and explain. Clearing a hold or changing bank details is always a person’s decision.";
		return { msg };
	}

	// ---- Regulatory radar ----
	if (
		/radar|regulat|rule change|new rule|registry|monitor|watch|\blaw/.test(t)
	) {
		msg.tools = [
			"watch_sources(5)",
			"diff_registry()",
			`plan_all(asOf="${CUTOFF}", dry_run=true)`,
		];
		msg.cites = ["BR-VASP-AUTH", "BR-VASP-UNFILED-WARN"];
		msg.cta = { label: "Open Trust and compliance", kind: "trust" };
		if (c.radar === "approved")
			msg.paras!.push(
				"The registry update for Ponte Digital was approved by Daniel Ortiz. Brazil payouts now treat it as an authorized VASP.",
			);
		else if (c.radar === "rejected")
			msg.paras!.push(
				"The Ponte Digital registry update was rejected, so nothing changed.",
			);
		else {
			msg.paras!.push(
				"I found one update. Nothing changes until compliance approves.",
			);
			const impact = await radarImpact(c.details, c.asOf);
			msg.bullets!.push(
				`Simulated registry update: Ponte Digital listed as an authorized VASP. Impact: ${impact.join("; ")}.`,
			);
		}
		msg.note =
			"I don’t change rules or the registry. Compliance approves each change, and the change is logged.";
		return { msg };
	}

	// ---- Savings vs wires ----
	if (/saving|save|impact|roi|how much|cost/.test(t)) {
		msg.tools = [`plan_all(asOf="${c.asOf}")`, "quote_wire()"];
		const rows = c.details.filter(
			(p) =>
				p.plan?.recommended?.kind === "stablecoin" &&
				!["rejected", "blocked", "needs_info"].includes(p.status),
		);
		const wireFee = (p: PayoutDetail) =>
			p.plan ? (wireEval(p.plan)?.route.feePct ?? 4.5) : 4.5;
		const saved = (p: PayoutDetail) =>
			(p.amountUsd * (wireFee(p) - p.plan!.recommended!.feePct)) / 100;
		msg.paras!.push("Against a SWIFT wire at 4.5% and about two days:");
		msg.bullets = rows.map(
			(p) =>
				`${p.payeeName}: ${p.plan!.recommended!.feePct.toFixed(2)}% via ${routeName(p.plan!.recommended)}, saves ${formatUsd(saved(p))} and settles in ${p.plan!.recommended!.minutes} min`,
		);
		msg.bullets.push(
			`Total: ${formatUsd(rows.reduce((s, p) => s + saved(p), 0))} on ${formatUsd0(rows.reduce((s, p) => s + p.amountUsd, 0))} of payouts.`,
		);
		msg.note =
			"Demo FX rates and fictional provider fees. Blocked and rejected payouts are excluded.";
		return { msg };
	}

	// ---- Sanctions / OFAC ----
	if (/sanction|ofac|licen[cs]e|venezuela|orinoco/.test(t)) {
		const ve = pick("VE");
		msg.tools = [
			`screen_ofac("${ve?.payeeName ?? "payee"}")`,
			`plan("ve", asOf="${c.asOf}")`,
		];
		msg.cites = ["VE-OFAC"];
		msg.paras!.push(
			`Name screening is ${ve?.plan?.screening.status === "clear" ? "clear: no SDN entry scores above 0.88" : "not clear"} for ${ve?.payeeName ?? "this payee"}.`,
		);
		if (ve)
			msg.cta = {
				label: `Open ${ve.payeeName}`,
				kind: "open",
				payoutId: ve.id,
			};
		msg.paras!.push(
			"The block comes from the country program, not the name. VE-OFAC blocks every route to Venezuela unless a named OFAC general license is recorded and a person signs off. I can’t clear that myself.",
		);
		msg.note =
			"Recording a general license and sign-off isn’t wired up in this build yet, so the payment stays blocked.";
		return { msg };
	}

	// ---- Vendor email ----
	if (/email|vendor|missing|clabe|purpose code|supplier|draft/.test(t)) {
		const tv =
			(country && pick(country)) ||
			c.details.find((p) => p.status === "needs_info") ||
			c.details.find((p) => p.invoice.lowConfidence.length > 0) ||
			pick("MX") ||
			c.details[0]!;
		const inv = tv.invoice;
		const missingPurpose = inv.payeeCountry === "BR" && !inv.purposeCode;
		const lowBank = inv.lowConfidence.includes("bankId");
		const ask = missingPurpose
			? "the FX purpose code for this payment, which Brazilian rules require"
			: lowBank
				? `the bank account we have for you. We read one ending in ${last4(inv.bankId?.value ?? "")} and want to confirm the full number by phone before paying`
				: "that the bank details on the invoice are still current";
		msg.tools = [
			`get_payout("${tv.id.slice(0, 8)}")`,
			`draft_vendor_email("${tv.id.slice(0, 8)}")`,
		];
		msg.paras!.push(
			`I drafted an email to ${tv.payeeName} about invoice ${inv.invoiceNumber}. It asks for ${missingPurpose ? "the missing purpose code" : lowBank ? "confirmation of the bank account, which I extracted with low confidence" : "a confirmation of bank details"}. Account numbers are masked to the last four digits.`,
		);
		if (missingPurpose) msg.cites = ["BR-521-FX"];
		const body = `Subject: ${inv.invoiceNumber}: one detail before we pay\n\nHello ${tv.payeeName} team,\n\nWe are preparing payment of ${formatLocal(tv.amountLocal, tv.currency)} for invoice ${inv.invoiceNumber}. Before we can release it, please confirm ${ask}.\n\nThank you,\nMaria Lopez\nAccounts Payable`;
		if (prepare) {
			msg.note = "The draft is in the queue, ready to edit.";
			return {
				msg,
				actions: [
					{
						kind: "email",
						payoutId: tv.id,
						risk: "Medium",
						title: `Send vendor email to ${tv.payeeName}`,
						why: "Edit the text if you like. Nothing is sent until a person clicks Send.",
						cites: [...(msg.cites ?? [])],
						body,
					},
				],
			};
		}
		msg.bullets = [body];
		msg.note = suggestNote;
		return { msg };
	}

	// ---- Reconcile / book ----
	if (/reconcil|book|ledger|journal/.test(t)) {
		const paid = c.details.filter((p) => p.status === "paid");
		msg.tools = ['list_payments(status="paid")'];
		if (!paid.length) {
			msg.paras!.push(
				"Nothing is waiting to be reconciled. A payout shows up here after it has been paid.",
			);
			return { msg };
		}
		msg.paras!.push(
			`${paid.length} paid payout${paid.length > 1 ? "s" : ""} can be matched to on-chain and local-rail references and booked:`,
		);
		msg.bullets = paid.map(
			(p) =>
				`${p.payeeName}: ${(p.payment?.txHash ?? "").slice(0, 12)}… ↔ ${(p.payment?.railRef ?? "").slice(0, 10)}…`,
		);
		if (prepare) {
			msg.note = "Queued for your confirmation.";
			return {
				msg,
				actions: paid.map((p) => ({
					kind: "reconcile" as const,
					payoutId: p.id,
					risk: "Medium" as const,
					title: `Reconcile and book ${p.payeeName}`,
					why: "Creates the journal entry: AP, fees, cash and the FX line.",
					cites: [],
				})),
			};
		}
		msg.note = suggestNote;
		return { msg };
	}

	// ---- Approvals ----
	if (/approv|sign off|sign-off/.test(t)) {
		msg.tools = [
			'list_payouts(status=["ready","awaiting_second_approver"])',
			"check_policy()",
		];
		let cands = c.details.filter(
			(p) => p.status === "ready" || p.status === "awaiting_second_approver",
		);
		if (country) cands = cands.filter((p) => p.country === country);
		if (!cands.length) {
			msg.paras!.push(
				`Nothing is waiting for approval${country ? " on that payout" : ""}.`,
			);
			return { msg };
		}
		msg.paras!.push("These are ready for a human decision:");
		msg.bullets = cands.map((p) => {
			const n = approvalsNeeded(p.amountUsd, c.threshold);
			const w = warnCount(recommendedEval(p.plan));
			return `${p.payeeName}: ${formatUsd(p.amountUsd)} via ${routeName(p.plan?.recommended)} · ${p.approvals.length} of ${n} approvals${w ? ` · ${w} warning to review` : ""}`;
		});
		for (const p of cands)
			for (const r of recommendedEval(p.plan)?.results ?? [])
				if (r.outcome === "warn") msg.cites!.push(r.ruleId);
		if (prepare) {
			msg.note = `I can’t approve. The cards in the queue let you approve as yourself${c.requireAck ? ", after acknowledging any warnings." : "."}`;
			return {
				msg,
				actions: cands.map((p) => ({
					kind: "approve" as const,
					payoutId: p.id,
					risk: "High" as const,
					title: `Approve ${p.payeeName}`,
					why: `${formatUsd(p.amountUsd)} via ${routeName(p.plan?.recommended)}. ${approvalsNeeded(p.amountUsd, c.threshold) === 2 ? `Over the ${formatUsd0(c.threshold)} threshold, so two different people must approve.` : "One approval needed."}`,
					cites: [],
				})),
			};
		}
		msg.note = suggestNote;
		return { msg };
	}

	// ---- Pay ----
	if (/\bpay\b|payment|send money|execute|release/.test(t)) {
		msg.tools = ['list_payouts(status="approved")', "check_policy()"];
		const ap = c.details.filter((p) => p.status === "approved" && !p.payment);
		if (!ap.length) {
			msg.paras!.push(
				"Nothing is approved and unpaid, so there is nothing I can prepare for payment. Payments only follow a human approval.",
			);
			msg.bullets = c.details
				.filter((p) =>
					[
						"ready",
						"awaiting_second_approver",
						"blocked",
						"needs_info",
					].includes(p.status),
				)
				.map((p) => `${p.payeeName} ${num(p)}: ${label(p)}`);
			return { msg };
		}
		msg.paras!.push(
			"These are approved and can be sent on the simulated rail:",
		);
		msg.bullets = ap.map(
			(p) =>
				`${p.payeeName}: ${formatUsd(p.amountUsd)} via ${routeName(p.plan?.recommended)}`,
		);
		if (prepare) {
			msg.note =
				"Each payment needs your explicit confirmation in the queue. I have no payment tool.";
			return {
				msg,
				actions: ap.map((p) => ({
					kind: "pay" as const,
					payoutId: p.id,
					risk: "High" as const,
					title: `Pay ${p.payeeName} ${formatUsd(p.amountUsd)}`,
					why: `Sends on the simulated rail via ${routeName(p.plan?.recommended)}.`,
					cites: [],
				})),
			};
		}
		msg.note = suggestNote;
		return { msg };
	}

	// ---- Explain a payout's route ----
	if (country || /why|explain|route|reroute|cheap|fee/.test(t)) {
		const p = (country && pick(country)) || pick("BR") || c.details[0]!;
		msg.tools = [
			`get_payout("${p.id.slice(0, 8)}")`,
			`plan("${p.id.slice(0, 8)}", asOf="${p.plan?.asOf ?? c.asOf}")`,
		];
		msg.paras!.push(
			p.memo?.routeRationale ?? "There is no plan for this payout yet.",
		);
		for (const w of p.memo?.warnings ?? []) msg.bullets!.push(`Warning · ${w}`);
		if (isOpen(p) && p.plan) {
			for (const d of ["2026-10-01", CUTOFF]) {
				if (d <= p.plan.asOf) continue;
				const b = await previewPlan(p.id, d);
				const ai = p.plan.recommended?.id ?? null;
				if (ai !== (b.recommended?.id ?? null)) {
					const hit = ai
						? b.evaluations
								.find((e) => e.route.id === ai)
								?.results.find((r) => r.outcome === "block")
						: undefined;
					msg.bullets!.push(
						`On ${formatDate(d)} this would reroute to ${routeName(b.recommended)}${hit ? `, because ${hit.ruleId} takes effect` : ""}.`,
					);
				}
			}
		}
		msg.cites = [...(p.memo?.citedRuleIds ?? [])];
		msg.note = `The rules engine made this decision (fingerprint ${p.fingerprint ?? "—"}). I only explain it.`;
		msg.cta = { label: `Open ${p.payeeName}`, kind: "open", payoutId: p.id };
		return { msg };
	}

	// ---- Attention / summary ----
	if (
		/attention|today|summary|status|overview|inbox|what.*(need|do)|priorit|next/.test(
			t,
		)
	) {
		msg.tools = ["list_payouts()", `plan_all(asOf="${c.asOf}")`];
		const cnt: Record<string, number> = {};
		for (const p of c.details) cnt[label(p)] = (cnt[label(p)] ?? 0) + 1;
		msg.paras!.push(
			`As of ${dl}: ${Object.entries(cnt)
				.map(([k, v]) => `${v} ${k.toLowerCase()}`)
				.join(", ")}.`,
		);
		msg.bullets = c.details.map((p) => {
			const w = warnCount(recommendedEval(p.plan));
			return `${p.payeeName} ${num(p)}: ${label(p)}${p.plan?.recommended ? ` · ${routeName(p.plan.recommended)}` : ""}${w ? ` · ${w} warning` : ""}`;
		});
		for (const p of c.details) {
			const target =
				recommendedEval(p.plan) ?? (p.plan ? wireEval(p.plan) : undefined);
			for (const r of target?.results ?? [])
				if (
					r.outcome === "warn" ||
					(r.outcome === "block" && !p.plan?.recommended)
				)
					msg.cites!.push(r.ruleId);
		}
		const aw = c.details.find((p) => p.status === "awaiting_second_approver");
		const rd = c.details.find((p) => p.status === "ready");
		const apv = c.details.find((p) => p.status === "approved");
		const pd = c.details.find((p) => p.status === "paid");
		msg.note = aw
			? `Suggested next step: ${aw.payeeName} needs a second approver.`
			: rd
				? `Suggested next step: review and approve ${rd.payeeName}.`
				: apv
					? `Suggested next step: pay ${apv.payeeName}.`
					: pd
						? `Suggested next step: reconcile ${pd.payeeName}.`
						: "Nothing urgent.";
		if (c.pendingActions)
			msg.note += ` ${c.pendingActions} action${c.pendingActions > 1 ? "s are" : " is"} already waiting in your queue.`;
		if (c.radar === "pending")
			msg.note += " There is also a registry update waiting for compliance.";
		msg.cites = uniq(msg.cites!);
		return { msg };
	}

	msg.paras!.push(
		"I can help with questions like these. Pick one below or ask in your own words:",
	);
	msg.bullets = SUGGESTIONS.slice(0, 7);
	msg.note =
		"I explain and prepare. The rules engine decides compliance, and you approve.";
	return { msg };
}

export const SUGGESTIONS = [
	"What needs my attention today?",
	"Why is Estúdio Paulista on this route?",
	"What changes on Oct 31?",
	"Any regulatory changes?",
	"How much are we saving vs. wires?",
	"Prepare approvals for everything ready",
	"Can we pay Transportes Orinoco?",
	"Draft the vendor email for Autopartes",
	"Pay what’s approved",
];

// ---- Local model: turn the transcript into turns, and a reply into a message ----------------

/** The chat so far, as plain turns for the model (the welcome message is the UI's, not the model's). */
function toTurns(chat: AgentMessage[]): AgentTurn[] {
	return chat
		.slice(1)
		.map(
			(m): AgentTurn => ({
				role: m.role === "user" ? "user" : "assistant",
				content:
					m.role === "user"
						? (m.text ?? "")
						: [
								...(m.paras ?? []),
								...(m.bullets ?? []).map((b) => `- ${b}`),
							].join("\n"),
			}),
		)
		.filter((t) => t.content.trim())
		.slice(-20);
}

/** Model text → the design's message shape: paragraphs, then bullet lines. */
function fromReply(r: AgentReply, autonomy: Ctx["autonomy"]): Reply {
	const paras: string[] = [];
	const bullets: string[] = [];
	for (const raw of r.text.split("\n")) {
		const line = raw.trim();
		if (!line) continue;
		const b = line.match(/^(?:[-*•]|\d+\.)\s+(.*)$/);
		if (b) bullets.push(b[1]!.replaceAll("**", ""));
		else paras.push(line.replaceAll("**", ""));
	}
	const notes: string[] = [];
	if (r.removedCites.length)
		notes.push(
			`Citation guard: ${r.removedCites.join(", ")} isn’t in the rules pack.`,
		);
	let actions: Proposal[] = r.actions;
	let auto: (() => void) | undefined;
	if (r.actions.length && autonomy === "suggest") {
		notes.push("Autonomy is Suggest only, so nothing was queued.");
		actions = [];
	}
	return {
		msg: {
			role: "agent",
			tools: r.tools,
			paras,
			bullets,
			cites: r.cites,
			note: notes.join(" "),
			cta: null,
		},
		actions,
		auto,
	};
}

// ---- The hook the pages use ---------------------------------------------------------------

export function useAgent() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const actions = useActions();

	return useMemo(() => {
		const data = <T>(q: { queryKey: readonly unknown[] }) =>
			queryClient.getQueryData(q.queryKey) as T | undefined;
		const ctx = (): Ctx => {
			const settings = data<{
				policy: { secondApproverAboveUsd: number };
				registry: Record<string, string>;
			}>(settingsQuery);
			const demo = getDemo();
			return {
				details: data<PayoutDetail[]>(payoutsQuery) ?? [],
				asOf: actions.asOf,
				threshold: settings?.policy.secondApproverAboveUsd ?? 50_000,
				autonomy: demo.autonomy,
				requireAck: demo.requireAck,
				radar: radarState(settings as never, demo.radarRejected),
				pendingActions: demo.actions.filter((a) => a.status === "pending")
					.length,
				setAsOf: actions.setAsOf,
			};
		};

		const addActions = (list: Proposal[]) => {
			const s = getDemo();
			let seq = s.actionSeq;
			const next = s.actions.slice();
			for (const a of list) {
				if (
					next.some(
						(x) =>
							x.status === "pending" &&
							x.kind === a.kind &&
							x.payoutId === a.payoutId,
					)
				)
					continue;
				seq++;
				next.push({ ...a, id: `A${seq}`, status: "pending" });
			}
			setDemo({ actions: next, actionSeq: seq });
		};

		return {
			/** Ask the agent. It "works" for about a second, like the design. */
			async ask(text: string, opts: { view?: "agent" } = {}) {
				if (getDemo().busy) {
					if (opts.view) actions.go("/agent");
					return;
				}
				const started = Date.now();
				setDemo((s) => ({
					chat: [...s.chat, { role: "user", text }],
					input: "",
					busy: { tools: [] },
				}));
				if (opts.view) actions.go("/agent");
				let reply: Reply;
				try {
					const status = await queryClient
						.fetchQuery(agentStatusQuery)
						.catch(() => null);
					if (status?.available) {
						try {
							const c = ctx();
							const r = await askAgentApi([...toTurns(getDemo().chat)], c.asOf);
							reply = fromReply(r, c.autonomy);
							// Auto-run low-risk: moving the demo clock is the only step the agent may take itself.
							if (c.autonomy === "auto") {
								const clock = reply.actions?.find(
									(a) => a.kind === "asof" && a.asOf,
								);
								if (clock?.asOf) {
									reply.actions = reply.actions!.filter((a) => a !== clock);
									const target = clock.asOf;
									reply.auto = () => c.setAsOf(target);
									reply.msg.note =
										`${reply.msg.note ?? ""} I moved the demo clock to ${formatDate(target)} (low risk, autonomy is Auto-run).`.trim();
								}
							}
						} catch (e) {
							if (
								!(
									e instanceof ApiRequestError &&
									(e.status === 503 || e.status === 0)
								)
							)
								throw e;
							reply = await respond(text, ctx());
							// The model is unavailable: answer from the scripted responder, silently.
						}
					} else {
						reply = await respond(text, ctx());
					}
				} catch (e) {
					reply = {
						msg: {
							role: "agent",
							paras: [
								`I couldn’t read the data just now: ${e instanceof Error ? e.message : "unknown error"}.`,
							],
						},
					};
				}
				setDemo({ busy: { tools: reply.msg.tools ?? [] } });
				await new Promise((r) =>
					later(() => r(null), Math.max(0, 1000 - (Date.now() - started))),
				);
				setDemo((s) => ({
					chat: [...s.chat, reply.msg],
					busy: null,
					autoRuns: s.autoRuns + (reply.auto ? 1 : 0),
				}));
				if (reply.actions?.length) addActions(reply.actions);
				reply.auto?.();
			},

			setInput: (input: string) => setDemo({ input }),

			dismiss(id: string) {
				setDemo((s) => ({
					actions: s.actions.map((a) =>
						a.id === id
							? { ...a, status: "dismissed" as const, result: "Dismissed" }
							: a,
					),
				}));
			},

			/** A person confirms a queued action. The agent never does this itself. */
			async exec(id: string, who: string) {
				const a = getDemo().actions.find((x) => x.id === id);
				if (!a || a.status !== "pending") return;
				const done = (result: string) =>
					setDemo((s) => ({
						actions: s.actions.map((x) =>
							x.id === id ? { ...x, status: "done" as const, result } : x,
						),
					}));
				const d = (
					queryClient.getQueryData(payoutsQuery.queryKey) as
						| PayoutDetail[]
						| undefined
				)?.find((p) => p.id === a.payoutId);
				if (a.kind === "asof" && a.asOf) {
					actions.setAsOf(a.asOf);
					done("Applied");
				} else if (a.kind === "email") {
					showToast([
						{
							head: "Vendor email:",
							body: `marked as sent by ${who} (simulated). Nothing leaves this demo.`,
						},
					]);
					done(`Sent · ${who}`);
				} else if (d && a.kind === "approve") {
					const out = await actions.approve(d, who);
					if (out && out.status === "approved") done(`Approved · ${who}`);
				} else if (d && a.kind === "pay") {
					if (await actions.pay(d)) done("Sent (simulated)");
				} else if (d && a.kind === "reconcile") {
					if (await actions.reconcile(d)) done("Booked");
				}
			},

			goPayout: (id: string) => actions.openPayout(id),
			navigate,
		};
	}, [queryClient, navigate, actions]);
}
