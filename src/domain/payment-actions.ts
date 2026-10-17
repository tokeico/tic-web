import type { Status } from "./types";

/** Re-check server state before submitting; replaying a completed step is a no-op. */
export async function runPaymentAction(
	action: "pay" | "reconcile",
	readStatus: () => Promise<Status>,
	submit: () => Promise<unknown>,
): Promise<void> {
	const status = await readStatus();
	if (status === "booked" || (action === "pay" && status === "paid")) return;
	const required = action === "pay" ? "approved" : "paid";
	if (status !== required) {
		throw new Error(
			action === "pay"
				? "This payment needs approval before it can be sent. Review it in the inbox."
				: "This payment has not been sent yet. Send it before reconciling.",
		);
	}
	await submit();
}
