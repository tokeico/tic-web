// The 3-minute guided demo: each step says what to say, and "Do it" performs
// it for real against the API (load, reroute, approve, pay...). Ported from the
// design's dark bar; the steps follow PRD §10 with the Oct 31 storyline.

import { useQueryClient } from "@tanstack/react-query";
import { useAgent } from "#/lib/agent";
import { payoutsQuery } from "#/lib/api";
import type { PayoutDetail } from "#/lib/contracts";
import { getDemo, setDemo, useDemo } from "#/lib/demo-store";
import { DEMO_TODAY } from "#/lib/search";
import { st } from "#/lib/st";
import { useActions } from "#/lib/use-actions";

interface Step {
	title: string;
	say: string;
	time: string;
	act: () => Promise<void> | void;
}

export function TourBar() {
	const i = useDemo((s) => s.tour);
	const actions = useActions();
	const agent = useAgent();
	const queryClient = useQueryClient();

	const details = () =>
		(queryClient.getQueryData(payoutsQuery.queryKey) as
			| PayoutDetail[]
			| undefined) ?? [];
	const byCountry = (c: string) => details().find((p) => p.country === c);

	const steps: Step[] = [
		{
			title: "Load four invoices from four countries",
			say: "Paying Latin America costs 3 to 7 percent and takes days. Stablecoins fix the money. Corredor fixes everything around it.",
			time: "0:00",
			act: async () => {
				actions.go("/app/inbox");
				if (details().length === 0) await actions.resetDemo();
				if (
					!details().every((p) => p.status !== "draft") ||
					details().length === 0
				)
					await actions.loadDemo();
			},
		},
		{
			title: "Open the Brazil payout",
			say: "Every decision shows the rule, the date it took effect and a source link.",
			time: "0:30",
			act: () => {
				const br = byCountry("BR");
				if (br) actions.openPayout(br.id);
			},
		},
		{
			title: "Rewind to Sep 30",
			say: "Before Resolution 561, the cheapest compliant provider was an eFX house.",
			time: "0:50",
			act: () => actions.setAsOf("2026-09-30"),
		},
		{
			title: "Oct 1: BR-561-EFX takes effect",
			say: "The law changes, the route changes, and the app names the rule that did it.",
			time: "1:00",
			act: () => actions.setAsOf("2026-10-01"),
		},
		{
			title: "Oct 31: the filing deadline has passed",
			say: "Oct 30 was the deadline to file for authorization. A provider that didn’t file is excluded from Oct 31, so it reroutes again. Rules are data with dates, not code.",
			time: "1:10",
			act: () => actions.setAsOf("2026-10-31"),
		},
		{
			title: "Back to today, ask the agent",
			say: "The agent reads and explains, with sources. It has no tool that moves money.",
			time: "1:20",
			act: async () => {
				actions.setAsOf(DEMO_TODAY);
				await new Promise((r) => setTimeout(r, 400));
				await agent.ask("What needs my attention today?", { view: "agent" });
			},
		},
		{
			title: "Approve Brazil and Mexico",
			say: "Warnings must be acknowledged, and over fifty thousand dollars needs two different people.",
			time: "1:40",
			act: async () => {
				const br = byCountry("BR");
				if (br?.status === "ready") {
					actions.setAck(br.id, true);
					await actions.approve(br, "Maria Lopez");
				}
				let mx = byCountry("MX");
				if (mx && mx.status === "awaiting_second_approver") {
					if (mx.approvals.length === 0)
						await actions.approve(mx, "Maria Lopez");
					mx = byCountry("MX");
					if (mx && mx.status === "awaiting_second_approver")
						await actions.approve(mx, "Daniel Ortiz");
				}
				if (br) actions.openPayout(br.id);
			},
		},
		{
			title: "Pay on the simulated rail",
			say: "Payment only follows human approval. The rail is a mock, and the app says so.",
			time: "1:55",
			act: async () => {
				const br = byCountry("BR");
				if (!br) return;
				actions.openPayout(br.id);
				if (br.status === "approved") await actions.pay(br);
			},
		},
		{
			title: "Regulatory radar",
			say: "An agent watches the sources, proposes changes with an impact analysis, and compliance approves.",
			time: "2:25",
			act: () => actions.go("/app/trust"),
		},
		{
			title: "Prove it: the audit chain",
			say: "AI reads and explains, a person approves, code decides, and every step is hash-chained.",
			time: "2:40",
			act: () => actions.go("/app/audit"),
		},
	];

	if (i == null || i >= steps.length) return null;
	const step = steps[i]!;
	const last = i === steps.length - 1;

	return (
		<div style={st("background:#13201c;color:#ffffff")} aria-live="polite">
			<div
				style={st(
					"max-width:1440px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between",
				)}
			>
				<div
					style={st(
						"display:flex;flex-direction:column;gap:3px;min-width:0;flex:1 1 460px",
					)}
				>
					<span
						style={st(
							"font:500 11px/1.2 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase;color:#9fd8c9",
						)}
					>
						Guided demo · step {i + 1} of {steps.length} · {step.time}
					</span>
					<span style={st("font-weight:600;font-size:16px")}>{step.title}</span>
					<span style={st("font-size:14px;color:#d5e1dd")}>
						Say: “{step.say}”
					</span>
				</div>
				<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
					<button
						type="button"
						className="btn btn-sm"
						disabled={i === 0}
						onClick={() => setDemo({ tour: Math.max(0, i - 1) })}
					>
						Previous
					</button>
					<button
						type="button"
						className="btn btn-primary btn-sm"
						style={st("border-color:#7fe0c8")}
						onClick={async () => {
							const at = getDemo().tour ?? i;
							setDemo({ tour: at + 1 < steps.length ? at + 1 : null });
							await steps[at]!.act();
						}}
					>
						{last ? "Do it and finish" : "Do it · next step"}
					</button>
					<button
						type="button"
						className="btn btn-sm"
						onClick={() => setDemo({ tour: null })}
					>
						Exit
					</button>
				</div>
			</div>
		</div>
	);
}
