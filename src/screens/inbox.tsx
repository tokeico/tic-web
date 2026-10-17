import { useEffect, useRef, useState } from "react";
import { count, KpiRow } from "@/components/agents";
import { DetailPane } from "@/components/DetailPane";
import { FileUp, More } from "@/components/icons";
import { ManualInvoiceForm } from "@/components/ManualInvoiceForm";
import { Card, Cc, RouteTag, StatusPill } from "@/components/ui";
import { PAYOUTS } from "@/domain/data";
import { eff, rname, views, warnIds, wireSaving } from "@/domain/engine";
import { local, usd, usd0 } from "@/domain/format";
import { payLabel } from "@/domain/holds";
import type { PayoutView } from "@/domain/types";
import type { BatchResult } from "@/lib/api";
import { hasMemberApproved } from "@/lib/auth";
import { useStore } from "@/state/store";

/** What the person can do to this payout in a batch, if anything. */
type BatchKind = "approve" | "pay" | null;

export function InboxPage() {
	const store = useStore();
	const {
		state,
		open,
		closeDetail,
		loadDemo,
		reset,
		addSuspicious,
		upload,
		openManual,
		batch,
		user,
		go,
	} = store;
	const uploadInput = useRef<HTMLInputElement>(null);
	const s = state;
	const vs = s.loaded ? views(s) : [];
	const sel = vs.find((v) => v.p.id === s.selected);
	const pending = s.actions.filter((a) => a.status === "pending");
	// Below lg the detail replaces the list: open it at the top, and return
	// to where the reader was in the list when they go back.
	const listY = useRef<number | null>(null);
	const openRow = (id: string) => {
		listY.current = window.scrollY;
		open(id);
	};
	const selId = sel?.p.id;
	useEffect(() => {
		if (window.matchMedia("(min-width: 1024px)").matches) return;
		const y = selId ? 0 : listY.current;
		if (!selId) listY.current = null;
		if (y == null) return;
		// after the router's own scroll handling for go("inbox") has run
		const raf = requestAnimationFrame(() => window.scrollTo({ top: y }));
		return () => cancelAnimationFrame(raf);
	}, [selId]);
	const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.length) upload([...e.target.files]);
		e.target.value = "";
	};

	// ---- batch approve / pay ------------------------------------------------
	const isApprover = ["controller", "approver"].includes(user.role);
	const kindOf = (v: PayoutView): BatchKind =>
		(v.status === "ready" || v.status === "awaiting_second_approver") &&
		isApprover &&
		!hasMemberApproved(v.m.approvals, user)
			? "approve"
			: v.status === "approved"
				? "pay"
				: null;
	const [picked, setPicked] = useState<string[]>([]);
	const [confirm, setConfirm] = useState<"approve" | "pay" | null>(null);
	const [running, setRunning] = useState(false);
	const [results, setResults] = useState<Record<string, BatchResult>>({});
	// Drop rows that moved on (or left the list) from the selection.
	const chosen = vs.filter((v) => picked.includes(v.p.id) && kindOf(v));
	const toApprove = chosen.filter((v) => kindOf(v) === "approve");
	const toPay = chosen.filter((v) => kindOf(v) === "pay");
	const eligible = vs.filter((v) => kindOf(v));
	const toggle = (id: string, on: boolean) =>
		setPicked((cur) =>
			on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id),
		);
	const runBatch = async (action: "approve" | "pay") => {
		const rows = action === "approve" ? toApprove : toPay;
		if (!rows.length) return;
		setRunning(true);
		const ack =
			action === "approve"
				? Object.fromEntries(rows.map((v) => [v.p.id, warnIds(v.plan.engine)]))
				: undefined;
		const out = await batch(
			action,
			rows.map((v) => v.p.id),
			ack,
		);
		setRunning(false);
		setConfirm(null);
		if (!out) return;
		setResults(Object.fromEntries(out.map((r) => [r.id, r])));
		const done = new Set(out.filter((r) => r.ok).map((r) => r.id));
		setPicked((cur) => cur.filter((id) => !done.has(id)));
	};
	const resultList = Object.values(results);
	const okN = resultList.filter((r) => r.ok).length;

	return (
		<main
			className={`page grid grid-cols-1 items-start gap-6 py-5 ${sel ? "lg:grid-cols-[minmax(0,1fr)_minmax(400px,min(40%,720px))]" : ""}`}
		>
			<section
				aria-labelledby="inbox-h"
				className={`${sel ? "hidden lg:flex" : "flex"} min-w-0 flex-col gap-4`}
			>
				<div className="flex flex-wrap items-center justify-between gap-2.5">
					<div className="flex items-baseline gap-2.5">
						<h1
							id="inbox-h"
							className="display m-0"
							style={{
								fontSize: 26,
							}}
						>
							Inbox
						</h1>
						<span className="text-ash-dim" style={{ fontSize: 14 }}>
							{s.loaded ? `${vs.length} payouts` : ""}
						</span>
					</div>
					<div className="flex flex-wrap gap-2">
						{s.loaded && (
							<>
								<input
									ref={uploadInput}
									type="file"
									accept="application/pdf"
									multiple
									onChange={pick}
									aria-label="Upload invoice PDFs"
									className="hidden"
								/>
								<button
									type="button"
									className="btn btn-primary btn-sm"
									onClick={() => uploadInput.current?.click()}
								>
									Upload invoice
								</button>
								<button
									type="button"
									className="btn btn-sm"
									onClick={() => openManual()}
								>
									Enter by hand
								</button>
							</>
						)}
						{s.loaded && (
							<details className="more-menu">
								<summary className="btn btn-sm" aria-label="Demo tools">
									<More size={16} />
									Demo tools
								</summary>
								<div className="more-pop right-0 left-auto">
									{!s.sus && (
										<button
											type="button"
											className="tab text-left"
											onClick={(event) => {
												event.currentTarget
													.closest("details")
													?.removeAttribute("open");
												addSuspicious();
											}}
										>
											Stage suspicious invoice
										</button>
									)}
									<button
										type="button"
										className="tab text-left"
										onClick={reset}
									>
										Reset demo
									</button>
								</div>
							</details>
						)}
					</div>
				</div>

				{s.manualEntry && <ManualInvoiceForm />}

				{!s.loaded && !s.loading && (
					// biome-ignore lint/a11y/noStaticElementInteractions: drop zone; keyboard users get the file input below
					<div
						className="flex flex-col items-center gap-3.5 rounded-[10px] bg-panel px-6 py-10 text-center"
						style={{ border: "2px dashed var(--color-edge-input)" }}
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => {
							e.preventDefault();
							if (e.dataTransfer.files?.length)
								upload([...e.dataTransfer.files]);
						}}
					>
						<FileUp color="var(--color-volt)" />
						<p className="m-0 font-semibold" style={{ fontSize: 18 }}>
							Drop an invoice or load the demo set
						</p>
						<p className="m-0 text-ash-dim" style={{ maxWidth: "52ch" }}>
							Start with four fictional suppliers, or upload a PDF. Corredor
							reads the invoice, checks it for suspicious instructions, and
							compares payment routes. Live PDF reading needs the local model;
							if it’s down, enter the invoice by hand.
						</p>
						<div className="flex flex-wrap justify-center gap-2">
							<input
								type="file"
								accept="application/pdf"
								multiple
								onChange={pick}
								aria-label="Choose invoice PDFs"
								className="hidden"
							/>
							<button
								type="button"
								className="btn"
								onClick={(e) =>
									(
										e.currentTarget.previousElementSibling as HTMLInputElement
									)?.click()
								}
							>
								Choose PDFs
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={loadDemo}
							>
								Load the 4 demo invoices
							</button>
							<button
								type="button"
								className="btn"
								onClick={() => openManual()}
							>
								Enter invoice by hand
							</button>
						</div>
					</div>
				)}

				{s.loading && (
					<div
						className="overflow-hidden rounded-lg border border-edge bg-panel"
						aria-busy="true"
					>
						{PAYOUTS.filter((p) => !p.hidden).map((p) => (
							<div
								key={p.id}
								className="grid items-center gap-4 border-b border-edge-soft p-4"
								style={{
									gridTemplateColumns:
										"minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)",
								}}
							>
								<div className="flex flex-col gap-1.5">
									<span className="mono" style={{ fontSize: 13 }}>
										{p.file}
									</span>
									<span className="text-ash-dim" style={{ fontSize: 13 }}>
										Reading invoice · scanning for injected instructions…
									</span>
								</div>
								<div className="skel" />
								<div className="skel" />
							</div>
						))}
					</div>
				)}

				{s.uploading.length > 0 && (
					<div
						className="overflow-hidden rounded-lg border border-edge bg-panel"
						aria-busy="true"
					>
						{s.uploading.map((name) => (
							<div
								key={name}
								className="grid items-center gap-4 border-b border-edge-soft p-4"
								style={{
									gridTemplateColumns:
										"minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)",
								}}
							>
								<div className="flex flex-col gap-1.5">
									<span className="mono" style={{ fontSize: 13 }}>
										{name}
									</span>
									<span className="text-ash-dim" style={{ fontSize: 13 }}>
										Reading invoice · local model extracting fields, injection
										scan…
									</span>
								</div>
								<div className="skel" />
								<div className="skel" />
							</div>
						))}
					</div>
				)}

				{s.loaded && (
					<>
						<InboxSummary vs={vs} />
						{eligible.length > 0 && (
							<div
								className="flex flex-wrap items-center gap-2"
								role="toolbar"
								aria-label="Batch actions"
							>
								<label
									className="flex items-center gap-2 text-ash"
									style={{ fontSize: 14 }}
								>
									<input
										type="checkbox"
										style={{ width: 18, height: 18 }}
										checked={chosen.length === eligible.length}
										onChange={(e) =>
											setPicked(
												e.target.checked ? eligible.map((v) => v.p.id) : [],
											)
										}
									/>
									{chosen.length
										? `${chosen.length} selected`
										: `Select all ${eligible.length} you can act on`}
								</label>
								<button
									type="button"
									className="btn btn-primary btn-sm"
									disabled={!toApprove.length || running}
									onClick={() => setConfirm("approve")}
								>
									{`Approve selected${toApprove.length ? ` (${toApprove.length})` : ""}`}
								</button>
								<button
									type="button"
									className="btn btn-sm"
									disabled={!toPay.length || running}
									onClick={() => setConfirm("pay")}
								>
									{`Pay selected${toPay.length ? ` (${toPay.length})` : ""}`}
								</button>
								{resultList.length > 0 && (
									<span className="text-ash" style={{ fontSize: 13.5 }}>
										{`Last batch: ${okN} done` +
											(resultList.length - okN
												? `, ${resultList.length - okN} failed (see rows)`
												: "")}
									</span>
								)}
							</div>
						)}

						{confirm && (
							<Card>
								<h2 className="m-0" style={{ fontSize: 16 }}>
									{confirm === "approve"
										? `Approve ${toApprove.length} payout${toApprove.length === 1 ? "" : "s"} as ${user.name}`
										: `Pay ${toPay.length} payout${toPay.length === 1 ? "" : "s"}`}
								</h2>
								{confirm === "approve" && (
									<p className="m-0 text-ash" style={{ fontSize: 14 }}>
										Approving accepts every rule warning listed below. Payouts
										over the threshold still need a second, different approver.
									</p>
								)}
								<div className="flex flex-col">
									{(confirm === "approve" ? toApprove : toPay).map((v) => {
										const warns =
											v.plan.engine?.results.filter((x) => x.o === "warn") ??
											[];
										return (
											<div
												key={v.p.id}
												className="flex flex-col gap-1 border-t border-edge-soft py-2"
												style={{ fontSize: 14 }}
											>
												<span>
													<strong className="font-semibold">{v.p.payee}</strong>
													{` · ${local(v.p)} · ${rname(v.plan.engine)}`}
												</span>
												{confirm === "pay" && (
													<span className="text-ash-dim">{payLabel(v)}</span>
												)}
												{confirm === "approve" &&
													(warns.length ? (
														warns.map((w) => (
															<span
																key={w.rule.id}
																style={{ color: "var(--color-amber)" }}
															>
																{`Accepting ${w.rule.id}: ${w.msg}`}
															</span>
														))
													) : (
														<span className="text-ash-dim">
															No rule warnings on this route.
														</span>
													))}
											</div>
										);
									})}
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<button
										type="button"
										className="btn btn-primary btn-sm"
										disabled={running}
										onClick={() => runBatch(confirm)}
									>
										{running
											? "Working…"
											: confirm === "approve"
												? "Approve and accept these warnings"
												: "Confirm payments"}
									</button>
									<button
										type="button"
										className="btn btn-sm"
										disabled={running}
										onClick={() => setConfirm(null)}
									>
										Cancel
									</button>
									{confirm === "pay" && (
										<span className="pill p-muted">Simulated rail</span>
									)}
								</div>
							</Card>
						)}

						<div className="@container overflow-hidden rounded-lg border border-edge bg-panel">
							<div role="table" aria-label="Payouts">
								<div
									role="row"
									className="hidden @min-[680px]:grid grid-cols-[minmax(0,2fr)_minmax(160px,1fr)_minmax(180px,1fr)] gap-4 bg-head"
									style={{ padding: "10px 16px" }}
								>
									<span role="columnheader" className="lab">
										Payee
									</span>
									<span
										role="columnheader"
										className="lab hidden @min-[920px]:block"
									>
										Route
									</span>
									<span role="columnheader" className="lab">
										Amount
									</span>
									<span role="columnheader" className="lab">
										Status
									</span>
								</div>

								{vs.map((v) => {
									const { p, plan, status } = v;
									const invNo = eff(p, v.m).inv.number;
									const kind = kindOf(v);
									const res = results[p.id];
									return (
										// biome-ignore lint/a11y/useKeyWithClickEvents: the payee button inside is the keyboard path; the row click is a pointer shortcut
										<div
											key={p.id}
											role="row"
											className={
												"grid grid-cols-[minmax(0,1fr)_auto] @min-[680px]:grid-cols-[minmax(0,2fr)_minmax(160px,1fr)_minmax(180px,1fr)] @min-[920px]:grid-cols-[minmax(0,2fr)_minmax(200px,1.2fr)_minmax(150px,1fr)_minmax(170px,1fr)] items-center gap-x-4 gap-y-2 border-t border-edge-soft px-4 py-5 cursor-pointer hover:bg-raise" +
												(s.selected === p.id ? " bg-raise" : "") +
												(s.flashId === p.id ? " flash" : "")
											}
											onClick={() => openRow(p.id)}
										>
											<div
												role="cell"
												className="flex min-w-0 items-center gap-2.5"
											>
												{eligible.length > 0 &&
													(kind ? (
														<input
															type="checkbox"
															aria-label={`Select ${p.payee} to ${kind}`}
															style={{ width: 18, height: 18, flex: "none" }}
															checked={picked.includes(p.id)}
															onClick={(e) => e.stopPropagation()}
															onChange={(e) => toggle(p.id, e.target.checked)}
														/>
													) : (
														<span
															aria-hidden="true"
															style={{ width: 18, flex: "none" }}
														/>
													))}
												<Cc code={p.c} label={p.country} />
												<div className="flex min-w-0 flex-col">
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															openRow(p.id);
														}}
														className="border-0 bg-none p-0 text-left font-semibold text-bone"
														style={{ background: "none", fontSize: 15 }}
													>
														{p.payee}
													</button>
													<span
														className="text-ash-dim"
														style={{ fontSize: 12.5 }}
													>
														{invNo}
													</span>
													<span className="mt-1 @min-[920px]:hidden">
														<RouteTag rec={plan.rec} />
													</span>
												</div>
											</div>

											<div
												role="cell"
												className="hidden min-w-0 @min-[920px]:flex"
											>
												<RouteTag rec={plan.rec} />
											</div>

											<div
												role="cell"
												className="flex flex-col items-end @min-[680px]:items-start"
											>
												<span
													className="font-medium"
													style={{ fontVariantNumeric: "tabular-nums" }}
												>
													{local(p)}
												</span>
												{p.cur !== "USD" && (
													<span
														className="text-ash-dim"
														style={{
															fontSize: 12.5,
															fontVariantNumeric: "tabular-nums",
														}}
													>
														{`≈ ${usd(p.usd)}`}
													</span>
												)}
											</div>

											<div
												role="cell"
												className="col-span-2 @min-[680px]:col-span-1 flex flex-wrap items-center gap-2"
											>
												<StatusPill status={status} />
												{(plan.rec?.warns ?? 0) > 0 && (
													<span className="text-xs text-ash">
														{plan.rec?.warns}{" "}
														{plan.rec?.warns === 1 ? "warning" : "warnings"}
													</span>
												)}
												{res && (
													<span
														className="basis-full"
														style={{
															fontSize: 12.5,
															color: res.ok
																? "var(--color-volt)"
																: "var(--color-coral)",
														}}
													>
														{res.ok
															? `Batch: done${res.status ? ` · now ${res.status.replace(/_/g, " ")}` : ""}`
															: `Batch: ${res.error?.message ?? "failed"}`}
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ash">
							<span>
								Open a payout to review its route, rules and next step.
							</span>
							{pending.length > 0 && (
								<button
									type="button"
									className="border-0 bg-transparent p-0 text-volt underline underline-offset-4"
									onClick={() => go("agent")}
								>
									{pending.length} pending{" "}
									{pending.length === 1 ? "proposal" : "proposals"} in Agent
								</button>
							)}
						</div>
					</>
				)}
			</section>

			{sel && (
				// lg+: the pane stays in view beside a long list and scrolls on its own
				<div className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-[10px]">
					{/* below lg the pane replaces the list: the way back stays pinned */}
					<div
						className="sticky top-0 z-10 mb-3 flex items-center gap-3 py-2 lg:hidden"
						style={{
							marginInline: "calc(-1 * var(--gutter))",
							paddingInline: "var(--gutter)",
							background:
								"color-mix(in oklab, var(--color-void) 88%, transparent)",
							backdropFilter: "blur(8px)",
						}}
					>
						<button
							type="button"
							className="btn btn-sm flex-none"
							onClick={closeDetail}
						>
							<span aria-hidden="true">←</span> Back to payouts
						</button>
						<span
							className="min-w-0 truncate text-ash-dim"
							style={{ fontSize: 13.5 }}
						>
							{sel.p.payee}
						</span>
					</div>
					<DetailPane v={sel} />
				</div>
			)}
		</main>
	);
}

/** What the agents have teed up: counts that tick up, money that rides on them. */
function InboxSummary({ vs }: { vs: PayoutView[] }) {
	const of = (...st: string[]) => vs.filter((v) => st.includes(v.status));
	const sum = (list: PayoutView[]) => list.reduce((t, v) => t + v.p.usd, 0);
	const ready = of("ready");
	const second = of("awaiting_second_approver");
	const stopped = of("security_hold", "blocked");
	const open = vs.filter(
		(v) => !["paid", "booked", "rejected"].includes(v.status),
	);
	const saving = open.reduce((t, v) => t + wireSaving(v), 0);
	return (
		<KpiRow
			label="Inbox summary"
			kpis={[
				{
					label: "Ready for you",
					value: ready.length,
					format: count,
					sub: `${usd0(sum(ready))} routed and checked by the agents`,
				},
				{
					label: "Awaiting 2nd approver",
					value: second.length,
					format: count,
					sub: second.length
						? `${usd0(sum(second))} over the approval threshold`
						: "Nothing over the threshold",
				},
				{
					label: "Stopped by agents",
					value: stopped.length,
					format: count,
					sub: stopped.length
						? `${usd0(sum(stopped))} held or blocked before release`
						: "Every payout cleared screening",
					tone: "coral",
				},
				{
					label: "Routing saves",
					value: saving,
					format: usd0,
					sub: `vs SWIFT on ${open.length} open payouts`,
					tone: "jade",
				},
			]}
		/>
	);
}
