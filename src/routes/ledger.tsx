import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { IcBad, IcCheck } from "../components/icons";
import { H1 } from "../components/ui";
import { ledgerCsvUrl, ledgerQuery } from "../lib/api";
import { formatDate, formatNum } from "../lib/format";
import { st } from "../lib/st";
import { useActions } from "../lib/use-actions";
import { RAIL_NAME } from "../lib/view";

export const Route = createFileRoute("/ledger")({ component: Ledger });

function Ledger() {
	const actions = useActions();
	const { data: entries = [], error } = useQuery(ledgerQuery);
	return (
		<main
			style={st(
				"max-width:1440px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:14px",
			)}
		>
			<div
				style={st(
					"display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px",
				)}
			>
				<H1>Ledger</H1>
				<a
					className="btn"
					href={ledgerCsvUrl}
					download
					title="QuickBooks journal import format"
				>
					Export CSV
				</a>
			</div>
			{error && (
				<div className="card">Couldn’t load the ledger: {error.message}</div>
			)}
			{entries.length === 0 && !error && (
				<div className="card" style={st("align-items:flex-start")}>
					<p style={st("margin:0;font-weight:600")}>Nothing booked yet</p>
					<p style={st("margin:0;color:#56655f")}>
						Approve, pay and reconcile a payout from the inbox or the agent’s
						queue. Its journal entry lands here.
					</p>
					<button
						type="button"
						className="btn"
						onClick={() => actions.go("/inbox")}
					>
						Go to inbox
					</button>
				</div>
			)}
			{entries.map((je) => {
				const ok = je.match.status === "matched";
				return (
					<div key={je.id} className="card">
						<div
							style={st(
								"display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap",
							)}
						>
							<div style={st("display:flex;flex-direction:column;gap:2px")}>
								<span style={st("font-weight:600;font-size:16px")}>
									{je.payeeName}
								</span>
								<span
									className="mono"
									style={st("font-size:12.5px;color:#56655f")}
								>
									JE-{je.entryDate.slice(0, 7)}-
									{je.id.slice(0, 4).toUpperCase()} · {formatDate(je.entryDate)}{" "}
									· {je.routeLabel}
								</span>
							</div>
							<span className={`pill ${ok ? "p-ok" : "p-bad"}`}>
								{ok ? <IcCheck /> : <IcBad />}
								{ok ? "Matched" : "Exception"}
							</span>
						</div>
						<div style={st("overflow-x:auto")}>
							<div
								role="table"
								aria-label="Journal lines"
								style={st("min-width:520px")}
							>
								<div
									role="row"
									style={st(
										"display:grid;grid-template-columns:minmax(0,1fr) 140px 140px;gap:12px;padding:8px 0;border-bottom:1px solid #d6dfdb",
									)}
								>
									<span role="columnheader" className="lab">
										Account
									</span>
									<span
										role="columnheader"
										className="lab"
										style={st("text-align:right")}
									>
										Debit (USD)
									</span>
									<span
										role="columnheader"
										className="lab"
										style={st("text-align:right")}
									>
										Credit (USD)
									</span>
								</div>
								{je.lines.map((l) => (
									<div
										key={l.lineNo}
										role="row"
										style={st(
											"display:grid;grid-template-columns:minmax(0,1fr) 140px 140px;gap:12px;padding:8px 0;border-bottom:1px solid #e1e8e5;font-size:14px",
										)}
									>
										<span role="cell">{l.account}</span>
										<span
											role="cell"
											className="mono"
											style={st("text-align:right")}
										>
											{l.debit ? formatNum(l.debit) : ""}
										</span>
										<span
											role="cell"
											className="mono"
											style={st("text-align:right")}
										>
											{l.credit ? formatNum(l.credit) : ""}
										</span>
									</div>
								))}
							</div>
						</div>
						<span style={st("font-size:13px;color:#56655f")}>
							{ok
								? `Invoice ${je.invoiceNumber} ↔ ${(je.match.txHash ?? "no tx").slice(0, 14)}… ↔ ${RAIL_NAME[je.match.rail]} ${(je.match.railRef ?? "").slice(0, 12)}…`
								: (je.match.reason ?? "Exception")}
						</span>
					</div>
				);
			})}
		</main>
	);
}
