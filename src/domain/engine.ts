import { OFFRAMPS, RULES, visiblePayouts } from "./data";
import { fmtDate, h64, iso } from "./format";
import {
	rememberFingerprint as _remember,
	fingerprintOf,
	remoteHit,
} from "./remote";
import type {
	AppState,
	EffectivePayout,
	Mut,
	Payout,
	PayoutView,
	Plan,
	Route,
	RouteEval,
	Status,
} from "./types";

/**
 * The rules engine. Deterministic by construction: the same payout, as-of date
 * and settings always produce the same plan and the same fingerprint, because
 * settings, the provider registry and human inputs all enter as data.
 *
 * AI never appears in this file. Code decides.
 */

/** The slice of app state the engine reads. */
export type EngineState = Pick<
	AppState,
	"settings" | "registry" | "mut" | "sus" | "day"
>;

export const EMPTY_MUT: Mut = { approvals: [] };

export const mOf = (s: EngineState, id: string): Mut => s.mut[id] || EMPTY_MUT;

/** Folds human edits and any recorded license into the payout. */
export const eff = (p: Payout, m: Mut): EffectivePayout => ({
	...p,
	inv: { ...p.inv, ...(m.edits || {}) },
	license: m.license || null,
});

export function routesFor(p: Payout, s: EngineState): Route[] {
	const st = s.settings;
	const reg = s.registry || {};
	const out: Route[] = OFFRAMPS.filter(
		(o) => o.c === p.c && !st.disabled[o.id],
	).map((o0) => {
		// An approved registry update is data, not a code change.
		const o =
			reg.ponte && o0.id === "br-ponte"
				? { ...o0, type: "vasp_authorized" as const }
				: o0;
		return {
			id: `${p.c}:${o.id}`,
			kind: "stablecoin" as const,
			off: o,
			fee: o.fee,
			min: o.min,
			label: `${o.asset} · ${o.net} · ${o.name} · ${o.fee.toFixed(2)}%`,
		};
	});
	out.push({
		id: `${p.c}:wire`,
		kind: "wire",
		off: null,
		fee: 4.5,
		min: 2880,
		label: "SWIFT wire · 4.5% · 2 days",
	});
	return out.sort((a, b) => a.fee - b.fee);
}

export function plan(p: Payout, asOf: string, s: EngineState): Plan {
	const st = s.settings;
	const m = mOf(s, p.id);
	const pe = eff(p, m);
	const rules = RULES.filter((r) => r.c === p.c);

	const evals: RouteEval[] = routesFor(p, s).map((route) => {
		const results = rules.map((rule) => {
			let o: RouteEval["results"][number]["o"];
			let msg: string;
			if (rule.from && asOf < rule.from) {
				o = "inactive";
				msg = `Takes effect ${fmtDate(rule.from)}.`;
			} else if (rule.to && asOf > rule.to) {
				o = "inactive";
				msg = `Expired after ${fmtDate(rule.to)}.`;
			} else {
				const r = rule.ev(pe, route);
				o = r[0];
				msg = r[1];
			}
			return { rule, o, msg };
		});
		const compliant = !results.some((x) => x.o === "block" || x.o === "fields");
		return {
			route,
			results,
			compliant,
			warns: results.filter((x) => x.o === "warn").length,
		};
	});

	const sorters: Record<string, (a: RouteEval, b: RouteEval) => number> = {
		cheapest: (a, b) => a.route.fee - b.route.fee,
		fastest: (a, b) => a.route.min - b.route.min || a.route.fee - b.route.fee,
		safest: (a, b) => a.warns - b.warns || a.route.fee - b.route.fee,
	};
	const comp = evals.filter((e) => e.compliant).sort(sorters[st.objective]);
	const engine = comp[0] || null;

	let rec = engine;
	let overridden = false;
	let overrideLost = false;
	const m2 = mOf(s, p.id);
	if (m2.override) {
		const ov = evals.find((e) => e.route.id === m2.override!.routeId);
		if (ov?.compliant) {
			rec = ov;
			overridden = ov !== engine;
		} else {
			// A route a person chose can stop being compliant when the date moves.
			overrideLost = true;
		}
	}

	let status: Plan["status"] = "ready";
	if (!rec) {
		status = evals.some((e) => e.results.some((x) => x.o === "fields"))
			? "needs_info"
			: "blocked";
	}
	return { iso: asOf, evals, rec, engine, overridden, overrideLost, status };
}

/** Short hash over the inputs and the outcome, shown next to "Replay 100×". */
export const fingerprint = (pl: Plan) =>
	fingerprintOf(pl) ??
	h64(
		JSON.stringify({
			iso: pl.iso,
			e: pl.evals.map((e) => [
				e.route.id,
				e.results.map((x) => `${x.rule.id}:${x.o}`),
			]),
			r: pl.rec ? pl.rec.route.id : null,
		}),
	).slice(0, 16);

export const rememberFingerprint = _remember;

/** Approvals required: two people above the threshold. */
export const need = (p: Payout, s: EngineState) =>
	p.usd > s.settings.threshold ? 2 : 1;

export function statusOf(p: Payout, pl: Plan, m: Mut, s: EngineState): Status {
	if (m.final) return m.final;
	if (p.security && !m.secCleared) return "security_hold";
	if (pl.status !== "ready") return pl.status;
	const n = need(p, s);
	if (m.approvals.length >= n) return "approved";
	if (m.approvals.length > 0) return "awaiting_second_approver";
	return "ready";
}

/** Resolves one payout against state, honouring a plan locked at approval. */
export function pv(p: Payout, s: EngineState): PayoutView {
	const hit = remoteHit(p.id);
	if (hit) {
		const local = mOf(s, p.id);
		const m: Mut = {
			...hit.mut,
			ack: local.ack ?? hit.mut.ack,
			override: local.override ?? hit.mut.override,
			secCleared: local.secCleared ?? hit.mut.secCleared,
			license: local.license ?? hit.mut.license,
			edits: local.edits ?? hit.mut.edits,
		};
		return { p: hit.p, m, plan: withOverride(hit.plan, m), status: hit.status };
	}
	const m = mOf(s, p.id);
	const ctx = m.lockedSettings ? { ...s, settings: m.lockedSettings } : s;
	const pl = plan(p, m.lockedIso || iso(s.day), ctx);
	return { p, m, plan: pl, status: statusOf(p, pl, m, s) };
}

/** A person's route choice, applied on top of the plan the API returned. */
function withOverride(plan: Plan, m: Mut): Plan {
	if (!m.override) return plan;
	const ov = plan.evals.find((e) => e.route.id === m.override!.routeId);
	if (ov?.compliant) {
		return {
			...plan,
			rec: ov,
			overridden: ov !== plan.engine,
			overrideLost: false,
		};
	}
	return { ...plan, overrideLost: true };
}

export const views = (s: EngineState): PayoutView[] =>
	visiblePayouts(s.sus).map((p) => pv(p, s));

export const approvedUsd = (s: EngineState) =>
	visiblePayouts(s.sus).reduce((t, q) => {
		const v = pv(q, s);
		return t + (["approved", "paid", "booked"].includes(v.status) ? q.usd : 0);
	}, 0);

export const rname = (rec: RouteEval | null) =>
	rec
		? rec.route.off
			? rec.route.off.name
			: "SWIFT wire"
		: "no compliant route";

export type PillIcon = "ok" | "warn" | "bad" | "shield" | "wait" | "done";

const PILLS: Record<Status, [string, string, PillIcon]> = {
	draft: ["Extracting", "p-neutral", "wait"],
	needs_info: ["Needs info", "p-warn", "warn"],
	blocked: ["Blocked", "p-bad", "bad"],
	awaiting_second_approver: ["Awaiting 2nd approver", "p-warn", "wait"],
	ready: ["Ready", "p-ok", "ok"],
	approved: ["Approved", "p-neutral", "done"],
	paid: ["Paid", "p-neutral", "done"],
	booked: ["Booked", "p-neutral", "done"],
	rejected: ["Rejected", "p-bad", "bad"],
	security_hold: ["Security hold", "p-bad", "shield"],
};

export function pill(status: Status) {
	const [label, cls, icon] = PILLS[status];
	return { label, cls: `pill ${cls}`, icon };
}

export const activeRuleCount = (asOf: string) =>
	RULES.filter((r) => !(r.from && asOf < r.from) && !(r.to && asOf > r.to))
		.length;
