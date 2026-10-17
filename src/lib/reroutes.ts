// "Rerouted Estúdio Paulista 0412: PagaFX → Ponte Digital · BR-561-EFX took effect"
// The toast that names the rule behind every route change (design: toast + flash).

import type { PayoutDetail, Reroute } from "./contracts";
import { setDemo, showToast } from "./demo-store";
import { routeName } from "./view";

function routeNameFor(
	before: PayoutDetail | undefined,
	routeId: string | null,
): string {
	if (!routeId) return "no compliant route";
	const found = before?.plan?.evaluations.find(
		(e) => e.route.id === routeId,
	)?.route;
	if (found) return routeName(found);
	return routeId.endsWith(":wire:swift")
		? "SWIFT wire"
		: (routeId.split(":").pop() ?? routeId);
}

/** Call with the payouts as they were BEFORE the change, so both ends of the move can be named. */
export function announceReroutes(
	reroutes: Reroute[],
	before: PayoutDetail[] | undefined,
): void {
	if (reroutes.length === 0) return;
	const lines = reroutes.map((r) => {
		const p = before?.find((x) => x.id === r.payoutId);
		const who = p
			? `${p.payeeName.split(" ").slice(0, 2).join(" ")} ${p.invoice.invoiceNumber.slice(-4)}`
			: "payout";
		return {
			head: `Rerouted ${who}:`,
			body: `${routeNameFor(p, r.from)} → ${routeNameFor(p, r.to)} · ${r.reason}`,
		};
	});
	setDemo((s) => ({ reroutes: s.reroutes + reroutes.length }));
	showToast(lines, reroutes[reroutes.length - 1]!.payoutId);
}
