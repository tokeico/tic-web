// Regulatory radar: the (simulated) registry update the design proposes, and
// its impact analysis. The impact is a real dry run: the API re-plans each
// open Brazilian payout as if the update were approved, storing nothing.

import { previewPlan } from "./api";
import type { PayoutDetail, Settings } from "./contracts";
import { formatDate, formatUsd } from "./format";
import { recommendedEval, routeName, warnCount } from "./view";

export const RADAR_OFFRAMP = "br-ponte";
export const RADAR_UPDATE = { [RADAR_OFFRAMP]: "vasp_authorized" } as const;
export const CUTOFF = "2026-10-31";

const isOpen = (p: PayoutDetail) =>
	p.approvals.length === 0 &&
	[
		"draft",
		"needs_info",
		"blocked",
		"awaiting_second_approver",
		"ready",
	].includes(p.status);

export type RadarState = "pending" | "approved" | "rejected";

export const radarState = (
	settings: Settings | undefined,
	rejected: boolean,
): RadarState =>
	settings?.registry[RADAR_OFFRAMP] === "vasp_authorized"
		? "approved"
		: rejected
			? "rejected"
			: "pending";

export async function radarImpact(
	details: PayoutDetail[],
	asOf: string,
): Promise<string[]> {
	const out: string[] = [];
	for (const p of details.filter(
		(x) => x.country === "BR" && isOpen(x) && x.plan,
	)) {
		const num = p.invoice.invoiceNumber;
		const [a, b, d] = await Promise.all([
			previewPlan(p.id, CUTOFF),
			previewPlan(p.id, CUTOFF, RADAR_UPDATE),
			previewPlan(p.id, p.plan!.asOf, RADAR_UPDATE),
		]);
		if (routeName(a.recommended) !== routeName(b.recommended)) {
			const saves =
				a.recommended && b.recommended
					? ` · saves ${formatUsd((p.amountUsd * (a.recommended.feePct - b.recommended.feePct)) / 100)}`
					: "";
			out.push(
				`${p.payeeName} ${num}, from ${formatDate(CUTOFF).replace(", 2026", "")}: ${routeName(a.recommended)} → ${routeName(b.recommended)}${saves}`,
			);
		}
		const before = warnCount(recommendedEval(p.plan));
		const after = warnCount(
			d.evaluations.find((e) => e.route.id === d.recommended?.id),
		);
		if (before > after)
			out.push(
				`${p.payeeName} ${num}, as of ${formatDate(asOf)}: the BR-VASP-UNFILED-WARN warning goes away`,
			);
	}
	return out.length ? out : ["No open payout changes route."];
}
