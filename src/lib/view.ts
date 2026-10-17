// Turn API data into what the screens show: labels, status pills, route text,
// rules checklists. Pure functions, no React.

import type {
	Country,
	LocalRail,
	OfframpType,
	PayoutDetail,
	PayoutStatus,
	Plan,
	Route,
	RouteEvaluation,
	Rule,
	RuleResult,
} from "./contracts";
import { formatDate } from "./format";

export const COUNTRY_NAME: Record<Country, string> = {
	BR: "Brazil",
	MX: "Mexico",
	AR: "Argentina",
	VE: "Venezuela",
	CO: "Colombia",
};

// ---- Status pills (the design's pill() map) -----------------------------------------

export type PillIcon = "ok" | "warn" | "bad" | "shield" | "wait" | "done";

export const STATUS: Record<
	PayoutStatus,
	{ label: string; cls: string; icon: PillIcon }
> = {
	draft: { label: "Extracting", cls: "p-neutral", icon: "wait" },
	needs_info: { label: "Needs info", cls: "p-warn", icon: "warn" },
	blocked: { label: "Blocked", cls: "p-bad", icon: "bad" },
	awaiting_second_approver: {
		label: "Awaiting 2nd approver",
		cls: "p-warn",
		icon: "wait",
	},
	ready: { label: "Ready", cls: "p-ok", icon: "ok" },
	approved: { label: "Approved", cls: "p-neutral", icon: "done" },
	paid: { label: "Paid", cls: "p-neutral", icon: "done" },
	booked: { label: "Booked", cls: "p-neutral", icon: "done" },
	rejected: { label: "Rejected", cls: "p-bad", icon: "bad" },
};

// ---- Providers ------------------------------------------------------------------------

/** Short, lowercase: used inside a route row. */
export const TYPE_SHORT: Record<OfframpType, string> = {
	vasp_authorized: "authorized VASP",
	vasp_pending: "VASP · authorization pending",
	vasp_unfiled: "VASP · hasn't filed for BCB authorization",
	efx: "eFX provider",
	bank: "bank",
	nonbank_licensed: "SAT-registered platform",
	psav_registered: "registered PSAV",
	p2p_unregistered: "unregistered P2P desk",
};

/** Capitalised: the provider list in Customize. */
export const TYPE_LONG: Record<OfframpType, string> = {
	vasp_authorized: "Authorized VASP",
	vasp_pending: "VASP, authorization pending",
	vasp_unfiled: "VASP, hasn't filed for BCB authorization",
	efx: "eFX provider",
	bank: "Bank",
	nonbank_licensed: "SAT-registered platform",
	psav_registered: "Registered PSAV",
	p2p_unregistered: "Unregistered P2P desk",
};

export const RAIL_NAME: Record<LocalRail, string> = {
	pix: "Pix",
	spei: "SPEI",
	cvu: "CVU",
	pse: "PSE",
	swift: "SWIFT",
};

const NETWORK = { base: "Base", arbitrum: "Arbitrum", tron: "Tron" } as const;

/** "USDC · Base · Sol VASP · 0.85%" or "SWIFT wire · 4.50% · 2 days". */
export function routeLabel(r: Route): string {
	if (r.kind === "wire")
		return `SWIFT wire · ${r.feePct.toFixed(2)}% · ${r.minutes >= 1440 ? `${r.minutes / 1440} days` : `${r.minutes} min`}`;
	return [
		r.asset,
		r.network ? NETWORK[r.network] : null,
		r.offramp?.name,
		`${r.feePct.toFixed(2)}%`,
	]
		.filter(Boolean)
		.join(" · ");
}

/** Just the provider's name, or "SWIFT wire". */
export const routeName = (r: Route | null | undefined) =>
	r ? (r.offramp ? r.offramp.name : "SWIFT wire") : "no compliant route";

// ---- Plans ------------------------------------------------------------------------------

export const warnCount = (e: RouteEvaluation | undefined) =>
	e ? e.results.filter((r) => r.outcome === "warn").length : 0;

export function recommendedEval(
	plan: Plan | null,
): RouteEvaluation | undefined {
	return plan?.evaluations.find((e) => e.route.id === plan.recommended?.id);
}

export const wireEval = (plan: Plan) =>
	plan.evaluations.find((e) => e.route.kind === "wire");

/** The plan's routes, cheapest first (the design lists them by fee). */
export const byFee = (plan: Plan) =>
	[...plan.evaluations].sort(
		(a, b) =>
			a.route.feePct - b.route.feePct || a.route.minutes - b.route.minutes,
	);

export const blockerOf = (e: RouteEvaluation): RuleResult | undefined =>
	e.results.find(
		(r) => r.outcome === "block" || r.outcome === "require_fields",
	);

// ---- Rules checklist ---------------------------------------------------------------------

export type CheckKind =
	| "pass"
	| "warn"
	| "block"
	| "fields"
	| "na"
	| "inactive";

export interface CheckRow {
	id: string;
	title: string;
	kind: CheckKind;
	message: string;
	from: string | null;
	to: string | null;
	sourceName: string;
	sourceUrl: string;
}

/**
 * Every rule for the payout's country, in the pack's order: what the engine
 * found for rules in force, plus "not in effect" and "doesn't apply to a wire"
 * rows so the date story is visible (the design shows them).
 */
export function checklist(d: PayoutDetail, rules: Rule[]): CheckRow[] {
	const plan = d.plan;
	if (!plan) return [];
	const target = recommendedEval(plan) ?? wireEval(plan);
	const asOf = plan.asOf;
	const results = new Map((target?.results ?? []).map((r) => [r.ruleId, r]));
	return rules
		.filter((r) => r.corridor === d.country)
		.map((rule): CheckRow => {
			const base = {
				id: rule.id,
				title: rule.title,
				from: rule.effectiveFrom,
				to: rule.effectiveTo,
				sourceName: rule.source.name,
				sourceUrl: rule.source.url,
			};
			if (rule.effectiveFrom && asOf < rule.effectiveFrom)
				return {
					...base,
					kind: "inactive",
					message: `Takes effect ${formatDate(rule.effectiveFrom)}.`,
				};
			if (rule.effectiveTo && asOf > rule.effectiveTo)
				return {
					...base,
					kind: "inactive",
					message: `Expired after ${formatDate(rule.effectiveTo)}.`,
				};
			const hit = results.get(rule.id);
			if (!hit)
				return {
					...base,
					kind: "na",
					message: "Applies to stablecoin routes only.",
				};
			const kind: CheckKind =
				hit.outcome === "require_fields" ? "fields" : hit.outcome;
			return { ...base, kind, message: hit.message };
		});
}

export const CHECK_LABEL: Record<CheckKind, string> = {
	pass: "Pass",
	warn: "Warning",
	block: "Blocked",
	fields: "Fields needed",
	na: "Not applicable",
	inactive: "Not in effect",
};

export const CHECK_IC: Record<CheckKind, string> = {
	pass: "ic-ok",
	warn: "ic-warn",
	block: "ic-bad",
	fields: "ic-warn",
	na: "ic-muted",
	inactive: "ic-muted",
};

export const effectiveText = (from: string | null, to: string | null) =>
	`${from ? formatDate(from) : "date not set"}${to ? ` → ${formatDate(to)}` : ""}`;

// ---- Approvals and money -----------------------------------------------------------------

/** USD committed so far across payouts: anything with an approval that wasn't rejected. Drives "Daily cap". */
export const committedUsd = (all: PayoutDetail[]) =>
	all.reduce(
		(t, p) =>
			t + (p.approvals.length > 0 && p.status !== "rejected" ? p.amountUsd : 0),
		0,
	);

export const approvalsNeeded = (amountUsd: number, threshold: number): 1 | 2 =>
	amountUsd > threshold ? 2 : 1;

export const APPROVERS = ["Maria Lopez", "Daniel Ortiz"] as const;

/** "Approval 1 of 2" style text. */
export const approvalsText = (have: number, need: number) =>
	`${have} of ${need} ${need === 1 ? "approval" : "approvals"}`;

// ---- Invoice fields ----------------------------------------------------------------------

export const BANK_LABEL: Record<LocalRail, string> = {
	pix: "Pix key",
	spei: "CLABE",
	cvu: "CVU",
	pse: "PSE",
	swift: "Account / BIC",
};

/** The six fields the design shows, in order. */
export const FIELD_DEFS = [
	{ key: "invoiceNumber", label: "Invoice no.", low: null },
	{ key: "payeeTaxId", label: "Payee tax ID", low: "payeeTaxId" },
	{ key: "bankId", label: "Bank identifier", low: "bankId" },
	{ key: "dueDate", label: "Due date (YYYY-MM-DD)", low: null },
	{ key: "purposeCode", label: "Purpose code", low: "purposeCode" },
	{ key: "description", label: "Description", low: null },
] as const;
