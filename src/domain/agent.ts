import { payoutById, visiblePayouts } from "./data";
import {
	type EngineState,
	eff,
	fingerprint,
	need,
	pill,
	plan,
	rname,
	views,
} from "./engine";
import { fmtDate, iso, last4, local, uniq, usd, usd0 } from "./format";
import { memoFor } from "./memo";
import type { AgentAction, AgentMessage, AppState, Payout } from "./types";

/**
 * The agent. In the shipped build this is Claude with read-only tools plus a
 * single `propose_action` tool that writes to the queue; here it is a scripted
 * responder over the same demo data, so the preview behaves the same way.
 *
 * The important property is structural, not scripted: nothing in this file can
 * approve, pay, clear a hold or change a rule. It can only answer and propose.
 */

export type AgentActionDraft = Omit<AgentAction, "id" | "status">;

export interface AgentReply {
	msg: AgentMessage;
	actions?: AgentActionDraft[];
	/** A low-risk step the agent may apply itself on "auto" autonomy. */
	auto?: { kind: "setDay"; day: number };
}

const blank = (): AgentMessage => ({
	role: "agent",
	tools: [],
	paras: [],
	bullets: [],
	cites: [],
	note: "",
	cta: null,
});

export const welcomeMessage = (): AgentMessage => ({
	...blank(),
	paras: [
		"I’m the Corredor agent. I read invoices and the rules engine’s results, explain every decision with its sources, and prepare actions for you.",
		"I have no tool that approves, pays, clears a security hold or changes a rule. Those always come back to a person, through the queue on the right.",
	],
});

/** The three findings that freeze the simulated fraud attempt. */
export function secFindings(p: Payout): string[] {
	const sc = p.security!;
	return [
		"The PDF contains text addressed to an AI (“" +
			sc.quote +
			"”). It was treated as data and not followed.",
		"The Pix key on this invoice (" +
			sc.onInvoice +
			") is not the one in the vendor master (" +
			sc.onFile +
			").",
		"It looks like a resubmission of " +
			sc.dupOf +
			": same payee, amount within 0.4%, five days apart.",
	];
}

/** Dry run of the proposed registry change against every open payout. */
export function radarImpact(s: AppState): string[] {
	const s2: EngineState = { ...s, registry: { ...s.registry, ponte: true } };
	const asOf = iso(s.day);
	const out: string[] = [];
	visiblePayouts(s.sus)
		.filter((p) => p.c === "BR")
		.forEach((p) => {
			const m = s.mut[p.id] || { approvals: [] };
			if (m.final || m.lockedIso) return;
			const num = eff(p, m).inv.number;
			const a = plan(p, "2026-10-31", s);
			const b = plan(p, "2026-10-31", s2);
			if (rname(a.rec) !== rname(b.rec)) {
				out.push(
					p.payee +
						" " +
						num +
						", from Oct 31: " +
						rname(a.rec) +
						" → " +
						rname(b.rec) +
						(a.rec && b.rec
							? " · saves " +
								usd((p.usd * (a.rec.route.fee - b.rec.route.fee)) / 100)
							: ""),
				);
			}
			const c = plan(p, asOf, s);
			const d = plan(p, asOf, s2);
			if (c.rec && d.rec && c.rec.warns > d.rec.warns) {
				out.push(
					p.payee +
						" " +
						num +
						", as of " +
						fmtDate(asOf) +
						": the BR-VASP-UNFILED-WARN warning goes away",
				);
			}
		});
	if (!out.length) {
		out.push(
			s.loaded
				? "No open payout changes route."
				: "Load the demo invoices to see the impact on open payouts.",
		);
	}
	return out;
}

const SUGGEST_NOTE =
	"Autonomy is set to Suggest only, so I haven’t queued anything. Switch to “Prepare for approval” in Customize to get action cards.";

export const SUGGESTIONS = [
	"What needs my attention today?",
	"Why is Estúdio Paulista on this route?",
	"What changes on Oct 31?",
	"Any regulatory changes?",
	"How much are we saving vs. wires?",
	"Prepare approvals for everything ready",
	"Why is the second Estúdio invoice on hold?",
	"Can we pay Transportes Orinoco?",
	"Draft the vendor email for Autopartes",
	"Pay what’s approved",
];

export function respond(text: string, s: AppState): AgentReply {
	const t = text.toLowerCase();
	const asOf = iso(s.day);
	const dl = fmtDate(asOf);
	const msg = blank();

	if (!s.loaded) {
		msg.paras.push(
			"There are no invoices in the inbox yet. Load the demo invoices from the Inbox or the Overview, then ask me again.",
		);
		msg.cta = { label: "Go to inbox", kind: "inbox" };
		return { msg };
	}

	const pid = /brazil|brasil|paulista|estúdio|estudio/.test(t)
		? "br"
		: /mexico|méxico|autopartes|norte/.test(t)
			? "mx"
			: /argentina|luc[ií]a|fern[aá]ndez/.test(t)
				? "ar"
				: /venezuela|orinoco/.test(t)
					? "ve"
					: null;

	const vs = views(s);
	const vOf = (id: string) => vs.find((v) => v.p.id === id)!;
	const prepare = s.settings.autonomy !== "suggest";

	// ---- what changes on a future date -------------------------------------
	if (
		/oct(ober)?\.?\s*31|deadline|what if|what-if|simulate|dry.?run|upcoming|what changes/.test(
			t,
		)
	) {
		const target = "2026-10-31";
		msg.tools = [`plan_all(asOf="${target}", dry_run=true)`];
		if (asOf >= target) {
			msg.paras.push(
				"The as-of date is already " +
					dl +
					", on or after the Oct 31 non-filer cutoff. Use the date bar to rewind and compare routes.",
			);
			return { msg };
		}
		vs.forEach((v) => {
			if (v.m.final || v.m.lockedIso) return;
			const b = plan(v.p, target, s);
			const ai = v.plan.rec ? v.plan.rec.route.id : null;
			const bi = b.rec ? b.rec.route.id : null;
			if (ai !== bi) {
				const ev = b.evals.find((e) => e.route.id === ai);
				const hit = ev?.results.find((x) => x.o === "block");
				msg.bullets.push(
					v.p.payee +
						" " +
						eff(v.p, v.m).inv.number +
						": " +
						rname(v.plan.rec) +
						" → " +
						rname(b.rec) +
						(hit ? ` (${hit.rule.id} takes effect)` : ""),
				);
				if (hit) msg.cites.push(hit.rule.id);
			}
		});
		msg.paras.push(
			"Dry run as of Oct 31, 2026. The demo clock has not changed. Oct 30 is still a valid filing day; Corredor blocks providers that didn’t file from Oct 31.",
		);
		if (!msg.bullets.length)
			msg.bullets.push("No open payout changes route on Oct 31.");
		const pending = vs.find(
			(v) =>
				!v.m.final &&
				!v.p.security &&
				v.plan.rec &&
				v.plan.rec.route.off &&
				v.plan.rec.route.off.type === "vasp_unfiled",
		);
		if (pending) {
			msg.paras.push(
				"To keep the cheaper Ponte Digital route for " +
					pending.p.payee +
					", compliance must verify a timely filing or authorization. Approval alone cannot make an ineligible provider compliant.",
			);
		}
		if (s.settings.autonomy === "auto") {
			msg.note =
				"This is low-risk, so I moved the demo clock to Oct 31 automatically. Use the date bar to go back.";
			return { msg, auto: { kind: "setDay", day: 36 } };
		}
		if (prepare) {
			msg.note = "I queued that as an action in case you want to apply it.";
			return {
				msg,
				actions: [
					{
						kind: "asof",
						pid: null,
						risk: "Low",
						title: "Move the demo clock to Oct 31",
						why: "Applies the dry run so you can see the reroute in the inbox.",
						cites: msg.cites.slice(),
					},
				],
			};
		}
		msg.note = SUGGEST_NOTE;
		return { msg };
	}

	// ---- fraud / security hold ---------------------------------------------
	if (
		/fraud|suspicious|security|hold|injection|duplicate|0419|second est/.test(t)
	) {
		msg.tools = [
			"scan_injection()",
			"compare_vendor_master()",
			"find_duplicates()",
		];
		// Live holds first: invoices the API's scanner flagged on upload.
		const live = vs.find((v) => v.p.security?.findings);
		const v = live ?? (s.sus ? vOf("br2") : undefined);
		if (!v) {
			msg.paras.push(
				"No invoice is on security hold. Every invoice so far passed the injection scan, matches the vendor master and has no duplicate.",
			);
			msg.note =
				"To see the defense, upload an invoice with instructions hidden inside it, or use “Simulate a suspicious invoice” in the Inbox.";
			return { msg };
		}
		const num = v.p.inv.number;
		msg.cta = { label: "Open the held invoice", kind: "open", pid: v.p.id };
		if (v.m.final === "rejected") {
			msg.paras.push(
				num +
					" was rejected as suspected fraud" +
					(v.m.rejectedBy ? ` by ${v.m.rejectedBy}` : "") +
					". Nothing was paid.",
			);
			return { msg };
		}
		if (live && live.p.security?.status === "confirmed_suspicious") {
			msg.paras.push(
				num +
					" is kept on security hold: a person reviewed the flagged lines and decided it is suspicious. Nothing will be paid.",
			);
			return { msg };
		}
		if (v.m.secCleared) {
			msg.paras.push(
				"The hold on " +
					num +
					" was cleared by " +
					v.m.secCleared.by +
					" after a callback (“" +
					v.m.secCleared.note +
					"”). It now goes through normal approval.",
			);
			return { msg };
		}
		msg.paras.push(
			num +
				" from " +
				v.p.payee +
				" is frozen" +
				(live
					? ": the invoice text contains instruction-like lines"
					: " for three reasons") +
				":",
		);
		msg.bullets = live
			? (live.p.security!.findings ?? []).map(
					(f) => `Flagged as ${f.pattern}: “${f.quote}”`,
				)
			: secFindings(v.p);
		msg.note =
			"I can’t clear a hold or change bank details. A person either rejects the invoice or records a callback to the number on file.";
		if (prepare) {
			return {
				msg,
				actions: [
					{
						kind: "fraud",
						pid: v.p.id,
						risk: "High",
						title: `Reject ${num} as suspected fraud`,
						why: "Rejects the invoice and logs the reason. Nothing is paid.",
						cites: [],
					},
				],
			};
		}
		return { msg };
	}

	// ---- regulatory radar ---------------------------------------------------
	if (
		/radar|regulat|rule change|new rule|registry|monitor|watch|\blaw/.test(t)
	) {
		msg.tools = [
			"watch_sources(5)",
			"diff_registry()",
			'plan_all(asOf="2026-10-31", dry_run=true)',
		];
		msg.cites = ["BR-VASP-AUTH", "BR-VASP-UNFILED-WARN"];
		msg.cta = { label: "Open Trust and compliance", kind: "trust" };
		if (s.radar === "approved") {
			msg.paras.push(
				"The registry update for Ponte Digital was approved by Daniel Ortiz. Brazil payouts now treat it as an authorized VASP.",
			);
		} else if (s.radar === "rejected") {
			msg.paras.push(
				"The Ponte Digital registry update was rejected, so nothing changed.",
			);
		} else {
			msg.paras.push(
				"I found one update and two open review items. Nothing changes until compliance approves.",
			);
			msg.bullets = [
				"Simulated registry update: Ponte Digital listed as an authorized VASP. Impact: " +
					radarImpact(s).join("; ") +
					".",
			];
		}
		const openV = ["MX-BANK-CRYPTO", "AR-PSAV"].filter((id) => !s.verified[id]);
		if (openV.length) {
			msg.bullets.push(
				openV.join(" and ") +
					(openV.length > 1 ? " have" : " has") +
					" an effective date marked “verify”. I linked the sources; a person needs to confirm them.",
			);
		}
		msg.note =
			"I don’t change rules or the registry. Compliance approves each change, and the change is logged.";
		return { msg };
	}

	// ---- savings ------------------------------------------------------------
	if (/saving|save|impact|roi|how much|cost/.test(t)) {
		msg.tools = [`plan_all(asOf="${asOf}")`, "quote_wire()"];
		const rows = vs.filter(
			(v) =>
				v.plan.rec &&
				v.plan.rec.route.kind === "stablecoin" &&
				!["rejected", "security_hold", "blocked", "needs_info"].includes(
					v.status,
				),
		);
		const total = rows.reduce(
			(t2, v) => t2 + (v.p.usd * (4.5 - v.plan.rec!.route.fee)) / 100,
			0,
		);
		msg.paras.push("Against a SWIFT wire at 4.5% and about two days:");
		msg.bullets = rows.map(
			(v) =>
				v.p.payee +
				": " +
				v.plan.rec!.route.fee.toFixed(2) +
				"% via " +
				rname(v.plan.rec) +
				", saves " +
				usd((v.p.usd * (4.5 - v.plan.rec!.route.fee)) / 100) +
				" and settles in " +
				v.plan.rec!.route.min +
				" min",
		);
		msg.bullets.push(
			"Total: " +
				usd(total) +
				" on " +
				usd0(rows.reduce((t2, v) => t2 + v.p.usd, 0)) +
				" of payouts.",
		);
		msg.note =
			"Demo FX rates and fictional provider fees. Blocked, held and rejected payouts are excluded.";
		return { msg };
	}

	// ---- sanctions / license ------------------------------------------------
	if (/sanction|ofac|licen[cs]e|venezuela|orinoco/.test(t)) {
		const v = vOf("ve");
		msg.tools = [`screen_ofac("${v.p.payee}")`, `plan("ve", asOf="${asOf}")`];
		msg.cites = ["VE-OFAC"];
		msg.paras.push(
			"Name screening is clear: no SDN entry scores above 0.88 for " +
				v.p.payee +
				".",
		);
		msg.cta = { label: `Open ${v.p.payee}`, kind: "open", pid: "ve" };
		if (v.m.license) {
			msg.paras.push(
				"General license " +
					v.m.license.number +
					" is recorded and signed off by " +
					v.m.license.by +
					", so VE-OFAC passes and the SWIFT wire is available. It still needs a normal approval.",
			);
			return { msg };
		}
		if (v.status === "ready") {
			msg.paras.push(
				"The VE-OFAC hold was released by compliance: the block became a warning that names the sign-off, and the payout is waiting for a normal approval.",
			);
			return { msg };
		}
		msg.paras.push(
			"The block comes from the country program, not the name. VE-OFAC blocks every route to Venezuela unless a named OFAC general license is recorded and a person signs off. I can’t clear that myself.",
		);
		if (prepare) {
			msg.note =
				"I prepared a sign-off card in the queue. It needs the license number, what you checked, and a compliance approver.";
			return {
				msg,
				actions: [
					{
						kind: "license",
						pid: "ve",
						risk: "High",
						title: `Record an OFAC general license for ${v.p.payee}`,
						why: "Only a named license plus a compliance sign-off lifts VE-OFAC. Enter the number your counsel provided.",
						cites: ["VE-OFAC"],
						license: "",
						note: "",
					},
				],
			};
		}
		msg.note = SUGGEST_NOTE;
		return { msg };
	}

	// ---- vendor email -------------------------------------------------------
	if (/email|vendor|missing|clabe|purpose code|supplier|draft/.test(t)) {
		const tv = pid
			? vOf(pid)
			: vs.find((v) => v.status === "needs_info") || vOf("mx");
		const pe = eff(tv.p, tv.m);
		const missingPurpose = pe.c === "BR" && !pe.inv.purposeCode;
		const lowBank = tv.p.low.includes("bank") && !tv.m.reviewed;
		const ask = missingPurpose
			? "the FX purpose code for this payment, which Brazilian rules require"
			: lowBank
				? "the bank account we have for you. We read one ending in " +
					last4(pe.inv.bank) +
					" and want to confirm the full number by phone before paying"
				: "that the bank details on the invoice are still current";
		msg.tools = [
			`get_payout("${tv.p.id}")`,
			`draft_vendor_email("${tv.p.id}")`,
		];
		msg.paras.push(
			"I drafted an email to " +
				tv.p.payee +
				" about invoice " +
				pe.inv.number +
				". It asks for " +
				(missingPurpose
					? "the missing purpose code"
					: lowBank
						? "confirmation of the bank account, which I extracted with low confidence"
						: "a confirmation of bank details") +
				". Account numbers are masked to the last four digits.",
		);
		if (missingPurpose) msg.cites = ["BR-521-FX"];
		const body =
			"Subject: " +
			pe.inv.number +
			": one detail before we pay\n\nHello " +
			tv.p.payee +
			" team,\n\nWe are preparing payment of " +
			local(tv.p) +
			" for invoice " +
			pe.inv.number +
			". Before we can release it, please confirm " +
			ask +
			".\n\nThank you,\nMaria Lopez\nAccounts Payable";
		if (prepare) {
			msg.note = "The draft is in the queue, ready to edit.";
			return {
				msg,
				actions: [
					{
						kind: "email",
						pid: tv.p.id,
						risk: "Medium",
						title: `Send vendor email to ${tv.p.payee}`,
						why: "Edit the text if you like. Nothing is sent until a person clicks Send.",
						cites: msg.cites.slice(),
						body,
					},
				],
			};
		}
		msg.bullets = [body];
		msg.note = SUGGEST_NOTE;
		return { msg };
	}

	// ---- reconcile ----------------------------------------------------------
	if (/reconcil|book|ledger|journal/.test(t)) {
		const paid = vs.filter((v) => v.status === "paid");
		msg.tools = ['list_payments(status="paid")'];
		if (!paid.length) {
			msg.paras.push(
				"Nothing is waiting to be reconciled. A payout shows up here after it has been paid.",
			);
			return { msg };
		}
		msg.paras.push(
			paid.length +
				" paid payout" +
				(paid.length > 1 ? "s" : "") +
				" can be matched to on-chain and local-rail references and booked:",
		);
		msg.bullets = paid.map(
			(v) =>
				v.p.payee +
				": " +
				v.m.payment!.txHash.slice(0, 12) +
				"… ↔ " +
				v.m.payment!.railName +
				" " +
				v.m.payment!.railRef.slice(0, 10) +
				"…",
		);
		if (prepare) {
			msg.note = "Queued for your confirmation.";
			return {
				msg,
				actions: paid.map((v) => ({
					kind: "reconcile" as const,
					pid: v.p.id,
					risk: "Medium" as const,
					title: `Reconcile and book ${v.p.payee}`,
					why: "Creates the journal entry: AP, fees, cash and the FX line.",
					cites: [],
				})),
			};
		}
		msg.note = SUGGEST_NOTE;
		return { msg };
	}

	// ---- approvals ----------------------------------------------------------
	if (/approv|sign off|sign-off/.test(t)) {
		msg.tools = [
			'list_payouts(status=["ready","awaiting_second_approver"])',
			"check_policy()",
		];
		let c = vs.filter(
			(v) => v.status === "ready" || v.status === "awaiting_second_approver",
		);
		if (pid) c = c.filter((v) => v.p.id === pid);
		if (!c.length) {
			msg.paras.push(
				"Nothing is waiting for approval" +
					(pid ? " on that payout" : "") +
					".",
			);
			return { msg };
		}
		msg.paras.push("These are ready for a human decision:");
		msg.bullets = c.map((v) => {
			const n = need(v.p, s);
			return (
				v.p.payee +
				": " +
				usd(v.p.usd) +
				" via " +
				rname(v.plan.rec) +
				" · " +
				v.m.approvals.length +
				" of " +
				n +
				" approvals" +
				(v.plan.rec?.warns ? ` · ${v.plan.rec.warns} warning to review` : "")
			);
		});
		c.forEach((v) => {
			v.plan.rec?.results.forEach((x) => {
				if (x.o === "warn") msg.cites.push(x.rule.id);
			});
		});
		if (vs.some((v) => v.status === "security_hold")) {
			msg.paras.push(
				"I left out INV-2026-0419: it is on security hold and can’t be approved.",
			);
		}
		if (prepare) {
			msg.note =
				"I can’t approve. The cards in the queue let you approve as yourself" +
				(s.settings.requireAck ? ", after acknowledging any warnings." : ".");
			return {
				msg,
				actions: c.map((v) => ({
					kind: "approve" as const,
					pid: v.p.id,
					risk: "High" as const,
					title: `Approve ${v.p.payee}`,
					why:
						usd(v.p.usd) +
						" via " +
						rname(v.plan.rec) +
						". " +
						(need(v.p, s) === 2
							? "Over the " +
								usd0(s.settings.threshold) +
								" threshold, so two different people must approve."
							: "One approval needed."),
					cites: [],
				})),
			};
		}
		msg.note = SUGGEST_NOTE;
		return { msg };
	}

	// ---- payment ------------------------------------------------------------
	if (/\bpay\b|payment|send money|execute|release/.test(t)) {
		msg.tools = ['list_payouts(status="approved")', "check_policy()"];
		const ap = vs.filter((v) => v.status === "approved" && !v.m.payment);
		if (!ap.length) {
			msg.paras.push(
				"Nothing is approved and unpaid, so there is nothing I can prepare for payment. Payments only follow a human approval.",
			);
			msg.bullets = vs
				.filter((v) =>
					[
						"ready",
						"awaiting_second_approver",
						"blocked",
						"needs_info",
						"security_hold",
					].includes(v.status),
				)
				.map(
					(v) =>
						v.p.payee +
						" " +
						eff(v.p, v.m).inv.number +
						": " +
						pill(v.status).label,
				);
			return { msg };
		}
		msg.paras.push("These are approved and can be sent on the simulated rail:");
		msg.bullets = ap.map(
			(v) => `${v.p.payee}: ${usd(v.p.usd)} via ${rname(v.plan.rec)}`,
		);
		if (prepare) {
			msg.note =
				"Each payment needs your explicit confirmation in the queue. I have no payment tool.";
			return {
				msg,
				actions: ap.map((v) => ({
					kind: "pay" as const,
					pid: v.p.id,
					risk: "High" as const,
					title: `Pay ${v.p.payee} ${usd(v.p.usd)}`,
					why: `Sends on the simulated rail via ${rname(v.plan.rec)}.`,
					cites: [],
				})),
			};
		}
		msg.note = SUGGEST_NOTE;
		return { msg };
	}

	// ---- explain one payout -------------------------------------------------
	if (pid || /why|explain|route|reroute|cheap|fee/.test(t)) {
		const v = vOf(pid || "br");
		const memo = memoFor(v, s);
		msg.tools = [
			`get_payout("${v.p.id}")`,
			`plan("${v.p.id}", asOf="${v.plan.iso}")`,
		];
		msg.paras.push(memo.rationale);
		memo.warnings.forEach((w) => {
			msg.bullets.push(`Warning · ${w}`);
		});
		if (!v.m.final && !v.m.lockedIso) {
			["2026-10-01", "2026-10-31"].forEach((d) => {
				if (d <= v.plan.iso) return;
				const b = plan(v.p, d, s);
				const ai = v.plan.rec ? v.plan.rec.route.id : null;
				const bi = b.rec ? b.rec.route.id : null;
				if (ai !== bi) {
					const ev = ai ? b.evals.find((e) => e.route.id === ai) : undefined;
					const hit = ev?.results.find((x) => x.o === "block");
					msg.bullets.push(
						"On " +
							fmtDate(d) +
							" this would reroute to " +
							rname(b.rec) +
							(hit ? `, because ${hit.rule.id} takes effect` : "") +
							".",
					);
				}
			});
		}
		msg.cites = memo.cited.map((c) => c.id);
		msg.note =
			"The rules engine made this decision (fingerprint " +
			fingerprint(v.plan) +
			"). I only explain it.";
		msg.cta = { label: `Open ${v.p.payee}`, kind: "open", pid: v.p.id };
		return { msg };
	}

	// ---- triage -------------------------------------------------------------
	if (
		/attention|today|summary|status|overview|inbox|what.*(need|do)|priorit|next/.test(
			t,
		)
	) {
		msg.tools = ["list_payouts()", `plan_all(asOf="${asOf}")`];
		const cnt: Record<string, number> = {};
		vs.forEach((v) => {
			const l = pill(v.status).label;
			cnt[l] = (cnt[l] || 0) + 1;
		});
		msg.paras.push(
			"As of " +
				dl +
				": " +
				Object.keys(cnt)
					.map((k) => `${cnt[k]} ${k.toLowerCase()}`)
					.join(", ") +
				".",
		);
		msg.bullets = vs.map(
			(v) =>
				v.p.payee +
				" " +
				eff(v.p, v.m).inv.number +
				": " +
				pill(v.status).label +
				(v.plan.rec ? ` · ${rname(v.plan.rec)}` : "") +
				(v.plan.rec?.warns ? ` · ${v.plan.rec.warns} warning` : ""),
		);
		vs.forEach((v) => {
			const tg =
				v.plan.rec || v.plan.evals.find((e) => e.route.kind === "wire")!;
			tg.results.forEach((x) => {
				if (x.o === "warn" || (x.o === "block" && !v.plan.rec))
					msg.cites.push(x.rule.id);
			});
		});
		const hold = vs.find((v) => v.status === "security_hold");
		const aw = vs.find((v) => v.status === "awaiting_second_approver");
		const rd = vs.find((v) => v.status === "ready");
		const apv = vs.find((v) => v.status === "approved");
		const pd = vs.find((v) => v.status === "paid");
		msg.note = hold
			? "First: resolve the security hold on " +
				eff(hold.p, hold.m).inv.number +
				"."
			: aw
				? `Suggested next step: ${aw.p.payee} needs a second approver.`
				: rd
					? `Suggested next step: review and approve ${rd.p.payee}.`
					: apv
						? `Suggested next step: pay ${apv.p.payee}.`
						: pd
							? `Suggested next step: reconcile ${pd.p.payee}.`
							: "Nothing urgent.";
		const pend = s.actions.filter((a) => a.status === "pending").length;
		if (pend) {
			msg.note +=
				" " +
				pend +
				" action" +
				(pend > 1 ? "s are" : " is") +
				" already waiting in your queue.";
		}
		if (s.radar === "pending")
			msg.note += " There is also a registry update waiting for compliance.";
		msg.cites = uniq(msg.cites);
		return { msg };
	}

	// ---- fallback -----------------------------------------------------------
	msg.paras.push(
		"I can help with questions like these. Pick one below or ask in your own words:",
	);
	msg.bullets = [
		"What needs my attention today?",
		"Why is Estúdio Paulista on this route?",
		"What changes on Oct 31?",
		"Any regulatory changes?",
		"How much are we saving vs. wires?",
		"Prepare approvals for everything ready",
		"Can we pay Transportes Orinoco?",
	];
	msg.note =
		"I explain and prepare. The rules engine decides compliance, and you approve.";
	return { msg };
}

/** The welcome summary posted once the four demo invoices are read. */
export function loadSummaryMessage(asOf: string): AgentMessage {
	return {
		...blank(),
		tools: [
			"extract_invoice() ×4",
			"scan_injection() ×4",
			"screen_ofac() ×4",
			`plan_all(asOf="${asOf}")`,
		],
		cites: ["VE-OFAC", "BR-VASP-UNFILED-WARN", "AR-FX-SPREAD"],
		note: "Ask me what needs your attention, or open the queue to act.",
		paras: ["I read 4 invoices. Here is where they stand:"],
		bullets: [
			"Estúdio Paulista: ready, with one warning (Ponte Digital hasn’t filed for BCB authorization).",
			"Autopartes del Norte: needs a second approver. I read the CLABE (ending " +
				last4("002180700123456789") +
				") with low confidence, so please check it.",
			"Lucía Fernández: ready, with an exchange-rate gap warning.",
			"Transportes Orinoco: blocked by the Venezuela sanctions program.",
		],
	};
}

/** The agent's narration of the simulated fraud attempt. */
export function suspiciousMessage(): AgentMessage {
	const p = payoutById("br2");
	return {
		...blank(),
		tools: [
			`extract_invoice("${p.file}")`,
			"scan_injection()",
			'compare_vendor_master("Estúdio Paulista")',
			"find_duplicates()",
		],
		paras: [
			"I put a new invoice from Estúdio Paulista (INV-2026-0419) on security hold.",
		],
		bullets: secFindings(p),
		note: "New bank details plus urgency is the classic invoice-fraud pattern. I recommend rejecting it and calling the vendor on the number you already have.",
		cta: { label: "Open the held invoice", kind: "open", pid: "br2" },
	};
}
