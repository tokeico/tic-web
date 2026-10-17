import { Lock } from "@/components/icons";
import { Card, Lab, RuleRef } from "@/components/ui";
import { OFFRAMP_TYPE_TITLE, OFFRAMPS, RULES } from "@/domain/data";
import { fmtDate, usd0 } from "@/domain/format";
import type { Autonomy, Objective } from "@/domain/types";
import { useStore } from "@/state/store";

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

const LOCKED = [
	"Payments always need a person to confirm. The agent can prepare a payment, never send one.",
	"Above the threshold, two different people must approve. The same person can’t approve twice.",
	"Sanctions blocks lift only with a named license and a compliance sign-off.",
	"Changed bank details freeze approval until a person records a callback or rejects the invoice.",
	"Route overrides need a written reason and can only choose compliant routes.",
	"Every agent proposal and every human decision is written to the hash-chained audit log.",
];

/**
 * Settings are inputs to the engine, not exceptions to it: a preference only
 * chooses among compliant routes, and the safeguards at the bottom cannot be
 * switched off from this screen at all.
 */
export function CustomizePage() {
	const { state: s, setSetting, toggleProvider } = useStore();

	const seg = (on: boolean) => `seg${on ? " seg-on" : ""}`;
	const jmp = (on: boolean) => `jump${on ? " jump-on" : ""}`;

	return (
		<main className="mx-auto flex max-w-[1000px] flex-col gap-4 p-5">
			<div className="flex flex-col gap-1">
				<h1
					className="display m-0"
					style={{
						fontSize: 26,
					}}
				>
					Customize
				</h1>
				<p
					className="m-0 text-ash-dim"
					style={{ fontSize: 14, maxWidth: "80ch" }}
				>
					Every change re-runs the rules on open payouts and is written to the
					audit log. Changes that reroute a payout show the same notice as the
					date bar.
				</p>
			</div>

			<Card>
				<h2 className="m-0" style={{ fontSize: 18 }}>
					Agent autonomy
				</h2>
				<div
					role="group"
					aria-label="Agent autonomy"
					className="flex flex-wrap gap-2"
				>
					{AUTONOMY.map(([val, label, desc]) => (
						<button
							key={val}
							type="button"
							className={seg(s.settings.autonomy === val)}
							aria-pressed={s.settings.autonomy === val}
							onClick={() =>
								setSetting("autonomy", val, `Agent autonomy set to ${label}`)
							}
						>
							<span className="font-semibold" style={{ fontSize: 14 }}>
								{label}
							</span>
							<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
								{desc}
							</span>
						</button>
					))}
				</div>
			</Card>

			<Card>
				<h2 className="m-0" style={{ fontSize: 18 }}>
					Approval policy
				</h2>
				<div className="flex flex-col gap-1.5">
					<Lab>Second approver required above</Lab>
					<div
						role="group"
						aria-label="Second approver threshold"
						className="flex flex-wrap gap-1.5"
					>
						{[25000, 50000, 100000].map((val) => (
							<button
								key={val}
								type="button"
								className={jmp(s.settings.threshold === val)}
								aria-pressed={s.settings.threshold === val}
								onClick={() =>
									setSetting(
										"threshold",
										val,
										`Second-approver threshold set to ${usd0(val)}`,
									)
								}
							>
								{usd0(val)}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<Lab>Daily cap across payouts</Lab>
					<div
						role="group"
						aria-label="Daily cap"
						className="flex flex-wrap gap-1.5"
					>
						{[100000, 150000, 250000].map((val) => (
							<button
								key={val}
								type="button"
								className={jmp(s.settings.cap === val)}
								aria-pressed={s.settings.cap === val}
								onClick={() =>
									setSetting("cap", val, `Daily cap set to ${usd0(val)}`)
								}
							>
								{usd0(val)}
							</button>
						))}
					</div>
				</div>
				<label className="ack">
					<input
						type="checkbox"
						checked={s.settings.requireAck}
						onChange={(e) =>
							setSetting(
								"requireAck",
								e.target.checked,
								"Warning acknowledgment " +
									(e.target.checked ? "required" : "not required"),
							)
						}
					/>
					<span>
						<strong>Require warning acknowledgment before approval.</strong> The
						approver ticks a box confirming they read each rule warning.
					</span>
				</label>
			</Card>

			<Card>
				<h2 className="m-0" style={{ fontSize: 18 }}>
					Routing preference
				</h2>
				<div
					role="group"
					aria-label="Routing preference"
					className="flex flex-wrap gap-2"
				>
					{OBJECTIVES.map(([val, label, desc]) => (
						<button
							key={val}
							type="button"
							className={seg(s.settings.objective === val)}
							aria-pressed={s.settings.objective === val}
							onClick={() =>
								setSetting(
									"objective",
									val,
									`Routing preference set to ${label}`,
								)
							}
						>
							<span className="font-semibold" style={{ fontSize: 14 }}>
								{label}
							</span>
							<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
								{desc}
							</span>
						</button>
					))}
				</div>
				<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
					The preference only chooses among compliant routes. It can never pick
					a blocked one.
				</span>
			</Card>

			<Card>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="m-0" style={{ fontSize: 18 }}>
						Off-ramp providers
					</h2>
					<span className="pill p-muted">Demo registry · fictional names</span>
				</div>
				<div
					className="grid gap-2"
					style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}
				>
					{OFFRAMPS.map((o) => (
						<label
							key={o.id}
							className="field"
							style={{ flexDirection: "row", gap: 10 }}
						>
							<input
								type="checkbox"
								checked={!s.settings.disabled[o.id]}
								onChange={() => toggleProvider(o)}
								style={{
									width: 18,
									height: 18,
									accentColor: "var(--color-volt)",
									flex: "none",
								}}
							/>
							<span className="flex min-w-0 flex-col gap-0.5">
								<span className="font-medium" style={{ fontSize: 14 }}>
									{o.name} <span className="cc">{o.c}</span>
								</span>
								<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
									{(o.id === "br-ponte" && s.registry.ponte
										? "Authorized VASP (registry v2)"
										: OFFRAMP_TYPE_TITLE[o.type]) +
										" · " +
										o.fee.toFixed(2) +
										"% · " +
										o.asset +
										"/" +
										o.net +
										" · " +
										o.min +
										" min"}
								</span>
							</span>
						</label>
					))}
				</div>
			</Card>

			<Card>
				<h2 className="m-0" style={{ fontSize: 18 }}>
					Locked safeguards
				</h2>
				{LOCKED.map((t) => (
					<div
						key={t}
						className="flex items-start gap-2"
						style={{ fontSize: 14 }}
					>
						<Lock
							size={16}
							color="var(--color-ash-dim)"
							style={{ flex: "none", marginTop: 2 }}
						/>
						<span>{t}</span>
					</div>
				))}
			</Card>

			<Card>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="m-0" style={{ fontSize: 18 }}>
						Rules pack v1
					</h2>
					<span className="text-ash-dim" style={{ fontSize: 13 }}>
						Changed through a reviewed rules.json update, not here
					</span>
				</div>
				{RULES.map((r) => (
					<div
						key={r.id}
						className="flex flex-wrap items-center gap-2 border-t border-edge-soft pt-2"
					>
						<RuleRef id={r.id} url={r.src.url} />
						<span className="min-w-0 flex-1" style={{ fontSize: 14 }}>
							{r.title}{" "}
							<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
								{"· " +
									(r.from ? `from ${fmtDate(r.from)}` : "no date set") +
									(r.to ? ` to ${fmtDate(r.to)}` : "") +
									(r.verify
										? s.verified[r.id]
											? " · source reviewed"
											: " · verify"
										: "")}
							</span>
						</span>
						<span
							className={
								"pill " +
								(r.kind === "block"
									? "p-bad"
									: r.kind === "warn"
										? "p-warn"
										: "p-neutral")
							}
						>
							{r.kind === "block"
								? "Hard block"
								: r.kind === "warn"
									? "Warning"
									: "Required fields"}
						</span>
					</div>
				))}
			</Card>
		</main>
	);
}
