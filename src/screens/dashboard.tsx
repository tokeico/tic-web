import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Cc, Lab } from "@/components/ui";
import { actorOf } from "@/domain/audit";
import {
	type AgentKind,
	DEMO_CORRIDORS,
	DEMO_ESCALATIONS,
	DEMO_FLEET,
	DEMO_MONTHS,
	DEMO_SETTLE_MIN,
	DEMO_STABLE_FEE,
	DEMO_STREAM,
	DEMO_TOTALS,
	type FleetAgent,
	type MonthRow,
	type StreamTemplate,
	type StreamTone,
	paceOf,
	savedOf,
} from "@/domain/ceo-demo";
import { WIRE_FEE_PCT } from "@/domain/data";
import { views } from "@/domain/engine";
import { fmtDate, iso, usd0 } from "@/domain/format";
import { isDemoAdmin } from "@/lib/auth";
import { useStore, type ViewId } from "@/state/store";

/**
 * The CEO's view. Totals and trends only — the work itself (approving,
 * paying, triaging) lives on the payer screens, one click away. The demo
 * admin sees twelve months of fictional history; everyone else sees their
 * own workspace, computed live.
 */

type Kpi = {
	label: string;
	value: number;
	format: (n: number) => string;
	sub: string;
	spark?: number[];
	tone?: "volt" | "jade" | "coral";
};
type Escalation = { tag: string; text: string; view: ViewId };
type StreamItem = StreamTemplate & { key: number };

interface CeoModel {
	demo: boolean;
	months: MonthRow[];
	kpis: Kpi[];
	corridors: { c: string; name: string; usd: number; blocked?: number }[];
	fleet: FleetAgent[];
	stream: StreamTemplate[];
	escalations: Escalation[];
	briefing: string;
	qa: { q: string; a: string }[];
}

const compact = (n: number) =>
	n >= 1e6
		? `$${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`
		: n >= 1e4
			? `$${Math.round(n / 1e3)}k`
			: usd0(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const delta = (now: number, before: number) =>
	`${now >= before ? "+" : "−"}${Math.abs(((now - before) / before) * 100).toFixed(1)}%`;

function demoModel(): CeoModel {
	const t = DEMO_TOTALS;
	const sep = DEMO_MONTHS[10];
	const aug = DEMO_MONTHS[9];
	const oct = DEMO_MONTHS[11];
	return {
		demo: true,
		months: DEMO_MONTHS,
		kpis: [
			{
				label: "Volume paid · 12 mo",
				value: t.volume,
				format: compact,
				sub: `${delta(sep.volume, aug.volume)} Sep vs Aug · ${t.payouts.toLocaleString("en-US")} payouts`,
				spark: DEMO_MONTHS.map((m) => m.volume),
				tone: "volt",
			},
			{
				label: "Saved vs SWIFT",
				value: t.saved,
				format: compact,
				sub: `${pct(oct.stable)} of volume on stablecoin rails at ${DEMO_STABLE_FEE}%`,
				spark: DEMO_MONTHS.map(savedOf),
				tone: "jade",
			},
			{
				label: "Protected by Sentinel",
				value: t.stopped,
				format: compact,
				sub: `${t.threats} threats stopped before approval`,
				spark: DEMO_MONTHS.map((m) => m.stopped),
				tone: "coral",
			},
			{
				label: "Straight-through",
				value: t.straightThrough * 100,
				format: (n) => `${Math.round(n)}%`,
				sub: `${t.hoursSaved.toLocaleString("en-US")} hours of AP work done by agents`,
			},
			{
				label: "Cash committed · 30 days",
				value: t.committed30,
				format: compact,
				sub: `${compact(t.committed7)} releases in the next 7 days`,
			},
		],
		corridors: DEMO_CORRIDORS.map((c) => ({
			...c,
			usd: c.share * t.volume,
		})),
		fleet: DEMO_FLEET,
		stream: DEMO_STREAM,
		escalations: DEMO_ESCALATIONS,
		briefing: `Here's where things stand. In the last 12 months your agents moved ${compact(t.volume)} across ${t.payouts.toLocaleString("en-US")} payouts in four corridors and saved ${compact(t.saved)} versus SWIFT. This month Sentinel stopped ${usd0(oct.stopped)}: a duplicate Estúdio Paulista invoice with swapped bank details, held before anyone approved it. Sanctions kept every Venezuela payout blocked under the OFAC program. Two decisions are waiting on people: a ${usd0(64_865)} Mexico payout needs a second approver, and Radar's BCB Res. 561 update needs compliance sign-off.`,
		qa: [
			{
				q: "How much did we save this year?",
				a: `${usd0(t.saved)} versus sending the same volume by SWIFT wire. ${pct(oct.stable)} of volume now settles over stablecoin rails at an average ${DEMO_STABLE_FEE}% fee, against ${WIRE_FEE_PCT}% by wire, in a median ${DEMO_SETTLE_MIN} minutes instead of about 2 days. September was the best month: ${usd0(savedOf(sep))}.`,
			},
			{
				q: "Where is the money going?",
				a: `Mexico takes 39% of volume, Brazil 31%, Colombia 16% and Argentina 14%. Venezuela is closed: ${usd0(186_400)} in payouts were blocked under the OFAC program and never released.`,
			},
			{
				q: "What did the agents stop?",
				a: `Sentinel stopped ${t.threats} threats worth ${usd0(t.stopped)} in 12 months: injected payment instructions, bank-detail swaps and duplicate invoices. Every one was held before a person approved it, and each hold is in the audit chain with the evidence.`,
			},
			{
				q: "Are we exposed anywhere?",
				a: `No payout left without a sanctions screen: ${t.screenings.toLocaleString("en-US")} screenings, ${t.sanctionsHits} confirmed hit, blocked. The audit chain verifies across ${t.auditEvents.toLocaleString("en-US")} events with no breaks. One watch item: BCB Res. 561 changes Brazil's rules, and Radar's registry update still needs compliance sign-off.`,
			},
		],
	};
}

const LIVE_TONE: Record<string, StreamTone> = {
	AI: "ok",
	Code: "ok",
	Human: "human",
};

function liveModel(store: ReturnType<typeof useStore>): CeoModel {
	const s = store.state;
	const vs = s.loaded ? views(s) : [];
	const paid = vs.filter((v) => v.status === "paid" || v.status === "booked");
	const stopped = vs.filter(
		(v) => v.status === "security_hold" || v.status === "blocked",
	);
	const routed = vs.filter(
		(v) =>
			v.plan.rec?.route.kind === "stablecoin" &&
			!["rejected", "security_hold", "blocked", "needs_info"].includes(
				v.status,
			),
	);
	const committed = vs.filter((v) =>
		["ready", "awaiting_second_approver", "approved"].includes(v.status),
	);
	const total = (list: typeof vs) => list.reduce((t, v) => t + v.p.usd, 0);
	const saved = routed.reduce(
		(t, v) => t + (v.p.usd * (WIRE_FEE_PCT - v.plan.rec!.route.fee)) / 100,
		0,
	);
	const clear = vs.length ? (vs.length - stopped.length) / vs.length : 1;
	const byC = new Map<string, { c: string; name: string; usd: number }>();
	for (const v of vs) {
		const row = byC.get(v.p.c) ?? { c: v.p.c, name: v.p.country, usd: 0 };
		row.usd += v.p.usd;
		byC.set(v.p.c, row);
	}
	const waiting = vs.filter(
		(v) => v.status === "awaiting_second_approver" || v.status === "ready",
	);
	return {
		demo: false,
		months: [],
		kpis: [
			{
				label: "Volume paid",
				value: total(paid),
				format: compact,
				sub: `${paid.length} of ${vs.length} payouts paid`,
				tone: "volt",
			},
			{
				label: "Saved vs SWIFT",
				value: saved,
				format: compact,
				sub: `projected on ${routed.length} stablecoin routes`,
				tone: "jade",
			},
			{
				label: "Protected",
				value: total(stopped),
				format: compact,
				sub: `${stopped.length} held or blocked before release`,
				tone: "coral",
			},
			{
				label: "Cleared to pay",
				value: clear * 100,
				format: (n) => `${Math.round(n)}%`,
				sub: "of payouts passed security and sanctions",
			},
			{
				label: "Cash committed",
				value: total(committed),
				format: compact,
				sub: `${committed.length} payouts ready or awaiting approval`,
			},
		],
		corridors: [...byC.values()].sort((a, b) => b.usd - a.usd),
		fleet: DEMO_FLEET.map((a) => ({ ...a, stat: a.job, sub: "", now: [] })),
		stream: s.events
			.slice(-10)
			.reverse()
			.map((e) => {
				const { actor } = actorOf(e.type);
				return {
					agent: actor,
					kind: actor,
					tone: LIVE_TONE[actor] ?? "ok",
					text: `${e.payee} · ${e.summary}`,
				};
			}),
		escalations: waiting.length
			? [
					{
						tag: "Approval",
						text: `${waiting.length} payout${waiting.length > 1 ? "s" : ""} waiting on an approver`,
						view: "inbox",
					},
				]
			: [],
		briefing: vs.length
			? `Your agents have read ${vs.length} invoices worth ${compact(total(vs))}. ${paid.length} are paid; ${stopped.length} ${stopped.length === 1 ? "was" : "were"} stopped before release, and routing is set to save ${compact(saved)} versus SWIFT. ${waiting.length ? `${waiting.length} ${waiting.length === 1 ? "decision is" : "decisions are"} waiting on a person.` : "Nothing is waiting on a person."}`
			: "Your agents are standing by. Load the demo invoices or upload one, and they'll read, screen, route and explain it here.",
		qa: [
			{
				q: "How much will routing save?",
				a: `${usd0(saved)} versus SWIFT on ${routed.length} stablecoin routes, at fees between the off-ramps' quotes and ${WIRE_FEE_PCT}% by wire.`,
			},
			{
				q: "What did the agents stop?",
				a: stopped.length
					? `${stopped.length} payout${stopped.length > 1 ? "s" : ""} worth ${usd0(total(stopped))}: ${stopped.map((v) => v.p.payee).join(", ")}. Each one is held with its evidence in the audit chain.`
					: "Nothing so far: every payout cleared security and sanctions screening.",
			},
		],
	};
}

/* --- motion helpers -------------------------------------------------- */

function useReducedMotion() {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		const q = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(q.matches);
		const on = () => setReduced(q.matches);
		q.addEventListener("change", on);
		return () => q.removeEventListener("change", on);
	}, []);
	return reduced;
}

function useCountUp(target: number, ms = 1100) {
	const reduced = useReducedMotion();
	const [value, setValue] = useState(0);
	useEffect(() => {
		if (reduced) {
			setValue(target);
			return;
		}
		let frame = 0;
		const start = performance.now();
		const tick = (now: number) => {
			const k = Math.min(1, (now - start) / ms);
			setValue(target * (1 - (1 - k) ** 3));
			if (k < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, ms, reduced]);
	return value;
}

/** Types the text out like the agent is writing it now. */
function Typewriter({ text, speed = 14 }: { text: string; speed?: number }) {
	const reduced = useReducedMotion();
	const [n, setN] = useState(0);
	useEffect(() => {
		setN(0);
		if (reduced) {
			setN(text.length);
			return;
		}
		const id = setInterval(
			() =>
				setN((k) => {
					if (k >= text.length) {
						clearInterval(id);
						return k;
					}
					return k + 2;
				}),
			speed,
		);
		return () => clearInterval(id);
	}, [text, speed, reduced]);
	const done = n >= text.length;
	return (
		<span>
			<span className="sr-only">{text}</span>
			<span aria-hidden="true">
				{text.slice(0, n)}
				{!done && <span className="caret" />}
			</span>
		</span>
	);
}

function useWidth<T extends HTMLElement>(fallback: number) {
	const ref = useRef<T>(null);
	const [width, setWidth] = useState(fallback);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(([entry]) =>
			setWidth(Math.max(280, entry.contentRect.width)),
		);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return [ref, width] as const;
}

/* --- pieces ------------------------------------------------------------ */

const ACT_CLS: Record<AgentKind | "Human", string> = {
	AI: "act act-ai",
	Code: "act act-code",
	"AI + Code": "act act-ai",
	Human: "act act-human",
};

function Spark({ values, tone }: { values: number[]; tone?: Kpi["tone"] }) {
	const w = 112;
	const h = 30;
	const max = Math.max(...values, 1);
	const pts = values.map(
		(v, i) =>
			[(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 6)] as const,
	);
	const last = pts[pts.length - 1];
	return (
		<svg
			width={w}
			height={h}
			viewBox={`0 0 ${w} ${h}`}
			aria-hidden="true"
			className="overflow-visible"
		>
			<polyline
				points={pts.map((p) => p.join(",")).join(" ")}
				fill="none"
				stroke="var(--color-ash-faint)"
				strokeWidth={1.5}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<circle
				cx={last[0]}
				cy={last[1]}
				r={3}
				fill={tone ? `var(--color-${tone})` : "var(--color-bone)"}
			/>
		</svg>
	);
}

function KpiTile({ kpi }: { kpi: Kpi }) {
	const shown = useCountUp(kpi.value);
	return (
		<div className="kpi ceo-kpi">
			<Lab>{kpi.label}</Lab>
			<div className="flex items-end justify-between gap-2">
				<span
					className="mono"
					style={{
						fontWeight: 600,
						fontSize: 28,
						lineHeight: 1.05,
						fontVariantNumeric: "tabular-nums",
						color: kpi.tone === "volt" ? "var(--color-volt)" : undefined,
					}}
				>
					{kpi.format(shown)}
				</span>
				{kpi.spark && <Spark values={kpi.spark} tone={kpi.tone} />}
			</div>
			<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
				{kpi.sub}
			</span>
		</div>
	);
}

function VolumeChart({ months }: { months: MonthRow[] }) {
	const [ref, width] = useWidth<HTMLDivElement>(720);
	const [hover, setHover] = useState<number | null>(null);
	const h = 240;
	const pad = { l: 52, r: 18, t: 14, b: 28 };
	const step = 500_000;
	const top = Math.ceil(Math.max(...months.map(paceOf)) / step) * step;
	const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
	const x = (i: number) =>
		pad.l + (i * (width - pad.l - pad.r)) / (months.length - 1);
	const y = (v: number) => pad.t + (1 - v / top) * (h - pad.t - pad.b);
	const pts = months.map((m, i) => [x(i), y(paceOf(m))] as const);
	const full = months.findIndex((m) => m.partial);
	const solidTo = full === -1 ? pts.length : full;
	const line = (from: number, to: number) =>
		pts
			.slice(from, to)
			.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`)
			.join(" ");
	const area = `${line(0, pts.length)} L${x(pts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
	const hv = hover == null ? null : months[hover];

	return (
		<div ref={ref} className="relative min-w-0 overflow-hidden">
			<svg
				width={width}
				height={h}
				role="img"
				aria-label="Monthly volume paid, last 12 months"
				onMouseLeave={() => setHover(null)}
				onMouseMove={(e) => {
					const box = e.currentTarget.getBoundingClientRect();
					const i = Math.round(
						((e.clientX - box.left - pad.l) / (width - pad.l - pad.r)) *
							(months.length - 1),
					);
					setHover(Math.max(0, Math.min(months.length - 1, i)));
				}}
			>
				<defs>
					<linearGradient id="vol-fill" x1="0" x2="0" y1="0" y2="1">
						<stop
							offset="0%"
							stopColor="var(--color-volt)"
							stopOpacity={0.22}
						/>
						<stop offset="100%" stopColor="var(--color-volt)" stopOpacity={0} />
					</linearGradient>
				</defs>
				{ticks.map((t) => (
					<g key={t}>
						<line
							x1={pad.l}
							x2={width - pad.r}
							y1={y(t)}
							y2={y(t)}
							stroke="var(--color-edge-soft)"
						/>
						<text
							x={pad.l - 10}
							y={y(t) + 4}
							textAnchor="end"
							className="mono"
							fontSize={11}
							fill="var(--color-ash-faint)"
						>
							{t ? `$${t / 1e6}M` : "$0"}
						</text>
					</g>
				))}
				{months.map((m, i) => (
					<text
						key={m.label}
						x={x(i)}
						y={h - 8}
						textAnchor="middle"
						className="mono"
						fontSize={11}
						fill={hover === i ? "var(--color-bone)" : "var(--color-ash-faint)"}
					>
						{m.label}
					</text>
				))}
				<path d={area} fill="url(#vol-fill)" className="ceo-fade" />
				<path
					d={line(0, solidTo)}
					fill="none"
					stroke="var(--color-volt)"
					strokeWidth={2}
					strokeLinejoin="round"
					pathLength={1}
					className="ceo-draw"
				/>
				{full > 0 && (
					<path
						d={line(full - 1, pts.length)}
						fill="none"
						stroke="var(--color-volt)"
						strokeWidth={2}
						strokeDasharray="4 4"
						className="ceo-fade"
					/>
				)}
				{hv && hover != null && (
					<line
						x1={x(hover)}
						x2={x(hover)}
						y1={pad.t}
						y2={y(0)}
						stroke="var(--color-edge-bright)"
					/>
				)}
				{pts.map(([px, py], i) => (
					<circle
						key={months[i].label}
						cx={px}
						cy={py}
						r={hover === i ? 5 : i === pts.length - 1 ? 4 : 0}
						fill={
							months[i].partial ? "var(--color-panel)" : "var(--color-volt)"
						}
						stroke={
							months[i].partial ? "var(--color-volt)" : "var(--color-panel)"
						}
						strokeWidth={2}
					/>
				))}
			</svg>
			{hv && hover != null && (
				<div
					className="ceo-tip"
					style={{
						left: Math.min(Math.max(x(hover) - 90, 0), width - 190),
						top: Math.max(y(paceOf(hv)) - 128, 0),
					}}
				>
					<strong className="mono">
						{hv.label} {hover < 2 ? "2025" : "2026"}
						{hv.partial ? " · month to date" : ""}
					</strong>
					<span>
						Paid <b className="mono">{usd0(hv.volume)}</b>
					</span>
					{hv.partial && (
						<span>
							On pace for <b className="mono">{usd0(paceOf(hv))}</b>
						</span>
					)}
					<span>
						Saved <b className="mono">{usd0(savedOf(hv))}</b>
					</span>
					<span>
						{hv.payouts} payouts · {pct(hv.stable)} stablecoin
					</span>
				</div>
			)}
		</div>
	);
}

function Corridors({ rows }: { rows: CeoModel["corridors"] }) {
	const max = Math.max(...rows.map((r) => r.usd), 1);
	const total = rows.reduce((t, r) => t + r.usd, 0) || 1;
	return (
		<ul className="m-0 flex list-none flex-col gap-3 p-0">
			{rows.map((r, i) => (
				<li
					key={r.c}
					className="flex flex-col gap-1.5"
					title={
						r.blocked
							? `${r.name}: ${usd0(r.blocked)} blocked (OFAC)`
							: `${r.name}: ${usd0(r.usd)} · ${pct(r.usd / total)} of volume`
					}
				>
					<div className="flex items-center justify-between gap-2">
						<span className="flex items-center gap-2" style={{ fontSize: 14 }}>
							<Cc code={r.c} label={r.name} />
							{r.name}
						</span>
						{r.blocked ? (
							<span className="pill p-bad">Blocked · OFAC</span>
						) : (
							<span className="mono text-ash" style={{ fontSize: 13 }}>
								{compact(r.usd)}{" "}
								<span className="text-ash-faint">{pct(r.usd / total)}</span>
							</span>
						)}
					</div>
					<div className="ceo-track">
						<div
							className={r.blocked ? "ceo-bar ceo-bar-blocked" : "ceo-bar"}
							style={{
								width: r.blocked ? "100%" : `${(r.usd / max) * 100}%`,
								animationDelay: `${i * 90}ms`,
							}}
						/>
					</div>
				</li>
			))}
		</ul>
	);
}

function AgentCard({ agent, index }: { agent: FleetAgent; index: number }) {
	const [k, setK] = useState(0);
	useEffect(() => {
		if (agent.now.length < 2) return;
		let id: ReturnType<typeof setInterval> | undefined;
		const start = setTimeout(() => {
			id = setInterval(() => setK((n) => n + 1), 4200);
		}, index * 650);
		return () => {
			clearTimeout(start);
			clearInterval(id);
		};
	}, [agent.now.length, index]);
	const now = agent.now.length ? agent.now[k % agent.now.length] : null;
	return (
		<div className="agent-card">
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-2">
					<span className="agent-dot" aria-hidden="true" />
					<span className="display" style={{ fontSize: 18 }}>
						{agent.name}
					</span>
				</span>
				<span className={ACT_CLS[agent.kind]}>{agent.kind}</span>
			</div>
			<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
				{agent.job}
			</span>
			{now && (
				<div className="agent-now" key={k}>
					<span className="agent-eq" aria-hidden="true">
						<i />
						<i />
						<i />
					</span>
					<span>{now}</span>
				</div>
			)}
			{agent.sub && (
				<div className="mt-auto flex flex-col gap-0.5 border-t border-edge-soft pt-2">
					<span className="mono" style={{ fontWeight: 600, fontSize: 15 }}>
						{agent.stat}
					</span>
					<span className="text-ash-dim" style={{ fontSize: 12 }}>
						{agent.sub}
					</span>
				</div>
			)}
		</div>
	);
}

const TONE_CLS: Record<StreamTone, string> = {
	ok: "stream-ok",
	warn: "stream-warn",
	bad: "stream-bad",
	human: "stream-human",
};

/** In the demo the feed keeps arriving; live, it shows the latest audit events. */
function Stream({ items, loop }: { items: StreamTemplate[]; loop: boolean }) {
	const reduced = useReducedMotion();
	const [feed, setFeed] = useState<StreamItem[]>(() =>
		items.slice(0, 6).map((t, i) => ({ ...t, key: i })),
	);
	const [ages, setAges] = useState<number[]>(() =>
		loop ? [2, 7, 13, 21, 30, 42] : [],
	);
	useEffect(() => {
		if (!loop || reduced || items.length === 0) return;
		let n = 6;
		const id = setInterval(() => {
			const next = { ...items[n % items.length], key: n };
			n += 1;
			setFeed((f) => [next, ...f].slice(0, 7));
			setAges((a) => [0, ...a.map((s) => s + 3)].slice(0, 7));
		}, 3000);
		return () => clearInterval(id);
	}, [items, loop, reduced]);
	if (!feed.length)
		return (
			<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
				No agent activity yet.
			</p>
		);
	return (
		<ol className="m-0 flex list-none flex-col p-0" aria-live="off">
			{feed.map((e, i) => (
				<li key={e.key} className={`stream-row ${TONE_CLS[e.tone]}`}>
					<span className={ACT_CLS[e.kind]}>{e.agent}</span>
					<span className="min-w-0" style={{ fontSize: 13.5 }}>
						{e.text}
					</span>
					<span className="mono text-ash-faint" style={{ fontSize: 11.5 }}>
						{loop
							? i < ages.length
								? ages[i] === 0
									? "now"
									: `${ages[i]}s`
								: "earlier"
							: ""}
					</span>
				</li>
			))}
		</ol>
	);
}

function Briefing({ model }: { model: CeoModel }) {
	const [asked, setAsked] = useState<number | null>(null);
	const [thinking, setThinking] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	const ask = (i: number) => {
		setAsked(i);
		setThinking(true);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setThinking(false), 900);
	};
	return (
		<div className="brief">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="flex items-center gap-2">
					<span className="agent-dot" aria-hidden="true" />
					<Lab>Agent briefing</Lab>
				</span>
				<span className="text-ash-faint mono" style={{ fontSize: 11.5 }}>
					written by your agents · cited from the audit chain
				</span>
			</div>
			<p className="m-0" style={{ fontSize: 17, lineHeight: 1.55 }}>
				<Typewriter text={model.briefing} />
			</p>
			<div className="flex flex-col gap-2 border-t border-edge-soft pt-3">
				<Lab>Ask your agents</Lab>
				<div className="flex flex-wrap gap-2">
					{model.qa.map((qa, i) => (
						<button
							key={qa.q}
							type="button"
							className={`sugg${asked === i ? " sugg-on" : ""}`}
							aria-pressed={asked === i}
							onClick={() => ask(i)}
						>
							{qa.q}
						</button>
					))}
				</div>
				{asked != null && (
					<div className="answer" aria-live="polite">
						{thinking ? (
							<span className="shimmer">
								Consulting Router, Sentinel and the ledger…
							</span>
						) : (
							<Typewriter key={asked} text={model.qa[asked].a} speed={10} />
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function Section({
	title,
	aside,
	children,
	className = "",
}: {
	title: string;
	aside?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={`card min-w-0 ${className}`} aria-label={title}>
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="m-0" style={{ fontSize: 16 }}>
					{title}
				</h2>
				{aside}
			</div>
			{children}
		</section>
	);
}

export function DashboardPage() {
	const store = useStore();
	const demo = isDemoAdmin(store.user);
	const live = demo ? null : liveModel(store);
	const model = useMemo(() => (demo ? demoModel() : null), [demo]) ?? live!;
	const online = model.fleet.length;

	return (
		<main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-5 py-6">
			<section className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className="pill p-ok">
							<span className="agent-dot" aria-hidden="true" />
							{online} agents online
						</span>
						<span className="text-ash-dim mono" style={{ fontSize: 12 }}>
							{fmtDate(iso(store.state.day))}
						</span>
					</div>
					<h1
						className="display-hero m-0"
						style={{ fontSize: 34, lineHeight: 1.08 }}
					>
						Your payments run themselves.
						<span className="text-ash"> You set the rules.</span>
					</h1>
				</div>
				<span className="text-ash-dim" style={{ fontSize: 13 }}>
					Agents read, screen, route and reconcile. A person approves every
					release.
				</span>
			</section>

			<div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
				<Briefing model={model} />
				<Section
					title="Waiting on people"
					aside={
						<span className="mono text-ash-dim" style={{ fontSize: 13 }}>
							{model.escalations.length}
						</span>
					}
				>
					{model.escalations.length === 0 && (
						<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
							Nothing needs a decision. The agents are handling it.
						</p>
					)}
					{model.escalations.map((e) => (
						<button
							key={e.text}
							type="button"
							className="escalation"
							onClick={() => store.go(e.view)}
						>
							<span className="pill p-warn">{e.tag}</span>
							<span style={{ fontSize: 13.5 }}>{e.text}</span>
							<span className="text-ash-dim" aria-hidden="true">
								→
							</span>
						</button>
					))}
					<span className="mt-auto text-ash-faint" style={{ fontSize: 12 }}>
						Agents propose; they never release money on their own.
					</span>
				</Section>
			</div>

			<section
				aria-label="Key numbers"
				className="grid gap-3"
				style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}
			>
				{model.kpis.map((k) => (
					<KpiTile key={k.label} kpi={k} />
				))}
			</section>

			<div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
				<Section
					title="Volume paid"
					aside={
						<span className="text-ash-dim" style={{ fontSize: 13 }}>
							{model.months.length
								? "Last 12 months · USD · dashed = October on pace"
								: "History builds as you pay"}
						</span>
					}
				>
					{model.months.length > 1 ? (
						<VolumeChart months={model.months} />
					) : (
						<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
							The trend appears after your first month of payouts.
						</p>
					)}
				</Section>
				<Section
					title="Where the money goes"
					aside={
						<span className="text-ash-dim" style={{ fontSize: 13 }}>
							by corridor
						</span>
					}
				>
					{model.corridors.length ? (
						<Corridors rows={model.corridors} />
					) : (
						<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
							No payouts yet.
						</p>
					)}
				</Section>
			</div>

			<Section
				title="The agent fleet"
				aside={
					<span className="text-ash-dim" style={{ fontSize: 13 }}>
						Autonomy: agents propose · a person approves over policy
					</span>
				}
			>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{model.fleet.map((a, i) => (
						<AgentCard key={a.id} agent={a} index={i} />
					))}
				</div>
			</Section>

			<Section
				title="Live agent activity"
				aside={
					<span
						className="flex items-center gap-2 text-ash-dim"
						style={{ fontSize: 13 }}
					>
						<span className="live-dot" aria-hidden="true" />
						{model.demo ? "streaming" : "latest from the audit chain"}
					</span>
				}
			>
				<Stream items={model.stream} loop={model.demo} />
			</Section>

		</main>
	);
}
