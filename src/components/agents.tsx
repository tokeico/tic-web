import { useEffect, useState } from "react";
import { Lab } from "@/components/ui";
import type {
	AgentKind,
	FleetAgent,
	StreamTemplate,
	StreamTone,
} from "@/domain/ceo-demo";

/**
 * The agentic layer shared by Dashboard, Agents and the work screens: live
 * agent cards, the streaming activity feed, typed text and counting numbers.
 * Every motion stops under prefers-reduced-motion.
 */

export type Kpi = {
	label: string;
	value: number;
	format: (n: number) => string;
	sub: string;
	spark?: number[];
	tone?: "jade" | "coral";
};

export type StreamItem = StreamTemplate & { key: number };

export function useReducedMotion() {
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

export function useCountUp(target: number, ms = 1100) {
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
export function Typewriter({
	text,
	speed = 14,
}: {
	text: string;
	speed?: number;
}) {
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

export const ACT_CLS: Record<AgentKind | "Human", string> = {
	AI: "act act-ai",
	Code: "act act-code",
	"AI + Code": "act act-ai",
	Human: "act act-human",
};

/** Stretches to the room its tile has; the end dot stays round. */
export function Spark({
	values,
	tone,
}: {
	values: number[];
	tone?: Kpi["tone"];
}) {
	const w = 112;
	const h = 30;
	const max = Math.max(...values, 1);
	const pts = values.map(
		(v, i) =>
			[(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 6)] as const,
	);
	const last = pts[pts.length - 1];
	return (
		<span className="relative block h-[30px] w-full">
			<svg
				width="100%"
				height={h}
				viewBox={`0 0 ${w} ${h}`}
				preserveAspectRatio="none"
				aria-hidden="true"
				className="block overflow-visible"
			>
				<polyline
					points={pts.map((p) => p.join(",")).join(" ")}
					fill="none"
					stroke="var(--color-ash-faint)"
					strokeWidth={1.5}
					strokeLinejoin="round"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			<span
				aria-hidden="true"
				className="absolute size-1.5 rounded-full"
				style={{
					right: -3,
					top: last[1] - 3,
					background: tone ? `var(--color-${tone})` : "var(--color-bone)",
				}}
			/>
		</span>
	);
}

export function KpiTile({ kpi }: { kpi: Kpi }) {
	const shown = useCountUp(kpi.value);
	return (
		<div className="kpi ceo-kpi">
			<Lab>{kpi.label}</Lab>
			<div className="kpi-val flex items-end justify-between gap-2">
				<span
					className="mono flex-none"
					style={{
						fontWeight: 600,
						fontSize: "clamp(18px, 14cqi, 34px)",
						lineHeight: 1.05,
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{kpi.format(shown)}
				</span>
				{kpi.spark && (
					<span className="kpi-spark">
						<Spark values={kpi.spark} tone={kpi.tone} />
					</span>
				)}
			</div>
			<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
				{kpi.sub}
			</span>
		</div>
	);
}

export function AgentCard({
	agent,
	index,
}: {
	agent: FleetAgent;
	index: number;
}) {
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

export const TONE_CLS: Record<StreamTone, string> = {
	ok: "stream-ok",
	warn: "stream-warn",
	bad: "stream-bad",
	human: "stream-human",
};

/** In the demo the feed keeps arriving; live, it shows the latest audit events. */
export function Stream({
	items,
	loop,
	compact = false,
}: {
	items: StreamTemplate[];
	loop: boolean;
	/** Narrow columns: the agent tag sits on its own line. */
	compact?: boolean;
}) {
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
		<ol
			className={`m-0 flex list-none flex-col p-0${compact ? " stream-compact" : ""}`}
			aria-live="off"
		>
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

/** The top bar's pulse: how many agents are on, and what one of them is doing right now. */
export function AgentTicker({ fleet }: { fleet: FleetAgent[] }) {
	const reduced = useReducedMotion();
	const [k, setK] = useState(0);
	const lines = fleet.flatMap((a) =>
		a.now.map((text) => ({ agent: a.name, text })),
	);
	useEffect(() => {
		if (reduced || lines.length < 2) return;
		const id = setInterval(() => setK((n) => n + 1), 3800);
		return () => clearInterval(id);
	}, [reduced, lines.length]);
	const now = lines.length ? lines[k % lines.length] : null;
	return (
		<span className="agent-ticker">
			<span className="agent-dot" aria-hidden="true" />
			<span className="agent-ticker-count">{fleet.length} agents online</span>
			{now && (
				<span key={k} className="agent-ticker-now" aria-hidden="true">
					<strong>{now.agent}</strong> {now.text}
				</span>
			)}
		</span>
	);
}

/** A row of counting tiles: the summary strip on the work screens. */
export function KpiRow({ kpis, label }: { kpis: Kpi[]; label: string }) {
	return (
		<section
			aria-label={label}
			className="grid gap-3"
			style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}
		>
			{kpis.map((k) => (
				<KpiTile key={k.label} kpi={k} />
			))}
		</section>
	);
}

export const count = (n: number) => String(Math.round(n));
