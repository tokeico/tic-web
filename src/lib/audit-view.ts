// How an audit event reads in the UI: who did it (AI reads, code decides, a
// person approves) and a one-line summary built from the signed payload.

import type { Actor } from "#/components/ui";
import type { AuditEvent, OfframpListing, PayoutDetail } from "./contracts";
import { formatDate, formatUsd0 } from "./format";
import { routeName } from "./view";

const AI = new Set(["extracted", "memo"]);
const CODE = new Set(["screened", "planned", "asof_changed", "reconciled"]);

export const actorOf = (type: AuditEvent["type"]): Actor =>
	AI.has(type) ? "AI" : CODE.has(type) ? "Code" : "Human";

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** "BR:usdc-base:br-sol" → "Sol VASP"; "BR:wire:swift" → "SWIFT wire". */
export function prettyRoute(id: unknown, offramps: OfframpListing[]): string {
	const s = str(id);
	if (!s) return "no compliant route";
	if (s.endsWith(":wire:swift")) return "SWIFT wire";
	return offramps.find((o) => s.endsWith(`:${o.id}`))?.name ?? s;
}

export function describeEvent(
	e: AuditEvent,
	offramps: OfframpListing[],
): string {
	const p = e.payload;
	const by = str(p.by);
	switch (e.type) {
		case "extracted":
			return "Fields extracted from the invoice";
		case "edited": {
			const fields = Array.isArray(p.fields) ? (p.fields as string[]) : [];
			return `Reviewed ${fields.length ? fields.join(", ") : "fields"}${by ? ` · by ${by}` : ""} · re-planned`;
		}
		case "screened":
			return p.match
				? `OFAC SDN: ${str(p.status).replace("_", " ")} · ${str(p.match)}`
				: "OFAC SDN: clear";
		case "screening_reviewed":
			return `Screening ${p.decision === "cleared" ? "cleared" : "confirmed as a hit"}${by ? ` by ${by}` : ""}`;
		case "planned":
			return `Plan as of ${formatDate(str(p.asOf))}: ${p.recommendedRouteId ? `route ${prettyRoute(p.recommendedRouteId, offramps)}` : "no compliant route"} (${str(p.status).replaceAll("_", " ")})`;
		case "memo":
			return "Memo drafted; citation guard passed";
		case "approved":
			return `${p.role === "second" ? "Second" : "First"} approval${by ? ` by ${by}` : ""}${p.nextStatus === "approved" ? " · fully approved" : " · second approver still needed"}${p.amountUsd ? ` · ${formatUsd0(Number(p.amountUsd))}` : ""}`;
		case "rejected":
			return `Rejected${by ? ` by ${by}` : ""}. Nothing will be paid.`;
		case "paid":
			return `Sent via ${prettyRoute(p.routeId, offramps)} (${str(p.railMode) === "mock" ? "simulated" : str(p.railMode)})${by ? ` · confirmed by ${by}` : ""}`;
		case "reconciled":
			return p.status === "matched"
				? `Matched invoice ↔ transaction ↔ rail reference${by ? ` · by ${by}` : ""} · booked`
				: `Reconciliation exception: ${Array.isArray(p.reasons) ? (p.reasons as string[]).join(" ") : "mismatch"}`;
		case "asof_changed":
			return `As-of moved to ${formatDate(str(p.to))}; ${Number(p.replanned ?? 0)} open payouts re-planned`;
		case "settings_changed": {
			const tail = by ? ` (by ${by})` : "";
			switch (p.setting) {
				case "policy": {
					const to = (p.to ?? {}) as {
						secondApproverAboveUsd?: number;
						dailyCapUsd?: number;
					};
					return `Approval policy: second approver above ${formatUsd0(to.secondApproverAboveUsd ?? 0)}, daily cap ${formatUsd0(to.dailyCapUsd ?? 0)}${tail}`;
				}
				case "objective":
					return `Routing preference set to ${str(p.to)}${tail}`;
				case "disabled_offramps": {
					const was = new Set(
						Array.isArray(p.from) ? (p.from as string[]) : [],
					);
					const now = new Set(Array.isArray(p.to) ? (p.to as string[]) : []);
					const flipped = [...now]
						.filter((x) => !was.has(x))
						.map((x) => `${provider(x, offramps)} disabled`)
						.concat(
							[...was]
								.filter((x) => !now.has(x))
								.map((x) => `${provider(x, offramps)} enabled`),
						);
					return `${flipped.join(", ") || "Provider switches changed"}${tail}`;
				}
				case "registry": {
					const to = Object.entries((p.to ?? {}) as Record<string, string>);
					return to.length
						? `Registry update approved: ${to.map(([id, t]) => `${provider(id, offramps)} → ${t.replaceAll("_", " ")}`).join(", ")}${tail}`
						: `Registry update reverted${tail}`;
				}
				default:
					return `Setting changed${tail}`;
			}
		}
		default:
			return String(e.type).replaceAll("_", " ");
	}
}

const provider = (id: string, offramps: OfframpListing[]) =>
	offramps.find((o) => o.id === id)?.name ?? id;

/** Who/what an event is about: the payee, or the area for global events. */
export function eventSubject(e: AuditEvent, payouts: PayoutDetail[]): string {
	if (e.payoutId)
		return payouts.find((p) => p.id === e.payoutId)?.payeeName ?? "Payout";
	return e.type === "asof_changed"
		? "Demo clock"
		: e.type === "settings_changed"
			? e.payload.setting === "registry"
				? "Compliance"
				: "Settings"
			: "System";
}

export { routeName };
