import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { IcLock } from "../components/icons";
import { H1 } from "../components/ui";
import { offrampsQuery, rulesQuery, settingsQuery } from "../lib/api";
import type { Objective } from "../lib/contracts";
import { type Autonomy, setDemo, useDemo } from "../lib/demo-store";
import { formatDate, formatUsd0 } from "../lib/format";
import { st } from "../lib/st";
import { useActions } from "../lib/use-actions";
import { TYPE_LONG } from "../lib/view";

export const Route = createFileRoute("/customize")({ component: Customize });

const AUTONOMY: [Autonomy, string, string][] = [
	["suggest", "Suggest only", "Answers and explains. Never queues actions."],
	[
		"prepare",
		"Prepare for approval",
		"Queues action cards. You confirm each one.",
	],
	[
		"auto",
		"Auto-run low-risk",
		"Applies low-risk steps itself, like moving the demo clock. Everything else still waits for you.",
	],
];
const OBJECTIVES: [Objective, string, string][] = [
	[
		"cheapest",
		"Cheapest compliant",
		"Lowest fee among routes that pass every rule.",
	],
	[
		"fastest",
		"Fastest compliant",
		"Shortest settlement time; fee breaks ties.",
	],
	[
		"safest",
		"Fewest warnings",
		"Avoids routes that carry rule warnings, then lowest fee.",
	],
];
const THRESHOLDS = [25_000, 50_000, 100_000];
const CAPS = [100_000, 150_000, 250_000];
const LOCKED = [
	"Payments always need a person to confirm. The agent can prepare a payment, never send one.",
	"Above the threshold, two different people must approve. The same person can’t approve twice.",
	"Sanctions blocks lift only with a named license and a compliance sign-off.",
	"Every agent proposal that a person confirms, and every human decision, is written to the hash-chained audit log.",
];

function Customize() {
	const actions = useActions();
	const settings = useQuery(settingsQuery).data;
	const offramps = useQuery(offrampsQuery).data ?? [];
	const rules = useQuery(rulesQuery).data ?? [];
	const autonomy = useDemo((s) => s.autonomy);
	const requireAck = useDemo((s) => s.requireAck);
	const policy = settings?.policy;

	const seg = (on: boolean) => `seg${on ? " seg-on" : ""}`;
	const jmp = (on: boolean) => `jump${on ? " jump-on" : ""}`;

	return (
		<main
			style={st(
				"max-width:1100px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:16px",
			)}
		>
			<div style={st("display:flex;flex-direction:column;gap:4px")}>
				<H1>Customize</H1>
				<p style={st("margin:0;color:#56655f;font-size:14px;max-width:80ch")}>
					Every change re-runs the rules on open payouts and is written to the
					audit log. Changes that reroute a payout show the same notice as the
					date bar.
				</p>
			</div>

			<div className="card">
				<h2 style={st("margin:0;font-size:17px")}>Agent autonomy</h2>
				<div
					role="group"
					aria-label="Agent autonomy"
					style={st("display:flex;gap:8px;flex-wrap:wrap")}
				>
					{AUTONOMY.map(([val, label, desc]) => (
						<button
							key={val}
							type="button"
							className={seg(autonomy === val)}
							aria-pressed={autonomy === val}
							onClick={() => setDemo({ autonomy: val })}
						>
							<span style={st("font-weight:600;font-size:14.5px")}>
								{label}
							</span>
							<span style={st("font-size:13px;color:#56655f")}>{desc}</span>
						</button>
					))}
				</div>
				<span style={st("font-size:12.5px;color:#56655f")}>
					Saved in this browser session.
				</span>
			</div>

			<div className="card">
				<h2 style={st("margin:0;font-size:17px")}>Approval policy</h2>
				<div style={st("display:flex;flex-direction:column;gap:6px")}>
					<span className="lab">Second approver required above</span>
					<div
						role="group"
						aria-label="Second approver threshold"
						style={st("display:flex;gap:6px;flex-wrap:wrap")}
					>
						{THRESHOLDS.map((v) => (
							<button
								key={v}
								type="button"
								className={jmp(policy?.secondApproverAboveUsd === v)}
								aria-pressed={policy?.secondApproverAboveUsd === v}
								disabled={!policy}
								onClick={() =>
									policy &&
									actions.settings({
										policy: { ...policy, secondApproverAboveUsd: v },
									})
								}
							>
								{formatUsd0(v)}
							</button>
						))}
					</div>
				</div>
				<div style={st("display:flex;flex-direction:column;gap:6px")}>
					<span className="lab">Daily cap across payouts</span>
					<div
						role="group"
						aria-label="Daily cap"
						style={st("display:flex;gap:6px;flex-wrap:wrap")}
					>
						{CAPS.map((v) => (
							<button
								key={v}
								type="button"
								className={jmp(policy?.dailyCapUsd === v)}
								aria-pressed={policy?.dailyCapUsd === v}
								disabled={!policy}
								onClick={() =>
									policy &&
									actions.settings({ policy: { ...policy, dailyCapUsd: v } })
								}
							>
								{formatUsd0(v)}
							</button>
						))}
					</div>
				</div>
				<label
					className="ack"
					style={st("background:#ffffff;border-color:#d6dfdb")}
				>
					<input
						type="checkbox"
						checked={requireAck}
						onChange={(e) => setDemo({ requireAck: e.target.checked })}
					/>
					<span>
						<strong style={st("font-weight:600")}>
							Require warning acknowledgment before approval.
						</strong>{" "}
						The approver ticks a box confirming they read each rule warning.
					</span>
				</label>
			</div>

			<div className="card">
				<h2 style={st("margin:0;font-size:17px")}>Routing preference</h2>
				<div
					role="group"
					aria-label="Routing preference"
					style={st("display:flex;gap:8px;flex-wrap:wrap")}
				>
					{OBJECTIVES.map(([val, label, desc]) => (
						<button
							key={val}
							type="button"
							className={seg(settings?.objective === val)}
							aria-pressed={settings?.objective === val}
							disabled={!settings}
							onClick={() => actions.settings({ objective: val })}
						>
							<span style={st("font-weight:600;font-size:14.5px")}>
								{label}
							</span>
							<span style={st("font-size:13px;color:#56655f")}>{desc}</span>
						</button>
					))}
				</div>
				<span style={st("font-size:13px;color:#56655f")}>
					The preference only chooses among compliant routes. It can never pick
					a blocked one.
				</span>
			</div>

			<div className="card">
				<div
					style={st(
						"display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline",
					)}
				>
					<h2 style={st("margin:0;font-size:17px")}>Off-ramp providers</h2>
					<span className="pill p-muted">Demo registry · fictional names</span>
				</div>
				<div
					style={st(
						"display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px",
					)}
				>
					{offramps.map((o) => {
						const updated = !!settings?.registry[o.id];
						return (
							<label
								key={o.id}
								className="field"
								style={st(
									"flex-direction:row;align-items:center;gap:10px;cursor:pointer",
								)}
							>
								<input
									type="checkbox"
									checked={o.enabled}
									onChange={() => {
										const off = new Set(settings?.disabledOfframps ?? []);
										if (o.enabled) off.add(o.id);
										else off.delete(o.id);
										actions.settings({ disabledOfframps: [...off] });
									}}
									style={st("width:18px;height:18px;accent-color:#0e6b5c")}
								/>
								<span style={st("display:flex;flex-direction:column")}>
									<span style={st("font-weight:600;font-size:14px")}>
										{o.name}{" "}
										<span className="cc" style={st("margin-left:4px")}>
											{o.country}
										</span>
									</span>
									<span style={st("font-size:12.5px;color:#56655f")}>
										{updated
											? `${TYPE_LONG[o.type]} (registry v2)`
											: TYPE_LONG[o.type]}{" "}
										· {o.feePct.toFixed(2)}% · {o.assets[0]}/{o.networks[0]} ·{" "}
										{o.minutes} min
									</span>
								</span>
							</label>
						);
					})}
				</div>
			</div>

			<div className="card">
				<h2 style={st("margin:0;font-size:17px")}>Locked safeguards</h2>
				{LOCKED.map((t) => (
					<div
						key={t}
						style={st(
							"display:flex;gap:10px;align-items:flex-start;font-size:14px",
						)}
					>
						<span style={{ flex: "none", marginTop: 2, color: "#56655f" }}>
							<IcLock size={16} />
						</span>
						<span>{t}</span>
					</div>
				))}
			</div>

			<div className="card" style={st("gap:4px")}>
				<div
					style={st(
						"display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline;padding-bottom:8px",
					)}
				>
					<h2 style={st("margin:0;font-size:17px")}>Rules pack v1</h2>
					<span style={st("font-size:13px;color:#56655f")}>
						Changed through a reviewed rules.json update, not here
					</span>
				</div>
				{rules.map((r) => (
					<div
						key={r.id}
						style={st(
							"display:grid;grid-template-columns:200px minmax(0,1fr) 130px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid #e1e8e5;font-size:14px",
						)}
					>
						<a
							className="ruleref"
							href={r.source.url}
							target="_blank"
							rel="noopener noreferrer"
							style={st("justify-self:start")}
						>
							{r.id}
						</a>
						<span>
							{r.title}{" "}
							<span style={st("color:#56655f;font-size:12.5px")}>
								·{" "}
								{r.effectiveFrom
									? `from ${formatDate(r.effectiveFrom)}`
									: "no date set"}
								{r.effectiveTo ? ` to ${formatDate(r.effectiveTo)}` : ""}
							</span>
						</span>
						<span
							className={`pill ${r.outcome === "block" ? "p-bad" : r.outcome === "warn" ? "p-warn" : "p-neutral"}`}
							style={st("justify-self:end")}
						>
							{r.outcome === "block"
								? "Hard block"
								: r.outcome === "warn"
									? "Warning"
									: "Required fields"}
						</span>
					</div>
				))}
			</div>
		</main>
	);
}
