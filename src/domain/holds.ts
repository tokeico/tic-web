import { RULES } from "./data";
import { mins } from "./format";
import type { Payout, PayoutView } from "./types";

/** Rule ids blocking this plan that only a compliance sign-off lifts (VE-OFAC). */
export function sanctionsHoldIds(v: PayoutView): string[] {
	const liftable = new Set(
		RULES.filter((r) => r.liftedBy === "sanctions_signoff").map((r) => r.id),
	);
	return [
		...new Set(
			v.plan.evals.flatMap((e) =>
				e.results
					.filter((r) => r.o === "block" && liftable.has(r.rule.id))
					.map((r) => r.rule.id),
			),
		),
	];
}

/** Bank details vs. the verified vendor record, from the plan or the check list. */
export const bankStatus = (p: Payout) =>
	p.bankCheck?.status ?? p.checks?.bankDetails ?? null;

/**
 * Why a blocked payout is blocked, in a few plain words: the sanctions policy
 * hold, a screening match, a bank-detail hold, or the rule that blocks every route.
 */
export function blockReason(v: PayoutView): string {
	const { p, plan } = v;
	const sanctions = sanctionsHoldIds(v);
	if (sanctions.length)
		return `sanctions policy hold (${sanctions.join(", ")}) until compliance signs off`;
	if (p.screening && p.screening.status !== "clear")
		return (
			(p.screening.status === "hit"
				? "sanctions screening hit"
				: "possible sanctions screening match") +
			(p.screening.match ? ` (${p.screening.match})` : "") +
			": a person must review it"
		);
	const bank = p.bankCheck?.status;
	if (bank === "changed")
		return "bank details differ from the verified vendor record: call the vendor back before approving";
	if (bank === "unverified")
		return "no verified bank details on file for this vendor: call the vendor back before approving";
	const block = plan.evals
		.flatMap((e) => e.results)
		.find((r) => r.o === "block");
	if (block) return `${block.rule.id}: ${block.msg}`;
	return p.reasons?.[0] ?? "every route is blocked by the rules";
}

/** The invoice amount as the supplier receives it; "$" currencies keep their code. */
export function supplierAmount(p: Payout) {
	const text = new Intl.NumberFormat(p.locale, {
		style: "currency",
		currency: p.cur,
	}).format(p.amount);
	return /^-?\$/.test(text.trim()) ? `${text} ${p.cur}` : text;
}

/** "Pay R$ 85.000,00 to Estúdio Paulista by Pix · about 20 min". */
export function payLabel(v: PayoutView) {
	const r = v.plan.rec?.route;
	const rail = r ? (r.off ? r.off.rail : "SWIFT wire") : "";
	return (
		`Pay ${supplierAmount(v.p)} to ${v.p.payee}` +
		(r ? ` by ${rail} · about ${mins(r.min)}` : "")
	);
}
