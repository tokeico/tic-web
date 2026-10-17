import { useRef } from "react";
import { DetailPane } from "@/components/DetailPane";
import { FileUp, More } from "@/components/icons";
import { Cc, Chip, PAGE_MAX_W, StatusPill } from "@/components/ui";
import { PAYOUTS } from "@/domain/data";
import { eff, views } from "@/domain/engine";
import { local, usd } from "@/domain/format";
import { useStore } from "@/state/store";

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
		go,
	} = store;
	const uploadInput = useRef<HTMLInputElement>(null);
	const s = state;
	const vs = s.loaded ? views(s) : [];
	const sel = vs.find((v) => v.p.id === s.selected);
	const pending = s.actions.filter((a) => a.status === "pending");
	const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.length) upload([...e.target.files]);
		e.target.value = "";
	};

	return (
		<main
			className={`mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-6 p-5 ${sel ? "lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]" : ""}`}
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
							</>
						)}
						{s.loaded && (
							<details className="more-menu">
								<summary className="btn btn-sm" aria-label="Demo tools">
									<More size={16} />
									Demo tools
								</summary>
								<div className="more-pop">
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
							compares payment routes. Live PDF reading needs the local model.
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
						<div className="@container overflow-hidden rounded-lg border border-edge bg-panel">
							<div role="table" aria-label="Payouts">
								<div
									role="row"
									className="hidden @min-[680px]:grid grid-cols-[minmax(0,1fr)_160px_180px] gap-4 bg-head"
									style={{ padding: "10px 16px" }}
								>
									<span role="columnheader" className="lab">
										Payee
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
									return (
										// biome-ignore lint/a11y/useKeyWithClickEvents: the payee button inside is the keyboard path; the row click is a pointer shortcut
										<div
											key={p.id}
											role="row"
											className={
												"grid grid-cols-[minmax(0,1fr)_auto] @min-[680px]:grid-cols-[minmax(0,1fr)_160px_180px] items-center gap-x-4 gap-y-2 border-t border-edge-soft px-4 py-5 cursor-pointer hover:bg-raise" +
												(s.selected === p.id ? " bg-raise" : "") +
												(s.flashId === p.id ? " flash" : "")
											}
											onClick={() => open(p.id)}
										>
											<div
												role="cell"
												className="flex min-w-0 items-center gap-2.5"
											>
												<Cc code={p.c} label={p.country} />
												<div className="flex min-w-0 flex-col">
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															open(p.id);
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
												</div>
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
				<div className="min-w-0">
					<button
						type="button"
						className="btn btn-sm mb-4 lg:hidden"
						onClick={closeDetail}
					>
						Back to payouts
					</button>
					<DetailPane v={sel} />
				</div>
			)}
		</main>
	);
}
