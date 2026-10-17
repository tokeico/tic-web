import { describe, expect, test } from "bun:test";
import { filterTransactions, transactionsFrom } from "./transactions";

const payout = (id, options = {}) => ({
	p: {
		id,
		payee: "Example vendor",
		country: "Brazil",
		amount: 500,
		cur: "BRL",
		usd: 100,
		inv: { number: `INV-${id}` },
	},
	m: {
		payment: {
			txHash: `0x${id}`,
			offrampRef: "OFF-123",
			railRef: "PIX-123",
			railName: "Pix",
			railMode: "mock",
		},
	},
	plan: {
		rec: {
			route: {
				kind: "stablecoin",
				label: "USDC / Base",
				off: { net: "Base", asset: "USDC" },
			},
		},
	},
	status: "paid",
	...options,
});
const event = (pid, seq) => ({ pid, seq, type: "paid" });

describe("transaction explorer records", () => {
	test("includes paid and booked receipts, but not approvals without payments", () => {
		const records = transactionsFrom(
			[
				payout("one"),
				payout("two", { status: "booked" }),
				payout("three", { status: "approved", m: {} }),
			],
			[],
		);
		expect(records).toHaveLength(2);
		expect(records[1].booked).toBe(true);
		expect(records[0].payment.railMode).toBe("mock");
	});
	test("uses payment activity order, not the rules as-of date", () => {
		const records = transactionsFrom(
			[payout("old"), payout("new")],
			[
				event("new", 20),
				event("old", 3),
				{ pid: "old", type: "planned", seq: 99 },
			],
		);
		expect(records.map((r) => r.id)).toEqual(["new", "old"]);
	});
	test("does not invent blockchain networks for bank wires", () => {
		const [record] = transactionsFrom(
			[
				payout("wire", {
					plan: { rec: { route: { kind: "wire", label: "SWIFT" } } },
				}),
			],
			[],
		);
		expect(record.network).toBe("Bank wire");
		expect(record.asset).toBe("");
	});
	test("searches full hashes, invoices, payees and local rail references", () => {
		const records = transactionsFrom([payout("abc")], []);
		for (const query of [
			"0xabc",
			"INV-abc",
			"example VENDOR",
			"PIX-123",
			" OFF-123 ",
		]) {
			expect(filterTransactions(records, query, "")).toHaveLength(1);
		}
		expect(filterTransactions(records, "missing", "")).toEqual([]);
		expect(filterTransactions(records, "", "Tron")).toEqual([]);
		expect(filterTransactions(records, "", "Base")).toHaveLength(1);
	});
	test("activity is scoped to its own payout and sorted", () => {
		const [record] = transactionsFrom(
			[payout("one")],
			[event("one", 3), event("another", 2), event("one", 1)],
		);
		expect(record.events.map((e) => e.seq)).toEqual([1, 3]);
	});
});
