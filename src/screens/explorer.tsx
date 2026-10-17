import { useState } from "react";
import { Check, Swap } from "@/components/icons";
import { views } from "@/domain/engine";
import { num, usd } from "@/domain/format";
import { remotePayouts } from "@/domain/remote";
import { filterTransactions, transactionsFrom } from "@/domain/transactions";
import { useStore } from "@/state/store";

export function ExplorerSection() {
	const { state, open, go, refresh } = useStore();
	const [query, setQuery] = useState("");
	const [network, setNetwork] = useState("");
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState("");
	const transactions = transactionsFrom(
		remotePayouts() ? views(state) : [],
		state.events,
	);
	const networks = [...new Set(transactions.map((t) => t.network))].sort();
	const filtered = filterTransactions(transactions, query, network);
	const reload = async () => {
		setRefreshing(true);
		setError("");
		try {
			await refresh();
		} catch {
			setError(
				"Transactions couldn't be refreshed. Your last loaded records are still here. Try again.",
			);
		} finally {
			setRefreshing(false);
		}
	};

	return (
		<section aria-labelledby="explorer-h" className="flex flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-2">
					<h1 id="explorer-h" className="display m-0" style={{ fontSize: 30 }}>
						Transaction explorer
					</h1>
					<p className="m-0 text-ash" style={{ maxWidth: "65ch" }}>
						Follow your payments, from approval to the books.
					</p>
				</div>
				<button
					className="btn btn-sm"
					type="button"
					disabled={refreshing}
					onClick={reload}
				>
					<Swap /> {refreshing ? "Refreshing..." : "Refresh"}
				</button>
			</div>

			<p className="explorer-notice">
				Simulated payments are demo receipts, not on-chain transactions. Bank
				wires appear here too. No block or confirmation data is available.
			</p>
			{error && (
				<p className="m-0 text-coral" role="alert">
					{error}
				</p>
			)}
			<div className="explorer-filters">
				<label
					className="flex min-w-0 flex-1 flex-col gap-2"
					htmlFor="transaction-search"
				>
					<span className="lab">Find a transaction</span>
					<input
						id="transaction-search"
						type="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Payee, invoice, transaction hash or reference"
					/>
				</label>
				<label className="flex flex-col gap-2" htmlFor="transaction-network">
					<span className="lab">Network</span>
					<select
						id="transaction-network"
						value={network}
						onChange={(e) => setNetwork(e.target.value)}
					>
						<option value="">All networks & rails</option>
						{networks.map((name) => (
							<option key={name} value={name}>
								{name}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="text-ash" role="status" style={{ fontSize: 13 }}>
				{`${filtered.length} of ${transactions.length} payments`}
			</div>
			{transactions.length === 0 ? (
				<div className="explorer-empty">
					<h2 className="m-0 display" style={{ fontSize: 22 }}>
						Your first payment will appear here
					</h2>
					<p className="m-0 text-ash">
						Review an invoice and send an approved payment from the inbox.
					</p>
					<div>
						<button type="button" className="btn" onClick={() => go("inbox")}>
							Go to inbox
						</button>
					</div>
				</div>
			) : filtered.length === 0 ? (
				<div className="explorer-empty">
					<h2 className="m-0" style={{ fontSize: 18 }}>
						No matching transactions
					</h2>
					<p className="m-0 text-ash">
						Try another payee or reference, or clear your filters.
					</p>
					<div>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => {
								setQuery("");
								setNetwork("");
							}}
						>
							Clear filters
						</button>
					</div>
				</div>
			) : (
				<div className="explorer-list">
					<div className="explorer-row explorer-columns" aria-hidden="true">
						<span>Payment</span>
						<span>Network / rail</span>
						<span>Amount</span>
						<span>Receipt</span>
					</div>
					{filtered.map((t) => (
						<details className="explorer-transaction" key={t.id}>
							<summary className="explorer-row">
								<span className="flex min-w-0 flex-col gap-1">
									<strong className="font-semibold">{t.payee}</strong>
									<span className="mono text-ash" style={{ fontSize: 12 }}>
										{t.invoice}
									</span>
								</span>
								<span className="flex flex-col gap-1">
									<span>{t.network}</span>
									<span className="text-ash" style={{ fontSize: 12 }}>
										{t.asset || "Bank transfer"}
									</span>
								</span>
								<span className="flex flex-col gap-1">
									<span className="mono">
										{num(t.amount)} {t.currency}
									</span>
									{t.currency !== "USD" && (
										<span className="text-ash" style={{ fontSize: 12 }}>
											{usd(t.usd)} equivalent
										</span>
									)}
								</span>
								<span className="flex flex-wrap items-center gap-2">
									<span className="pill p-muted">
										{t.payment.railMode === "mock" ? "Simulated" : "Recorded"}
									</span>
									{t.booked && (
										<span className="explorer-booked">
											<Check /> Booked
										</span>
									)}
								</span>
							</summary>
							<div className="explorer-receipt">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<h2 className="m-0" style={{ fontSize: 17 }}>
										Payment receipt
									</h2>
									<button
										type="button"
										className="btn btn-sm"
										onClick={() => open(t.id)}
									>
										Open invoice
									</button>
								</div>
								<p className="m-0 text-ash">{t.route}</p>
								{t.payment.railMode === "mock" && (
									<p className="m-0 text-ash" style={{ fontSize: 13 }}>
										These references are simulated. No funds moved on a
										blockchain.
									</p>
								)}
								<dl className="explorer-references">
									{t.payment.txHash && (
										<Reference
											label={
												t.network === "Bank wire"
													? "Wire reference"
													: "Transaction hash"
											}
											value={t.payment.txHash}
										/>
									)}
									{t.payment.offrampRef && (
										<Reference
											label="Off-ramp reference"
											value={t.payment.offrampRef}
										/>
									)}
									<Reference
										label={`${t.payment.railName} reference`}
										value={t.payment.railRef}
									/>
									<Reference label="Payout ID" value={t.id} />
								</dl>
								<details className="disc">
									<summary>
										Payment activity · {t.events.length} recorded events
									</summary>
									<p className="m-0 text-ash" style={{ fontSize: 13 }}>
										Application audit events, not blockchain blocks.
									</p>
									<ol className="explorer-activity">
										{t.events.map((event) => (
											<li key={event.seq}>
												<span
													className="mono text-ash"
													style={{ fontSize: 12 }}
												>
													#{event.seq} · {event.time}
												</span>
												<span>{event.summary}</span>
											</li>
										))}
									</ol>
								</details>
							</div>
						</details>
					))}
				</div>
			)}
		</section>
	);
}

function Reference({ label, value }: { label: string; value: string }) {
	const [message, setMessage] = useState("");
	return (
		<div>
			<dt className="lab">{label}</dt>
			<dd>
				<code>{value || "Not available"}</code>
				{value && (
					<button
						type="button"
						className="btn btn-sm"
						aria-label={`Copy ${label.toLowerCase()}`}
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(value);
								setMessage("Copied");
							} catch {
								setMessage("Select and copy the reference manually.");
							}
						}}
					>
						Copy
					</button>
				)}
			</dd>
			{message && (
				<span role="status" className="text-ash" style={{ fontSize: 12 }}>
					{message}
				</span>
			)}
		</div>
	);
}
