import { Play } from "@/components/icons";
import { Card, Disclosure, Lab } from "@/components/ui";
import { actorOf } from "@/domain/audit";
import { views } from "@/domain/engine";
import { fmtDate, iso, usd0 } from "@/domain/format";
import { useStore } from "@/state/store";

/**
 * The overview answers one question: what needs me? Everything else — the
 * pipeline, the pitch numbers — waits one click away, because a controller
 * opens this screen to act, not to read about the machine.
 */
export function OverviewPage() {
	const { state, go, open, loadDemo, startTour } = useStore();
	const s = state;
	const asOf = iso(s.day);
	const L = s.loaded;
	const vs = L ? views(s) : [];
	const pending = s.actions.filter((a) => a.status === "pending");

	const routed = vs.filter(
		(v) =>
			v.plan.rec &&
			v.plan.rec.route.kind === "stablecoin" &&
			!["rejected", "security_hold", "blocked", "needs_info"].includes(
				v.status,
			),
	);
	const savings = routed.reduce(
		(t, v) => t + (v.p.usd * (4.5 - v.plan.rec!.route.fee)) / 100,
		0,
	);
	const avgMin = routed.length
		? Math.round(
				routed.reduce((t, v) => t + v.plan.rec!.route.min, 0) / routed.length,
			)
		: 0;
	const stops = vs.filter(
		(v) =>
			v.status === "security_hold" ||
			v.status === "blocked" ||
			(v.status === "rejected" && v.p.security),
	).length;
	const waiting = vs.filter(
		(v) => v.status === "ready" || v.status === "awaiting_second_approver",
	).length;
	const checksN = vs.reduce(
		(t, v) => t + v.plan.evals.reduce((t2, e) => t2 + e.results.length, 0),
		0,
	);

	const stages: [string, string, string, string][] = [
		[
			"Intake",
			"AI",
			"The model reads the PDF into typed fields",
			L ? String(vs.length) : "—",
		],
		[
			"Security scan",
			"AI + Code",
			"Injection, bank change, duplicates",
			L ? `${vs.filter((v) => v.p.security).length} flagged` : "—",
		],
		[
			"Sanctions screen",
			"Code",
			"OFAC SDN fuzzy match",
			L ? `${vs.length} clear` : "—",
		],
		[
			"Rules engine",
			"Code",
			`Deterministic, as of ${fmtDate(asOf).replace(", 2026", "")}`,
			L ? `${checksN} checks` : "—",
		],
		[
			"Memo",
			"AI",
			"Explains with citations, never decides",
			L ? String(vs.length) : "—",
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
						vs.filter((v) => v.status === "paid" || v.status === "booked")
							.length,
					)
				: "—",
		],
		[
			"Reconcile and book",
			"Code",
			"Match references, journal entry",
			L ? String(vs.filter((v) => v.status === "booked").length) : "—",
		],
	];

	const needs: {
		tag: string;
		cls: string;
		text: string;
		cta: string;
		go: () => void;
	}[] = [];
	vs.forEach((v) => {
		const num = v.m.edits?.number || v.p.inv.number;
		const openIt = () => open(v.p.id);
		if (v.status === "security_hold")
			needs.push({
				tag: "Security",
				cls: "pill p-bad",
				text: `${v.p.payee} ${num}: injected instructions and changed bank details`,
				cta: "Review",
				go: openIt,
			});
		else if (v.status === "awaiting_second_approver")
			needs.push({
				tag: "Approve",
				cls: "pill p-warn",
				text: `${v.p.payee} needs a second approver`,
				cta: "Open",
				go: openIt,
			});
		else if (v.status === "ready")
			needs.push({
				tag: "Approve",
				cls: "pill p-ok",
				text:
					`${v.p.payee} is ready` +
					(v.plan.rec?.warns ? " (warning to acknowledge)" : ""),
				cta: "Open",
				go: openIt,
			});
		else if (v.status === "needs_info")
			needs.push({
				tag: "Info",
				cls: "pill p-warn",
				text: `${v.p.payee} is missing required fields`,
				cta: "Open",
				go: openIt,
			});
		else if (v.status === "approved")
			needs.push({
				tag: "Pay",
				cls: "pill p-neutral",
				text: `${v.p.payee} is approved and ready to pay`,
				cta: "Open",
				go: openIt,
			});
		else if (v.status === "paid")
			needs.push({
				tag: "Book",
				cls: "pill p-neutral",
				text: `${v.p.payee} is paid and ready to reconcile`,
				cta: "Open",
				go: openIt,
			});
	});
	if (pending.length)
		needs.push({
			tag: "Agent",
			cls: "pill p-ok",
			text:
				pending.length +
				" agent proposal" +
				(pending.length > 1 ? "s" : "") +
				" waiting for you",
			cta: "Review",
			go: () => go("agent"),
		});
	if (L && s.radar === "pending")
		needs.push({
			tag: "Compliance",
			cls: "pill p-warn",
			text: "Registry update proposed by the regulatory radar",
			cta: "Review",
			go: () => go("trust"),
		});

	const feed = s.events
		.slice(-5)
		.reverse()
		.map((e) => ({ ...e, ...actorOf(e.type) }));

	return (
		<main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-6">
			<section className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex max-w-[760px] flex-col gap-2">
					<h1
						className="display-hero m-0"
						style={{
							fontSize: 34,
							lineHeight: 1.08,
							letterSpacing: "-.01em",
						}}
					>
						AI reads and explains. Code decides. A person approves.
					</h1>
					<p className="m-0 text-ash" style={{ fontSize: 15 }}>
						Every step lands in a hash-chained audit trail.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{!s.loaded && !s.loading && (
						<button type="button" className="btn" onClick={loadDemo}>
							Load the demo invoices
						</button>
					)}
					<button type="button" className="btn btn-primary" onClick={startTour}>
						<Play />
						Start the guided demo
					</button>
				</div>
			</section>

			<section aria-label="Needs a person">
				<Card>
					<div className="flex items-baseline justify-between gap-2">
						<h2 className="m-0" style={{ fontSize: 17 }}>
							Needs a person
						</h2>
						<span className="text-ash-dim" style={{ fontSize: 13 }}>
							{needs.length ? `${needs.length} items` : ""}
						</span>
					</div>
					{needs.length === 0 && (
						<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
							{L
								? "Nothing waiting. Approve, pay and reconcile from the inbox."
								: "Load the demo invoices to start."}
						</p>
					)}
					{needs.map((nd) => (
						<div
							key={nd.tag + nd.text}
							className="flex items-center justify-between gap-2.5 border-t border-edge-soft py-2"
						>
							<div className="flex min-w-0 items-center gap-2.5">
								<span className={nd.cls}>{nd.tag}</span>
								<span style={{ fontSize: 14 }}>{nd.text}</span>
							</div>
							<button type="button" className="btn btn-sm" onClick={nd.go}>
								{nd.cta}
							</button>
						</div>
					))}
				</Card>
			</section>

			<section
				aria-label="Key numbers"
				className="flex flex-wrap items-baseline gap-x-12 gap-y-4"
			>
				<div className="flex flex-col gap-0.5">
					<Lab>Fees saved vs. SWIFT</Lab>
					<span
						className="mono"
						style={{
							fontWeight: 600,
							fontSize: 24,
							lineHeight: 1.1,
							fontVariantNumeric: "tabular-nums",
							color: "var(--color-volt)",
						}}
					>
						{L ? usd0(savings) : "—"}
					</span>
					<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
						{L
							? `on ${routed.length} stablecoin payouts`
							: "load the demo invoices"}
					</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<Lab>Settlement time</Lab>
					<span
						className="mono"
						style={{
							fontWeight: 600,
							fontSize: 24,
							lineHeight: 1.1,
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{L && avgMin ? `${avgMin} min` : "—"}
					</span>
					<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
						average, vs. about 2 days by wire
					</span>
				</div>
				{L && (
					<div className="flex flex-col gap-0.5">
						<Lab>Stops</Lab>
						<span
							className="mono"
							style={{
								fontWeight: 600,
								fontSize: 24,
								lineHeight: 1.1,
								fontVariantNumeric: "tabular-nums",
								color: stops ? "var(--color-coral)" : undefined,
							}}
						>
							{String(stops)}
						</span>
						<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
							security holds and sanctions blocks
						</span>
					</div>
				)}
				<span className="text-ash-faint" style={{ fontSize: 12 }}>
					Demo data: fictional providers, snapshot FX rates.
				</span>
			</section>

			<section
				aria-label="Who did what"
				className="flex flex-wrap items-start gap-4"
			>
				<Card className="min-w-0 flex-[1_1_420px]">
					<div className="flex items-baseline justify-between gap-2">
						<h2 className="m-0" style={{ fontSize: 17 }}>
							Who did what
						</h2>
						<span className="text-ash-dim" style={{ fontSize: 13 }}>
							Latest from the audit chain
						</span>
					</div>
					{feed.length === 0 && (
						<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
							No activity yet.
						</p>
					)}
					{feed.map((e) => (
						<div
							key={e.seq}
							className="grid items-center gap-2.5 border-t border-edge-soft py-[7px]"
							style={{
								gridTemplateColumns: "62px minmax(0,1fr) 44px",
								fontSize: 13.5,
							}}
						>
							<span className={e.cls} style={{ justifySelf: "start" }}>
								{e.actor}
							</span>
							<span className="min-w-0">
								<strong className="font-semibold">{e.payee}</strong> ·{" "}
								{e.summary}
							</span>
							<span className="mono text-ash-dim" style={{ fontSize: 12 }}>
								{e.time}
							</span>
						</div>
					))}
				</Card>

				<div className="min-w-0 flex-[1_1_420px]">
					<Disclosure summary="The pipeline · 8 steps · who owns each one">
						<ol
							className="m-0 grid list-none gap-2 p-0"
							style={{
								gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
							}}
						>
							{stages.map(([name, actor, sub, count], i) => (
								<li key={name} className="stage">
									<div className="flex items-center justify-between gap-1.5">
										<span
											className="mono text-ash-faint"
											style={{ fontSize: 12 }}
										>
											{`0${i + 1}`}
										</span>
										<span
											className={
												"act " +
												(actor === "Human"
													? "act-human"
													: actor === "Code"
														? "act-code"
														: "act-ai")
											}
										>
											{actor}
										</span>
									</div>
									<span className="font-semibold" style={{ fontSize: 15 }}>
										{name}
									</span>
									<span
										className="mono"
										style={{
											fontWeight: 600,
											fontSize: 22,
											lineHeight: 1.1,
											fontVariantNumeric: "tabular-nums",
										}}
									>
										{count}
									</span>
									<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
										{sub}
									</span>
								</li>
							))}
						</ol>
					</Disclosure>
				</div>
			</section>
		</main>
	);
}
