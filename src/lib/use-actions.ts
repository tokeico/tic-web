// Every button's behaviour, bound to the API. Components call these; they
// never touch fetch or the cache directly. Failures become a toast with the
// API's own message ("Approving $64,864.86 would bring today's total to...").

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	ApiRequestError,
	approvePayout,
	editInvoice,
	payoutsQuery,
	payPayout,
	planAll,
	reconcilePayout,
	resetDemo,
	reviewScreening,
	updateSettings,
} from "./api";
import type { InvoicePatch, PayoutDetail, SettingsPatch } from "./contracts";
import {
	getDemo,
	later,
	resetDemoState,
	setDemo,
	showToast,
} from "./demo-store";
import { announceReroutes } from "./reroutes";
import { DEMO_TODAY } from "./search";

export const ACTING_AS = "Maria Lopez";

const msg = (e: unknown) =>
	e instanceof ApiRequestError
		? e.message
		: e instanceof Error
			? e.message
			: "Something went wrong";

export function useActions() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as { asOf?: string };
	const asOf = search.asOf ?? DEMO_TODAY;

	return useMemo(() => {
		const refresh = () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: ["payouts"] }),
				queryClient.invalidateQueries({ queryKey: ["settings"] }),
				queryClient.invalidateQueries({ queryKey: ["audit"] }),
				queryClient.invalidateQueries({ queryKey: ["ledger"] }),
				queryClient.invalidateQueries({ queryKey: ["offramps"] }),
			]);

		const before = () => queryClient.getQueryData(payoutsQuery.queryKey);

		/** Run a write, refresh everything it touches, and turn a failure into a toast. */
		async function run<T>(
			what: string,
			fn: () => Promise<T>,
		): Promise<T | undefined> {
			try {
				const out = await fn();
				await refresh();
				return out;
			} catch (e) {
				showToast([{ head: `Couldn't ${what}:`, body: msg(e) }]);
				await refresh();
				return undefined;
			}
		}

		const setAsOf = (next: string) =>
			navigate({
				to: ".",
				search: (p: Record<string, unknown>) => ({ ...p, asOf: next }),
				replace: true,
			} as never);

		const go = (to: string, extra: Record<string, unknown> = {}) =>
			navigate({
				to,
				search: (p: Record<string, unknown>) => ({ asOf: p.asOf, ...extra }),
			} as never);

		const openPayout = (id: string) => go("/inbox", { payout: id });

		return {
			asOf,
			setAsOf,
			go,
			openPayout,
			refresh,

			/** Plan every draft invoice ("Load the demo invoices"): shows the extracting skeleton for a beat first. */
			async loadDemo() {
				if (getDemo().loading) return;
				setDemo({ loading: true });
				await new Promise((r) => later(() => r(null), 1400));
				try {
					await planAll(asOf);
					await refresh();
				} catch (e) {
					showToast([
						{ head: "Couldn't load the demo invoices:", body: msg(e) },
					]);
				} finally {
					setDemo({ loading: false });
				}
			},

			/** Wipe the database back to four draft invoices and the default demo date. */
			async resetDemo() {
				try {
					const res = await resetDemo();
					resetDemoState();
					queryClient.clear();
					await navigate({ to: "/inbox", search: { asOf: res.asOf } } as never);
				} catch (e) {
					showToast([{ head: "Couldn't reset:", body: msg(e) }]);
				}
			},

			async replan(next: string) {
				const prev = before();
				const res = await planAll(next);
				announceReroutes(res.reroutes, prev);
				await refresh();
				return res;
			},

			approve: (d: PayoutDetail, who: string) =>
				run("approve", () =>
					approvePayout(d.id, { approver: who, decision: "approved" }),
				),
			reject: (d: PayoutDetail) =>
				run("reject", () =>
					approvePayout(d.id, { approver: ACTING_AS, decision: "rejected" }),
				),
			pay: (d: PayoutDetail) =>
				run("pay", async () => {
					// The simulated rail takes a moment, like the real one would.
					const [res] = await Promise.all([
						payPayout(d.id, ACTING_AS),
						new Promise((r) => later(() => r(null), 900)),
					]);
					return res;
				}),
			reconcile: (d: PayoutDetail) =>
				run("reconcile", () => reconcilePayout(d.id, ACTING_AS)),
			edit: (d: PayoutDetail, patch: InvoicePatch) =>
				run("save the fields", async () => {
					const prev = before();
					const out = await editInvoice(d.id, {
						...patch,
						by: ACTING_AS,
					} as InvoicePatch);
					const now = out.recommended?.id ?? null;
					const was = d.recommended?.id ?? null;
					if (now !== was)
						announceReroutes(
							[
								{
									payoutId: d.id,
									from: was,
									to: now,
									ruleId: null,
									reason: "fields edited",
								},
							],
							prev,
						);
					return out;
				}),
			reviewScreening: (
				d: PayoutDetail,
				decision: "cleared" | "confirmed_hit",
				note: string,
			) =>
				run("record the review", () =>
					reviewScreening(d.id, { reviewer: ACTING_AS, decision, note }),
				),

			/** Settings writes re-plan open payouts; say what moved. */
			settings: (patch: SettingsPatch) =>
				run("save the setting", async () => {
					const prev = before();
					const out = await updateSettings({
						...patch,
						by: patch.by ?? ACTING_AS,
					});
					announceReroutes(out.reroutes, prev);
					return out;
				}),

			setAck: (id: string, value: boolean) =>
				setDemo((s) => ({ acks: { ...s.acks, [id]: value } })),

			copy(text: string, key: string) {
				void navigator.clipboard?.writeText(text).catch(() => {});
				setDemo({ copied: key });
				later(
					() => getDemo().copied === key && setDemo({ copied: null }),
					1500,
				);
			},
		};
	}, [queryClient, navigate, asOf]);
}
