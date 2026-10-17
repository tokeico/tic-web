import { Check, Lock } from "@/components/icons";
import { ScreeningSandbox } from "@/components/ScreeningSandbox";
import { Card, Lab, PAGE_MAX_W, RuleRef } from "@/components/ui";
import { radarImpact } from "@/domain/agent";
import { verify } from "@/domain/audit";
import { cite, RULES, SOURCES } from "@/domain/data";
import { views } from "@/domain/engine";
import { fmtDate, usd0 } from "@/domain/format";
import { COMPLIANCE, useStore } from "@/state/store";

const TOOLS_ALLOWED = [
	"read_payouts()",
	"plan() / plan_all(dry_run)",
	"screen_ofac()",
	"scan_injection()",
	"draft_vendor_email()",
	"propose_action()",
];

const TOOLS_HUMAN = [
	"approve_payout",
	"send_payment",
	"clear_security_hold",
	"change_bank_details",
	"record_ofac_license",
	"approve_rule_or_registry_change",
];

/**
 * Trust and compliance: what the agent watches, what it is allowed to do, and
 * the guardrails that hold regardless of what it says.
 */
export function TrustPage() {
	const { state: s, radarDecide, markVerified } = useStore();
	const vs = s.loaded ? views(s) : [];
	const chk = verify(s.events, s.tamperSeq);
	const flagged = vs.filter((v) => v.p.security).length;
	const impact = radarImpact(s);

	const proposals = s.events.filter((e) => e.type === "agent_proposed").length;
	const confirmed = s.actions.filter((a) => a.status === "done").length;
	const dismissed = s.actions.filter((a) => a.status === "dismissed").length;

	const guards = [
		{
			name: "Prompt-injection defense",
			status: flagged && s.sus ? "1 attempt caught" : "Active",
			cls: `pill ${s.sus ? "p-warn" : "p-ok"}`,
			detail:
				"Text inside invoices is data. Instruction-like text is flagged, quoted for a person and never followed.",
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
				"A memo may cite only rules in the engine’s plan. Anything else is rejected and retried, then falls back to a template.",
		},
		{
			name: "Bank-detail change control",
			status: s.sus ? "1 hold" : "Active",
			cls: `pill ${s.sus ? "p-warn" : "p-ok"}`,
			detail:
				"Bank details that differ from the vendor master freeze approval until a callback to the number on file is recorded.",
		},
		{
			name: "Separation of duties",
			status: `Over ${usd0(s.settings.threshold)}`,
			cls: "pill p-ok",
			detail:
				"Two different approvers above the threshold, plus a " +
				usd0(s.settings.cap) +
				" daily cap.",
		},
		{
			name: "Hash-chained audit log",
			status: chk.ok
				? `Verified · ${s.events.length} events`
				: `Broken at #${chk.brokenAt}`,
			cls: `pill ${chk.ok ? "p-ok" : "p-bad"}`,
			detail:
				"Every AI step, engine step and human decision is chained. Editing any event breaks verification.",
		},
		{
			name: "Data minimization",
			status: "Masked",
			cls: "pill p-ok",
			detail:
				"Bank identifiers are masked to the last four digits in agent replies and vendor drafts.",
		},
	];

	const agentStats = [
		{ v: String(proposals), l: "proposals made" },
		{ v: String(confirmed), l: "confirmed by a person" },
		{ v: String(dismissed), l: "dismissed" },
		{ v: String(s.autoRuns || 0), l: "low-risk auto runs" },
		{ v: "0", l: "payments by the agent" },
	];

	return (
		<main className={`mx-auto flex ${PAGE_MAX_W["/trust"]} flex-col gap-4 p-5`}>
			<div className="flex flex-col gap-1">
				<h1
					className="display m-0"
					style={{
						fontSize: 26,
					}}
				>
					Trust and compliance
				</h1>
				<p
					className="m-0 text-ash-dim"
					style={{ fontSize: 14, maxWidth: "80ch" }}
				>
					What the agent watches, what it is allowed to do, and the guardrails
					that hold no matter what it says.
				</p>
			</div>

			<ScreeningSandbox />

			{/* radar ----------------------------------------------------------- */}
			<Card>
				<div className="flex flex-wrap items-center justify-between gap-2.5">
					<div className="flex flex-col gap-0.5">
						<h2 className="m-0" style={{ fontSize: 18 }}>
							Regulatory radar
						</h2>
						<span className="text-ash-dim" style={{ fontSize: 13.5 }}>
							The agent watches the rules pack’s sources and the provider
							registry, and proposes changes with an impact analysis. Compliance
							approves every change.
						</span>
					</div>
					<span className="act act-ai">Agent watching · 5 sources</span>
				</div>

				<div className="flex flex-wrap gap-1.5">
					{Object.keys(SOURCES).map((k) => (
						<a
							key={k}
							className="chip"
							href={SOURCES[k].url}
							target="_blank"
							rel="noopener"
							style={{ textDecoration: "none" }}
						>
							{SOURCES[k].short}
						</a>
					))}
				</div>

				<div
					className="flex flex-col gap-2.5 rounded-lg p-3.5"
					style={{
						border: "1px solid var(--color-edge)",
						background: "var(--color-raise)",
					}}
				>
					<div className="flex flex-wrap items-start justify-between gap-2.5">
						<div className="flex flex-col gap-0.5">
							<span className="font-semibold" style={{ fontSize: 15 }}>
								Registry update: Ponte Digital listed as an authorized VASP
							</span>
							<span className="text-ash-dim" style={{ fontSize: 13 }}>
								Detected 09:00 · provider registry · BR
							</span>
						</div>
						<div className="flex flex-wrap gap-1.5">
							<span className="pill p-warn">Simulated update for the demo</span>
							<span
								className={
									"pill " +
									(s.radar === "approved"
										? "p-ok"
										: s.radar === "rejected"
											? "p-bad"
											: "p-warn")
								}
							>
								{s.radar === "approved"
									? `Approved · ${COMPLIANCE}`
									: s.radar === "rejected"
										? "Rejected"
										: "Awaiting compliance"}
							</span>
						</div>
					</div>

					<span style={{ fontSize: 14 }}>
						Proposed change:{" "}
						<span className="mono" style={{ fontSize: 13 }}>
							offramps.json › br-ponte.type: vasp_pending → vasp_authorized
						</span>
					</span>

					<div className="flex flex-col gap-1">
						<Lab>Impact analysis · dry run on open payouts</Lab>
						{impact.map((t, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: positional rows in an append-only list
							<span key={i} style={{ fontSize: 14 }}>
								{t}
							</span>
						))}
					</div>

					<div className="flex flex-wrap items-center gap-1.5">
						<Lab>Affects</Lab>
						{["BR-VASP-PENDING-WARN", "BR-VASP-AUTH"].map((id) => (
							<RuleRef key={id} id={id} url={cite(id).url} tip={cite(id).tip} />
						))}
					</div>

					{s.radar === "pending" && (
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								className="btn btn-primary btn-sm"
								onClick={() => radarDecide(true)}
							>
								Approve
							</button>
							<button
								type="button"
								className="btn btn-sm"
								onClick={() => radarDecide(false)}
							>
								Reject
							</button>
						</div>
					)}
				</div>

				<div className="flex flex-col gap-1.5">
					<Lab>Rules flagged for verification</Lab>
					{RULES.filter((r) => r.verify).map((r) => (
						<div
							key={r.id}
							className="flex flex-wrap items-center justify-between gap-2.5 border-t border-edge-soft py-2.5"
						>
							<div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[3px]">
								<div className="flex flex-wrap items-center gap-2">
									<RuleRef id={r.id} url={r.src.url} />
									<span className="font-semibold" style={{ fontSize: 14 }}>
										{r.title}
									</span>
								</div>
								<span className="text-ash" style={{ fontSize: 13.5 }}>
									{"Effective date is marked “verify” in rules pack v1 (" +
										(r.from ? fmtDate(r.from) : "no date") +
										"). The agent linked the source; a person has to confirm it."}
								</span>
							</div>
							{s.verified[r.id] ? (
								<span className="pill p-ok">{`Reviewed by ${COMPLIANCE}`}</span>
							) : (
								<button
									type="button"
									className="btn btn-sm"
									onClick={() => markVerified(r.id)}
								>
									{`Mark source reviewed · ${COMPLIANCE}`}
								</button>
							)}
						</div>
					))}
				</div>
			</Card>

			{/* permissions + guardrails ---------------------------------------- */}
			<div className="flex flex-wrap items-start gap-4">
				<Card className="min-w-0 flex-[1_1_440px]">
					<div className="flex flex-col gap-0.5">
						<h2 className="m-0" style={{ fontSize: 18 }}>
							Agent permissions
						</h2>
						<span className="text-ash-dim" style={{ fontSize: 13.5 }}>
							The agent only gets the tools on the left. The ones on the right
							don’t exist for it.
						</span>
					</div>

					<div
						className="grid gap-3"
						style={{
							gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
						}}
					>
						<div className="flex flex-col gap-1.5">
							<Lab>Agent can</Lab>
							{TOOLS_ALLOWED.map((t) => (
								<div key={t} className="flex items-center gap-2">
									<Check color="var(--color-volt)" style={{ flex: "none" }} />
									<span className="mono" style={{ fontSize: 13 }}>
										{t}
									</span>
								</div>
							))}
						</div>
						<div className="flex flex-col gap-1.5">
							<Lab>People only</Lab>
							{TOOLS_HUMAN.map((t) => (
								<div key={t} className="flex items-center gap-2">
									<Lock color="var(--color-amber)" style={{ flex: "none" }} />
									<span className="mono" style={{ fontSize: 13 }}>
										{t}
									</span>
								</div>
							))}
						</div>
					</div>

					<div
						className="grid gap-2 border-t border-edge-soft pt-2.5"
						style={{
							gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
						}}
					>
						{agentStats.map((a) => (
							<div key={a.l} className="flex flex-col">
								<span
									className="mono"
									style={{
										fontWeight: 600,
										fontSize: 20,
										fontVariantNumeric: "tabular-nums",
									}}
								>
									{a.v}
								</span>
								<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
									{a.l}
								</span>
							</div>
						))}
					</div>
				</Card>

				<Card className="min-w-0 flex-[1_1_440px]">
					<h2 className="m-0" style={{ fontSize: 18 }}>
						Guardrails
					</h2>
					{guards.map((g) => (
						<div key={g.name} className="flex flex-col gap-1">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="font-semibold" style={{ fontSize: 14 }}>
									{g.name}
								</span>
								<span className={g.cls}>{g.status}</span>
							</div>
							<span className="text-ash-dim" style={{ fontSize: 13 }}>
								{g.detail}
							</span>
						</div>
					))}
				</Card>
			</div>
		</main>
	);
}
