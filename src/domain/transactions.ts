import type { AuditEvent, Payment, PayoutView } from "./types";

export interface Transaction {
	id: string;
	payee: string;
	invoice: string;
	country: string;
	amount: number;
	currency: string;
	usd: number;
	network: string;
	asset: string;
	route: string;
	payment: Payment;
	booked: boolean;
	events: AuditEvent[];
}

/** Payment receipts only: approvals and invoices are not blockchain transfers. */
export function transactionsFrom(
	payouts: PayoutView[],
	events: AuditEvent[],
): Transaction[] {
	return payouts
		.flatMap((v) => {
			if (!v.m.payment) return [];
			const route = v.plan.rec?.route;
			return [
				{
					id: v.p.id,
					payee: v.p.payee,
					invoice: v.m.edits?.number ?? v.p.inv.number,
					country: v.p.country,
					amount: v.p.amount,
					currency: v.p.cur,
					usd: v.p.usd,
					network:
						route?.kind === "wire"
							? "Bank wire"
							: route?.off?.net || "Unknown network",
					asset: route?.off?.asset ?? "",
					route: route?.label ?? "Route unavailable",
					payment: v.m.payment,
					booked: v.status === "booked",
					events: events
						.filter((e) => e.pid === v.p.id)
						.sort((a, b) => a.seq - b.seq),
				},
			];
		})
		.sort((a, b) => {
			const seq = (t: Transaction) =>
				t.events
					.slice()
					.reverse()
					.find((e) => e.type === "paid")?.seq ?? 0;
			return seq(b) - seq(a);
		});
}

export function filterTransactions(
	transactions: Transaction[],
	query: string,
	network: string,
): Transaction[] {
	const term = query.trim().toLowerCase();
	return transactions.filter(
		(t) =>
			(!network || t.network === network) &&
			[
				t.payee,
				t.invoice,
				t.id,
				t.country,
				t.network,
				t.asset,
				t.payment.txHash,
				t.payment.offrampRef,
				t.payment.railRef,
			]
				.join(" ")
				.toLowerCase()
				.includes(term),
	);
}
