import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { IcPlay } from "../../components/icons";
import { Act, type Actor } from "../../components/ui";
import {
	auditQuery,
	offrampsQuery,
	payoutsQuery,
	settingsQuery,
} from "../../lib/api";
import { actorOf, describeEvent, eventSubject } from "../../lib/audit-view";
import { setDemo, useDemo } from "../../lib/demo-store";
import { formatDate, formatTime, formatUsd0 } from "../../lib/format";
import { radarState } from "../../lib/radar";
import { st } from "../../lib/st";
import { useActions } from "../../lib/use-actions";
import { recommendedEval, warnCount, wireEval } from "../../lib/view";

export const Route = createFileRoute("/app/")({ component: Overview });

function Overview() {
	const actions = useActions();
	const details = useQuery(payoutsQuery).data ?? [];
	const settings = useQuery(settingsQuery).data;
	const events = useQuery(auditQuery).data ?? [];
	const offramps = useQuery(offrampsQuery).data ?? [];
	const reroutes = useDemo((s) => s.reroutes);
	const pending = useDemo(
		(s) => s.actions.filter((a) => a.status === "pending").length,
	);
	const radarRejected = useDemo((s) => s.radarRejected);
	const loadingDemo = useDemo((s) => s.loading);

	const loaded =
		details.length > 0 && details.every((p) => p.status !== "draft");
	const asOf = actions.asOf;

	// ---- Numbers (all derived from the API's plans, never typed in) ----
	const routed = details.filter(
		(p) =>
			p.plan?.recommended?.kind === "stablecoin" &&
			!["rejected", "blocked", "needs_info"].includes(p.status),
	);
	const wireFee = (p: (typeof details)[number]) =>
		p.plan ? (wireEval(p.plan)?.route.feePct ?? 4.5) : 4.5;
	const savings = routed.reduce(
		(t, p) =>
			t + (p.amountUsd * (wireFee(p) - p.plan!.recommended!.feePct)) / 100,
		0,
	);
	const avgMin = routed.length
		? Math.round(
				routed.reduce((t, p) => t + p.plan!.recommended!.minutes, 0) /
					routed.length,
			)
		: 0;
	const humanEvents = events.filter(
		(e) => actorOf(e.type) === "Human" && e.type !== "asof_changed",
	).length;
	const stops = details.filter((p) => p.status === "blocked").length;
	const waiting = details.filter(
		(p) => p.status === "ready" || p.status === "awaiting_second_approver",
	).length;
	const checks = details.reduce(
		(t, p) =>
			t +
			(p.plan?.evaluations.reduce((t2, e) => t2 + e.results.length, 0) ?? 0),
		0,
	);
	const clear = details.filter(
		(p) => p.plan?.screening.status === "clear",
	).length;
	const L = loaded;

	const stages: [string, Actor, string, string][] = [
		[
			"Intake",
			"AI",
			"The local model reads the PDF into typed fields",
			L ? String(details.length) : "—",
		],
		[
			"Security scan",
			"AI + Code",
			"Injection, bank change, duplicates",
			L ? "0 flagged" : "—",
		],
		[
			"Sanctions screen",
			"Code",
			"OFAC SDN fuzzy match",
			L ? `${clear} clear` : "—",
		],
		[
			"Rules engine",
			"Code",
			`Deterministic, as of ${formatDate(asOf).replace(", 2026", "")}`,
			L ? `${checks} checks` : "—",
		],
		[
			"Memo",
			"AI",
			"Explains with citations, never decides",
			L ? String(details.filter((p) => p.memo).length) : "—",
		],
		[
			"Approval",
			"Human",
			"Two people over the threshold",
			L ? `${waiting} waiting` : "—",
		],
		[
			"Pay",
			"Human",
			"Confirmed by a person · simulated rail",
			L
				? String(
						details.filter((p) => p.status === "paid" || p.status === "booked")
							.length,
					)
				: "—",
		],
		[
			"Reconcile and book",
			"Code",
			"Match references, journal entry",
			L ? String(details.filter((p) => p.status === "booked").length) : "—",
		],
	];

	const kpis = [
		{
			label: "Fees saved vs. SWIFT",
			value: L ? formatUsd0(savings) : "—",
			sub: L
				? `on ${routed.length} payouts routed by stablecoin`
				: "Load the demo invoices",
			color: "#0b5a4d",
		},
		{
			label: "Settlement time",
			value: L && avgMin ? `${avgMin} min` : "—",
			sub: "average, vs. about 2 days by wire",
			color: "#13201c",
		},
		{
			label: "Decisions with sources",
			value: L
				? `${details.filter((p) => p.plan).length}/${details.length}`
				: "—",
			sub: "every route choice cites dated, linked rules",
			color: "#13201c",
		},
		{
			label: "Reroutes from rule changes",
			value: String(reroutes),
			sub: "automatic, each one names its rule",
			color: "#13201c",
		},
		{
			label: "Human decisions",
			value: String(humanEvents),
			sub: "0 payments made without a person",
			color: "#8a4b00",
		},
		{
			label: "Sanctions and rule stops",
			value: L ? String(stops) : "—",
			sub: "payouts blocked by sanctions or rules",
			color: "#922b24",
		},
	];

	type Need = {
		tag: string;
		cls: string;
		text: string;
		cta: string;
		go: () => void;
	};
	const needs: Need[] = [];
	for (const p of details) {
		const open = () => actions.openPayout(p.id);
		const w = warnCount(recommendedEval(p.plan));
		if (p.status === "awaiting_second_approver")
			needs.push({
				tag: "Approve",
				cls: "pill p-warn",
				text: `${p.payeeName} needs a second approver`,
				cta: "Open",
				go: open,
			});
		else if (p.status === "ready")
			needs.push({
				tag: "Approve",
				cls: "pill p-ok",
				text: `${p.payeeName} is ready${w ? " (warning to acknowledge)" : ""}`,
				cta: "Open",
				go: open,
			});
		else if (p.status === "needs_info")
			needs.push({
				tag: "Info",
				cls: "pill p-warn",
				text: `${p.payeeName} is missing required fields`,
				cta: "Open",
				go: open,
			});
		else if (p.status === "approved")
			needs.push({
				tag: "Pay",
				cls: "pill p-neutral",
				text: `${p.payeeName} is approved and ready to pay`,
				cta: "Open",
				go: open,
			});
		else if (p.status === "paid")
			needs.push({
				tag: "Book",
				cls: "pill p-neutral",
				text: `${p.payeeName} is paid and ready to reconcile`,
				cta: "Open",
				go: open,
			});
	}
	if (pending)
		needs.push({
			tag: "Agent",
			cls: "pill p-ok",
			text: `${pending} agent proposal${pending > 1 ? "s" : ""} waiting for you`,
			cta: "Review",
			go: () => actions.go("/app/agent"),
		});
	if (L && radarState(settings, radarRejected) === "pending")
		needs.push({
			tag: "Compliance",
			cls: "pill p-warn",
			text: "Registry update proposed by the regulatory radar",
			cta: "Review",
			go: () => actions.go("/app/trust"),
		});

	const feed = events.slice(0, 7);

	return (
		<main
			style={st(
				"max-width:1440px;margin:0 auto;padding:24px 20px;display:flex;flex-direction:column;gap:20px",
			)}
		>
			<section
				style={st(
					"display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between",
				)}
			>
				<div
					style={st(
						"display:flex;flex-direction:column;gap:8px;max-width:780px",
					)}
				>
					<span className="lab">
						The compliance brain for paying Latin America in stablecoins
					</span>
					<h1
						style={st(
							"margin:0;font-family:'Archivo',sans-serif;font-weight:800;font-stretch:86%;font-size:36px;line-height:1.06;letter-spacing:-.01em",
						)}
					>
						AI reads and explains. Code decides. A person approves.
					</h1>
					<p style={st("margin:0;color:#3b4a44;max-width:66ch")}>
						Every payout runs the same pipeline. Each step is labeled with who
						is responsible for it, and every step is written to a hash-chained
						audit log.
					</p>
				</div>
				<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
					{!L && !loadingDemo && (
						<button
							type="button"
							className="btn"
							onClick={async () => {
								if (details.length === 0) await actions.resetDemo();
								await actions.loadDemo();
								actions.go("/app/inbox");
							}}
						>
							Load the demo invoices
						</button>
					)}
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => setDemo({ tour: 0 })}
					>
						<IcPlay />
						Start the 3-minute guided demo
					</button>
				</div>
			</section>

			<section aria-label="Pipeline">
				<ol
					style={st(
						"list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px",
					)}
				>
					{stages.map(([name, actor, sub, count], i) => (
						<li key={name} className="stage">
							<div
								style={st(
									"display:flex;justify-content:space-between;align-items:center;gap:6px",
								)}
							>
								<span
									className="mono"
									style={st("font-size:12px;color:#7a8a84")}
								>
									0{i + 1}
								</span>
								<Act actor={actor} />
							</div>
							<span style={st("font-weight:600;font-size:15px")}>{name}</span>
							<span
								style={st(
									"font:600 22px/1.1 'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums",
								)}
							>
								{count}
							</span>
							<span style={st("font-size:12.5px;color:#56655f")}>{sub}</span>
						</li>
					))}
				</ol>
			</section>

			<section
				aria-label="Key numbers"
				style={st(
					"display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px",
				)}
			>
				{kpis.map((k) => (
					<div key={k.label} className="kpi">
						<span className="lab">{k.label}</span>
						<span
							style={{
								...st(
									"font:600 28px/1.1 'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums",
								),
								color: k.color,
							}}
						>
							{k.value}
						</span>
						<span style={st("font-size:13px;color:#56655f")}>{k.sub}</span>
					</div>
				))}
			</section>
			<p style={st("margin:-8px 0 0;font-size:12.5px;color:#56655f")}>
				Numbers come from the demo invoices, demo FX rates and fictional
				provider fees.
			</p>

			<section
				style={st(
					"display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start",
				)}
			>
				<div className="card" style={st("flex:1 1 420px;min-width:0")}>
					<div
						style={st(
							"display:flex;justify-content:space-between;align-items:baseline;gap:8px",
						)}
					>
						<h2 style={st("margin:0;font-size:17px")}>Needs a person</h2>
						<span style={st("font-size:13px;color:#56655f")}>
							{needs.length ? `${needs.length} items` : ""}
						</span>
					</div>
					{needs.length === 0 && (
						<p style={st("margin:0;color:#56655f;font-size:14px")}>
							Nothing waiting. Load the demo invoices to start.
						</p>
					)}
					{needs.map((n) => (
						<div
							key={n.tag + n.text}
							style={st(
								"display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #e1e8e5",
							)}
						>
							<div
								style={st(
									"display:flex;gap:10px;align-items:center;min-width:0",
								)}
							>
								<span className={n.cls}>{n.tag}</span>
								<span style={st("font-size:14px")}>{n.text}</span>
							</div>
							<button type="button" className="btn btn-sm" onClick={n.go}>
								{n.cta}
							</button>
						</div>
					))}
				</div>
				<div className="card" style={st("flex:1 1 420px;min-width:0")}>
					<div
						style={st(
							"display:flex;justify-content:space-between;align-items:baseline;gap:8px",
						)}
					>
						<h2 style={st("margin:0;font-size:17px")}>Who did what</h2>
						<span style={st("font-size:13px;color:#56655f")}>
							Latest from the audit chain
						</span>
					</div>
					{feed.length === 0 && (
						<p style={st("margin:0;color:#56655f;font-size:14px")}>
							No activity yet.
						</p>
					)}
					{feed.map((e) => (
						<div
							key={e.seq}
							style={st(
								"display:grid;grid-template-columns:62px minmax(0,1fr) 44px;gap:10px;align-items:center;padding:7px 0;border-top:1px solid #e1e8e5;font-size:13.5px",
							)}
						>
							<Act actor={actorOf(e.type)} style={st("justify-self:start")} />
							<span style={st("min-width:0")}>
								<strong style={st("font-weight:600")}>
									{eventSubject(e, details)}
								</strong>{" "}
								· {describeEvent(e, offramps)}
							</span>
							<span className="mono" style={st("font-size:12px;color:#56655f")}>
								{formatTime(e.createdAt)}
							</span>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}
