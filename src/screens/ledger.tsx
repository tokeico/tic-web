import { Check } from "@/components/icons";
import { Card, Lab } from "@/components/ui";
import { eff, views } from "@/domain/engine";
import { fmtDate, num } from "@/domain/format";
import { ledgerCsvUrl } from "@/lib/api";
import { useStore } from "@/state/store";

/**
 * Booked journal entries: AP, fees, cash and the FX line, each matched to the
 * on-chain reference and the local rail reference.
 */
export function LedgerSection() {
	const { state: s, go } = useStore();
	const vs = s.loaded ? views(s) : [];
	const journal = vs
		.filter((v) => v.m.journal)
		.map((v) => ({
			id: v.m.journal!.id,
			payee: v.p.payee,
			date: fmtDate(v.m.lockedIso || ""),
			route: v.m.journal!.route,
			lines: v.m.journal!.lines,
			match:
				"Invoice " +
				eff(v.p, v.m).inv.number +
				" ↔ " +
				v.m.payment!.txHash.slice(0, 14) +
				"… ↔ " +
				v.m.payment!.railName +
				" " +
				v.m.payment!.railRef.slice(0, 12) +
				"…",
		}));

	return (
		<section
			id="ledger"
			aria-labelledby="ledger-h"
			className="flex scroll-mt-20 flex-col gap-4"
		>
			<div className="flex flex-wrap items-center justify-between gap-2.5">
				<h2
					id="ledger-h"
					className="display m-0"
					style={{
						fontSize: 26,
					}}
				>
					Ledger
				</h2>
				<a className="btn" href={ledgerCsvUrl}>
					Export CSV
				</a>
			</div>

			{journal.length === 0 && (
				<Card>
					<p className="m-0 font-semibold" style={{ fontSize: 16 }}>
						Nothing booked yet
					</p>
					<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
						Approve, pay and reconcile a payout from the inbox or the agent’s
						queue. Its journal entry lands here.
					</p>
					<div>
						<button type="button" className="btn" onClick={() => go("inbox")}>
							Go to inbox
						</button>
					</div>
				</Card>
			)}

			{journal.length > 0 && (
				<div className="ledger-list">
					{journal.map((je) => (
						<Card key={je.id}>
							<div className="flex flex-wrap items-start justify-between gap-2.5">
								<div className="flex min-w-0 flex-col gap-0.5">
									<span className="font-semibold" style={{ fontSize: 16 }}>
										{je.payee}
									</span>
									<span
										className="mono text-ash-dim [overflow-wrap:anywhere]"
										style={{ fontSize: 12.5 }}
									>
										{`${je.id} · ${je.date} · ${je.route}`}
									</span>
								</div>
								<span className="pill p-ok">
									<Check />
									Matched
								</span>
							</div>

							{/* je-table / je-row: columns live in styles.css so the
							    lines reflow on a narrow card instead of scrolling */}
							<div role="table" aria-label="Journal lines" className="je-table">
								<div
									role="row"
									className="je-row border-b border-edge-soft pb-1.5"
								>
									<span role="columnheader">
										<Lab>Account</Lab>
									</span>
									<span role="columnheader" className="text-right">
										<Lab>Debit (USD)</Lab>
									</span>
									<span role="columnheader" className="text-right">
										<Lab>Credit (USD)</Lab>
									</span>
								</div>
								{je.lines.map((ln) => (
									<div
										key={ln.acct}
										role="row"
										className="je-row border-b border-edge-soft py-2"
										style={{ fontSize: 14 }}
									>
										<span role="cell">{ln.acct}</span>
										<span
											role="cell"
											className="mono text-right"
											style={{ fontVariantNumeric: "tabular-nums" }}
										>
											{ln.dr == null ? "" : num(ln.dr)}
										</span>
										<span
											role="cell"
											className="mono text-right"
											style={{ fontVariantNumeric: "tabular-nums" }}
										>
											{ln.cr == null ? "" : num(ln.cr)}
										</span>
									</div>
								))}
							</div>

							<span
								className="mt-auto text-ash-dim [overflow-wrap:anywhere]"
								style={{ fontSize: 13 }}
							>
								{je.match}
							</span>
						</Card>
					))}
				</div>
			)}
		</section>
	);
}
