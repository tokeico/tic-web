import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IcUpload } from "../components/icons";
import { PayoutPanel } from "../components/PayoutPanel";
import { Cc, H1, StatusPill } from "../components/ui";
import { useAgent } from "../lib/agent";
import { payoutsQuery } from "../lib/api";
import { useDemo } from "../lib/demo-store";
import { formatLocal, formatUsd } from "../lib/format";
import { inboxSearch } from "../lib/search";
import { st } from "../lib/st";
import { useActions } from "../lib/use-actions";
import {
	COUNTRY_NAME,
	recommendedEval,
	routeLabel,
	warnCount,
} from "../lib/view";

export const Route = createFileRoute("/inbox")({
	validateSearch: inboxSearch,
	component: Inbox,
});

function Inbox() {
	const { payout: selectedId } = Route.useSearch();
	const navigate = useNavigate({ from: "/inbox" });
	const actions = useActions();
	const agent = useAgent();
	const payouts = useQuery(payoutsQuery);
	const loadingDemo = useDemo((s) => s.loading);
	const flashId = useDemo((s) => s.flashId);
	const pending = useDemo(
		(s) => s.actions.filter((a) => a.status === "pending").length,
	);

	const list = payouts.data ?? [];
	const loaded = list.length > 0 && list.every((p) => p.status !== "draft");
	const isEmpty = !payouts.isPending && !loaded && !loadingDemo;
	const selected = list.find((p) => p.id === selectedId);

	const select = (id: string | undefined) =>
		navigate({ search: (p) => ({ ...p, payout: id }) });

	return (
		<main
			style={st(
				"max-width:1440px;margin:0 auto;padding:20px;display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start",
			)}
		>
			<section
				aria-labelledby="inbox-h"
				style={st(
					"flex:999 1 620px;min-width:0;display:flex;flex-direction:column;gap:14px",
				)}
			>
				<div
					style={st(
						"display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px",
					)}
				>
					<div style={st("display:flex;align-items:baseline;gap:10px")}>
						<H1 id="inbox-h">Payouts inbox</H1>
						<span style={st("color:#56655f;font-size:14px")}>
							{loaded ? `${list.length} payouts` : ""}
						</span>
					</div>
					<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
						{pending > 0 && (
							<button
								type="button"
								className="btn"
								onClick={() => actions.go("/agent")}
							>
								{pending} waiting in the agent queue
							</button>
						)}
						{loaded && (
							<button
								type="button"
								className="btn"
								onClick={() => actions.resetDemo()}
							>
								Reset demo
							</button>
						)}
					</div>
				</div>

				{payouts.error && (
					<div
						role="alert"
						className="ack"
						style={st("background:#fdf3f2;border-color:#e3b9b4")}
					>
						<span>
							<strong>Can’t reach the API.</strong> {payouts.error.message} Is
							tic-api running?
						</span>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => payouts.refetch()}
						>
							Retry
						</button>
					</div>
				)}

				{isEmpty && (
					<div
						style={st(
							"border:2px dashed #b9c8c2;border-radius:10px;background:#ffffff;padding:40px 24px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center",
						)}
					>
						<IcUpload />
						<p style={st("margin:0;font-size:18px;font-weight:600")}>
							Drop an invoice or load the demo set
						</p>
						<p style={st("margin:0;color:#56655f;max-width:52ch")}>
							Dropping a PDF will go to POST /api/invoices and the local model
							will extract the fields. For now this runs on the seeded invoices.
						</p>
						<button
							type="button"
							className="btn btn-primary"
							onClick={async () => {
								if (list.length === 0) await actions.resetDemo();
								await actions.loadDemo();
							}}
						>
							Load the 4 demo invoices
						</button>
					</div>
				)}

				{loadingDemo && (
					<div
						style={st(
							"background:#ffffff;border:1px solid #d6dfdb;border-radius:8px;overflow:hidden",
						)}
						aria-busy="true"
					>
						{(list.length ? list : [null, null, null, null]).map((p, i) => (
							<div
								key={p?.id ?? i}
								style={st(
									"display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:center;padding:16px;border-bottom:1px solid #e1e8e5",
								)}
							>
								<div style={st("display:flex;flex-direction:column;gap:6px")}>
									<span className="mono" style={st("font-size:13px")}>
										{p ? `${p.payeeName}` : "invoice.pdf"}
									</span>
									<span style={st("font-size:13px;color:#56655f")}>
										Reading invoice · scanning for injected instructions…
									</span>
								</div>
								<div className="skel" />
								<div className="skel" />
							</div>
						))}
					</div>
				)}

				{loaded && !loadingDemo && (
					<>
						<div
							style={st(
								"background:#ffffff;border:1px solid #d6dfdb;border-radius:8px;overflow-x:auto",
							)}
						>
							<div
								role="table"
								aria-label="Payouts"
								style={st("min-width:820px")}
							>
								<div
									role="row"
									className="row"
									style={st(
										"padding-top:10px;padding-bottom:10px;background:#f7f9f8",
									)}
								>
									{["Payee", "Amount", "Route", "Status", "Warnings"].map(
										(h) => (
											<span key={h} role="columnheader" className="lab">
												{h}
											</span>
										),
									)}
									<span role="columnheader" className="lab">
										<span className="sr-only">Open</span>
									</span>
								</div>
								{list.map((p) => {
									const warns = warnCount(recommendedEval(p.plan));
									return (
										<div
											key={p.id}
											role="row"
											className={`row${selectedId === p.id ? " row-sel" : ""}${flashId === p.id ? " flash" : ""}`}
										>
											<div
												role="cell"
												style={st(
													"display:flex;align-items:center;gap:10px;min-width:0",
												)}
											>
												<Cc country={p.country} />
												<div
													style={st(
														"display:flex;flex-direction:column;min-width:0",
													)}
												>
													<button
														type="button"
														onClick={() => select(p.id)}
														style={st(
															"border:0;background:none;padding:0;text-align:left;font-weight:600;color:#13201c;font-size:15px",
														)}
													>
														{p.payeeName}
													</button>
													<span style={st("font-size:12.5px;color:#56655f")}>
														{COUNTRY_NAME[p.country]} ·{" "}
														{p.invoice.invoiceNumber}
													</span>
												</div>
											</div>
											<div
												role="cell"
												style={st("display:flex;flex-direction:column")}
											>
												<span
													style={st(
														"font-variant-numeric:tabular-nums;font-weight:500",
													)}
												>
													{formatLocal(p.amountLocal, p.currency)}
												</span>
												{p.currency !== "USD" && (
													<span
														style={st(
															"font-size:12.5px;color:#56655f;font-variant-numeric:tabular-nums",
														)}
													>
														≈ {formatUsd(p.amountUsd)}
													</span>
												)}
											</div>
											<div
												role="cell"
												style={st(
													"display:flex;flex-direction:column;align-items:flex-start;gap:4px",
												)}
											>
												{p.plan?.recommended ? (
													<span className="chip">
														{routeLabel(p.plan.recommended)}
													</span>
												) : (
													<span style={st("font-size:13.5px;color:#922b24")}>
														No compliant route
													</span>
												)}
											</div>
											<div role="cell">
												<StatusPill status={p.status} />
											</div>
											<div role="cell">
												{warns > 0 ? (
													<span className="pill p-warn">
														{warns} {warns === 1 ? "warning" : "warnings"}
													</span>
												) : (
													<span style={st("color:#7a8a84")}>—</span>
												)}
											</div>
											<div role="cell" style={st("text-align:right")}>
												<button
													type="button"
													className="btn btn-sm"
													onClick={() => select(p.id)}
													aria-label={`Open ${p.payeeName} ${p.invoice.invoiceNumber}`}
												>
													Open
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</div>
						<p style={st("margin:0;font-size:13px;color:#56655f")}>
							Move the as-of date: the rules engine re-checks every open payout
							and picks the best compliant route for that day. Try Sep 30 → Oct
							1 → Oct 31 with Estúdio Paulista open.
						</p>
					</>
				)}
			</section>

			{loaded && selected && (
				<PayoutPanel
					d={selected}
					onClose={() => select(undefined)}
					onAsk={(t) => agent.ask(t, { view: "agent" })}
				/>
			)}
		</main>
	);
}
