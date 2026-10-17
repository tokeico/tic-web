import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { IcCheck, IcLock } from "../../components/icons";
import { H1, RuleRef } from "../../components/ui";
import {
	payoutsQuery,
	rulesQuery,
	settingsQuery,
	verifyQuery,
} from "../../lib/api";
import { setDemo, useDemo } from "../../lib/demo-store";
import { formatUsd0 } from "../../lib/format";
import {
	RADAR_OFFRAMP,
	RADAR_UPDATE,
	radarImpact,
	radarState,
} from "../../lib/radar";
import { st } from "../../lib/st";
import { useActions } from "../../lib/use-actions";

export const Route = createFileRoute("/app/trust")({ component: Trust });

const ALLOWED = [
	"read_payouts()",
	"plan() / plan_all(dry_run)",
	"screen_ofac()",
	"draft_vendor_email()",
	"propose_action()",
	"explain_with_sources()",
];
const HUMAN = [
	"approve_payout",
	"send_payment",
	"clear_security_hold",
	"change_bank_details",
	"record_ofac_license",
	"approve_rule_or_registry_change",
];

function Trust() {
	const actions = useActions();
	const details = useQuery(payoutsQuery).data ?? [];
	const rules = useQuery(rulesQuery).data ?? [];
	const settings = useQuery(settingsQuery).data;
	const chain = useQuery(verifyQuery()).data;
	const rejected = useDemo((s) => s.radarRejected);
	const queue = useDemo((s) => s.actions);
	const autoRuns = useDemo((s) => s.autoRuns);
	const state = radarState(settings, rejected);
	const loaded =
		details.length > 0 && details.every((p) => p.status !== "draft");

	const planKey = details.map((p) => p.fingerprint).join();
	const impact = useQuery({
		queryKey: ["radar-impact", actions.asOf, planKey, state],
		queryFn: () => radarImpact(details, actions.asOf),
		enabled: loaded && state !== "approved",
	});

	// Distinct sources the rules pack cites: what the "agent" watches.
	const sources = [
		...new Map(rules.map((r) => [r.source.name, r.source.url])).entries(),
	].map(([name, url]) => ({ name, url }));
	const threshold = settings?.policy.secondApproverAboveUsd ?? 50_000;
	const cap = settings?.policy.dailyCapUsd ?? 150_000;
	const proposals = queue.length;
	const confirmed = queue.filter((a) => a.status === "done").length;
	const dismissed = queue.filter((a) => a.status === "dismissed").length;
	const stats = [
		{ v: proposals, l: "proposals made" },
		{ v: confirmed, l: "confirmed by a person" },
		{ v: dismissed, l: "dismissed" },
		{ v: autoRuns, l: "low-risk auto runs" },
		{ v: 0, l: "payments by the agent" },
	];

	const ok = chain?.ok ?? true;
	const guards: {
		name: string;
		status: string;
		cls: string;
		detail: string;
	}[] = [
		{
			name: "Prompt-injection defense",
			status: "Planned",
			cls: "pill p-muted",
			detail:
				"Text inside invoices is data. Instruction-like text will be flagged, quoted for a person and never followed. Not built yet: nothing reads invoice text in this build.",
		},
		{
			name: "No money-moving tools for the agent",
			status: "Enforced",
			cls: "pill p-ok",
			detail:
				"The agent can read and propose. Approve, pay, clear holds and rule changes exist only in the human UI.",
		},
		{
			name: "Deterministic rules engine",
			status: "Replayable",
			cls: "pill p-ok",
			detail:
				"Same inputs and as-of date give the same plan and fingerprint. Use “Replay 100×” on any payout.",
		},
		{
			name: "Memo citation guard",
			status: "Enforced",
			cls: "pill p-ok",
			detail:
				"A memo may cite only rules in the engine’s plan. The template memo is built from the plan, so it can’t cite anything else.",
		},
		{
			name: "Bank-detail change control",
			status: "Planned",
			cls: "pill p-muted",
			detail:
				"Bank details that differ from the vendor master will freeze approval until a callback to the number on file is recorded. Not built yet.",
		},
		{
			name: "Separation of duties",
			status: `Over ${formatUsd0(threshold)}`,
			cls: "pill p-ok",
			detail: `Two different approvers above the threshold, plus a ${formatUsd0(cap)} daily cap.`,
		},
		{
			name: "Hash-chained audit log",
			status: ok
				? `Verified · ${chain?.count ?? 0} events`
				: `Broken at #${chain?.brokenAt}`,
			cls: `pill ${ok ? "p-ok" : "p-bad"}`,
			detail:
				"Every engine step and human decision is chained with a keyed MAC and signed checkpoints. Editing any event breaks verification.",
		},
		{
			name: "Data minimization",
			status: "Masked",
			cls: "pill p-ok",
			detail:
				"Bank identifiers are masked to the last four digits in agent replies and vendor drafts, and kept out of the audit log.",
		},
	];

	const statusPill =
		state === "approved" ? "p-ok" : state === "rejected" ? "p-bad" : "p-warn";
	const statusText =
		state === "approved"
			? "Approved · Daniel Ortiz"
			: state === "rejected"
				? "Rejected"
				: "Awaiting compliance";

	return (
		<main
			style={st(
				"max-width:1200px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:16px",
			)}
		>
			<div style={st("display:flex;flex-direction:column;gap:4px")}>
				<H1>Trust and compliance</H1>
				<p style={st("margin:0;color:#56655f;font-size:14px;max-width:80ch")}>
					What the agent watches, what it is allowed to do, and the guardrails
					that hold no matter what it says.
				</p>
			</div>

			<div className="card">
				<div
					style={st(
						"display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap",
					)}
				>
					<div style={st("display:flex;flex-direction:column;gap:2px")}>
						<h2 style={st("margin:0;font-size:18px")}>Regulatory radar</h2>
						<span style={st("font-size:13.5px;color:#56655f")}>
							The agent watches the rules pack’s sources and the provider
							registry, and proposes changes with an impact analysis. Compliance
							approves every change.
						</span>
					</div>
					<span className="act act-ai">
						Agent watching · {sources.length} sources
					</span>
				</div>
				<div style={st("display:flex;gap:6px;flex-wrap:wrap")}>
					{sources.map((s) => (
						<a
							key={s.name}
							className="chip"
							href={s.url}
							target="_blank"
							rel="noopener noreferrer"
							style={st("text-decoration:none")}
						>
							{s.name}
						</a>
					))}
				</div>

				<div
					style={st(
						"display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid #d6dfdb;border-radius:8px;background:#fbfcfc",
					)}
				>
					<div
						style={st(
							"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap",
						)}
					>
						<div style={st("display:flex;flex-direction:column;gap:2px")}>
							<span style={st("font-weight:600;font-size:15px")}>
								Registry update: Ponte Digital listed as an authorized VASP
							</span>
							<span style={st("font-size:13px;color:#56655f")}>
								Detected 09:00 · provider registry · BR
							</span>
						</div>
						<div style={st("display:flex;gap:6px;flex-wrap:wrap")}>
							<span className="pill p-warn">Simulated update for the demo</span>
							<span className={`pill ${statusPill}`}>{statusText}</span>
						</div>
					</div>
					<span style={st("font-size:14px")}>
						Proposed change:{" "}
						<span className="mono" style={st("font-size:13px")}>
							offramps.json › {RADAR_OFFRAMP}.type: vasp_unfiled →
							vasp_authorized
						</span>
					</span>
					<div style={st("display:flex;flex-direction:column;gap:4px")}>
						<span className="lab">
							Impact analysis · dry run on open payouts
						</span>
						{state === "approved" ? (
							<span style={st("font-size:14px")}>
								Approved: Brazil payouts now treat Ponte Digital as an
								authorized VASP.
							</span>
						) : !loaded ? (
							<span style={st("font-size:14px")}>
								Load the demo invoices to see the impact on open payouts.
							</span>
						) : (
							(impact.data ?? ["Running the dry run…"]).map((t) => (
								<span key={t} style={st("font-size:14px")}>
									{t}
								</span>
							))
						)}
					</div>
					<div
						style={st("display:flex;gap:6px;flex-wrap:wrap;align-items:center")}
					>
						<span className="lab">Affects</span>
						{["BR-VASP-UNFILED-WARN", "BR-VASP-AUTH"].map((id) => (
							<RuleRef
								key={id}
								id={id}
								url={rules.find((r) => r.id === id)?.source.url}
							/>
						))}
					</div>
					{state === "pending" && (
						<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
							<button
								type="button"
								className="btn btn-primary btn-sm"
								onClick={() =>
									actions.settings({
										registry: { ...settings?.registry, ...RADAR_UPDATE },
										by: "Daniel Ortiz",
									})
								}
							>
								Approve as Daniel Ortiz · Compliance
							</button>
							<button
								type="button"
								className="btn btn-sm"
								onClick={() => setDemo({ radarRejected: true })}
							>
								Reject
							</button>
						</div>
					)}
					{state === "approved" && (
						<div>
							<button
								type="button"
								className="btn btn-sm"
								onClick={() =>
									actions.settings({ registry: {}, by: "Daniel Ortiz" })
								}
							>
								Revert the registry update
							</button>
						</div>
					)}
					{state === "rejected" && (
						<div>
							<button
								type="button"
								className="btn btn-sm"
								onClick={() => setDemo({ radarRejected: false })}
							>
								Reconsider
							</button>
						</div>
					)}
				</div>

				<div style={st("display:flex;flex-direction:column;gap:6px")}>
					<span className="lab">Rules flagged for verification</span>
					<div
						style={st(
							"display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 0;border-top:1px solid #e1e8e5",
						)}
					>
						<span className="pill p-ok">
							<IcCheck />
							None open
						</span>
						<span style={st("font-size:13.5px;color:#3b4a44")}>
							All {rules.length} rules were checked against the regulators’ own
							texts on Oct 17, 2026. Sources and open questions are in
							docs/RULES-SOURCES.md.
						</span>
					</div>
				</div>
			</div>

			<div
				style={st(
					"display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start",
				)}
			>
				<div className="card" style={st("flex:1 1 440px;min-width:0")}>
					<div style={st("display:flex;flex-direction:column;gap:2px")}>
						<h2 style={st("margin:0;font-size:18px")}>Agent permissions</h2>
						<span style={st("font-size:13.5px;color:#56655f")}>
							The agent only gets the tools on the left. The ones on the right
							don’t exist for it.
						</span>
					</div>
					<div
						style={st(
							"display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px",
						)}
					>
						<div style={st("display:flex;flex-direction:column;gap:6px")}>
							<span className="lab">Agent can</span>
							{ALLOWED.map((t) => (
								<div
									key={t}
									style={st("display:flex;gap:8px;align-items:center")}
								>
									<span style={{ flex: "none", color: "#0b5a4d" }}>
										<IcCheck />
									</span>
									<span className="mono" style={st("font-size:13px")}>
										{t}
									</span>
								</div>
							))}
						</div>
						<div style={st("display:flex;flex-direction:column;gap:6px")}>
							<span className="lab">People only</span>
							{HUMAN.map((t) => (
								<div
									key={t}
									style={st("display:flex;gap:8px;align-items:center")}
								>
									<span style={{ flex: "none", color: "#8a4b00" }}>
										<IcLock />
									</span>
									<span className="mono" style={st("font-size:13px")}>
										{t}
									</span>
								</div>
							))}
						</div>
					</div>
					<div
						style={st(
							"display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;padding-top:10px;border-top:1px solid #e1e8e5",
						)}
					>
						{stats.map((s) => (
							<div
								key={s.l}
								style={st("display:flex;flex-direction:column;gap:2px")}
							>
								<span style={st("font:600 22px/1.1 'IBM Plex Mono',monospace")}>
									{s.v}
								</span>
								<span style={st("font-size:12.5px;color:#56655f")}>{s.l}</span>
							</div>
						))}
					</div>
				</div>
				<div className="card" style={st("flex:1 1 440px;min-width:0")}>
					<h2 style={st("margin:0;font-size:18px")}>Guardrails</h2>
					{guards.map((g) => (
						<div
							key={g.name}
							style={st(
								"display:flex;flex-direction:column;gap:3px;padding:8px 0;border-top:1px solid #e1e8e5",
							)}
						>
							<div
								style={st(
									"display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap",
								)}
							>
								<span style={st("font-weight:600;font-size:14px")}>
									{g.name}
								</span>
								<span className={g.cls}>{g.status}</span>
							</div>
							<span style={st("font-size:13.5px;color:#3b4a44")}>
								{g.detail}
							</span>
						</div>
					))}
				</div>
			</div>
		</main>
	);
}
