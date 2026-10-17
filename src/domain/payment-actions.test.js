import { describe, expect, test } from "bun:test";
import { runPaymentAction } from "./payment-actions";

describe("payment state guards", () => {
	for (const status of ["paid", "booked"]) {
		test(`paying a ${status} payout never submits another payment`, async () => {
			let calls = 0;
			await runPaymentAction(
				"pay",
				async () => status,
				async () => {
					calls++;
				},
			);
			expect(calls).toBe(0);
		});
	}
	test("an approved payout can be paid", async () => {
		let calls = 0;
		await runPaymentAction(
			"pay",
			async () => "approved",
			async () => {
				calls++;
			},
		);
		expect(calls).toBe(1);
	});
	for (const status of [
		"ready",
		"draft",
		"blocked",
		"rejected",
		"security_hold",
		"needs_info",
		"awaiting_second_approver",
	]) {
		test(`${status} cannot be paid`, async () => {
			let calls = 0;
			await expect(
				runPaymentAction(
					"pay",
					async () => status,
					async () => {
						calls++;
					},
				),
			).rejects.toThrow("needs approval");
			expect(calls).toBe(0);
		});
	}
	test("booked reconciliation is a no-op", async () => {
		let calls = 0;
		await runPaymentAction(
			"reconcile",
			async () => "booked",
			async () => {
				calls++;
			},
		);
		expect(calls).toBe(0);
	});
	test("paid reconciliation submits once", async () => {
		let calls = 0;
		await runPaymentAction(
			"reconcile",
			async () => "paid",
			async () => {
				calls++;
			},
		);
		expect(calls).toBe(1);
	});
	test("failed requests propagate instead of claiming success", async () => {
		await expect(
			runPaymentAction(
				"pay",
				async () => "approved",
				async () => {
					throw new Error("Rail unavailable");
				},
			),
		).rejects.toThrow("Rail unavailable");
	});
});
