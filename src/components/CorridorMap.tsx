import { useEffect, useMemo, useState } from "react";
import { AMERICAS } from "@/components/landing/americas";
import { Cc } from "@/components/ui";
import { usd0 } from "@/domain/format";

/**
 * Where the money goes, drawn as corridors out of the United States. Land is
 * the brand's dot grid sampled from the same Natural Earth outline the
 * landing globe uses; arc weight is the corridor's share of volume. The
 * legend carries the numbers, so the map can stay quiet.
 */

export type CorridorRow = {
	c: string;
	name: string;
	usd: number;
	blocked?: number;
};

/** Payout origin and the point each corridor lands on (lon, lat). */
const ORIGIN: readonly [number, number] = [-97, 38];
const ANCHOR: Record<string, readonly [number, number]> = {
	MX: [-102, 23.5],
	CO: [-73.5, 4.6],
	VE: [-66, 7.5],
	BR: [-50, -11],
	AR: [-64, -34],
};

// Crop: southern US to Tierra del Fuego.
const LON0 = -122;
const LON1 = -32;
const LAT0 = 50;
const LAT1 = -56;
const K = 4; // viewBox units per degree
const W = (LON1 - LON0) * K;
const H = (LAT0 - LAT1) * K;
const STEP = 1.6; // degrees between land dots

const px = (lon: number) => (lon - LON0) * K;
const py = (lat: number) => (LAT0 - lat) * K;

function isLand(lon: number, lat: number) {
	let inside = false;
	for (const ring of AMERICAS) {
		let hit = false;
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xi, yi] = ring[i];
			const [xj, yj] = ring[j];
			if (
				yi > lat !== yj > lat &&
				lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
			)
				hit = !hit;
		}
		if (hit) inside = !inside;
	}
	return inside;
}

/** One path of zero-length segments; round caps turn them into dots. */
let landPath: string | null = null;
function land() {
	if (landPath) return landPath;
	const parts: string[] = [];
	for (let lat = LAT0 - STEP / 2; lat > LAT1; lat -= STEP) {
		for (let lon = LON0 + STEP / 2; lon < LON1; lon += STEP) {
			if (isLand(lon, lat))
				parts.push(`M${px(lon).toFixed(1)},${py(lat).toFixed(1)}h0`);
		}
	}
	landPath = parts.join("");
	return landPath;
}

/** A bowed arc from the origin, bending toward the Atlantic. */
function arc(to: readonly [number, number]) {
	const x0 = px(ORIGIN[0]);
	const y0 = py(ORIGIN[1]);
	const x1 = px(to[0]);
	const y1 = py(to[1]);
	const dx = x1 - x0;
	const dy = y1 - y0;
	const bow = 0.22;
	const cx = (x0 + x1) / 2 - dy * bow;
	const cy = (y0 + y1) / 2 + dx * bow;
	return `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
}

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

const compact = (n: number) =>
	n >= 1e6
		? `$${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`
		: n >= 1e4
			? `$${Math.round(n / 1e3)}k`
			: usd0(n);

export function CorridorMap({ rows }: { rows: CorridorRow[] }) {
	const reduced = useReducedMotion();
	const [active, setActive] = useState<string | null>(null);
	const dots = useMemo(land, []);
	const total = rows.reduce((t, r) => t + (r.blocked ? 0 : r.usd), 0) || 1;
	const max = Math.max(...rows.map((r) => (r.blocked ? 0 : r.usd)), 1);
	const mapped = rows.filter((r) => ANCHOR[r.c]);
	const share = (r: CorridorRow) => (r.blocked ? 0 : r.usd / total);
	const pct = (r: CorridorRow) => `${Math.round(share(r) * 100)}%`;
	const label = mapped
		.map((r) =>
			r.blocked
				? `${r.name} blocked`
				: `${r.name} ${compact(r.usd)} (${pct(r)})`,
		)
		.join(", ");

	return (
		<div className="corridor-map">
			<div className="cm-inner">
				<svg
					viewBox={`0 0 ${W} ${H}`}
					className="corridor-svg"
					role="img"
					aria-label={`Payment corridors from the United States: ${label}.`}
				>
					<defs>
						<radialGradient id="cm-glow" cx="50%" cy="50%" r="50%">
							<stop
								offset="0%"
								stopColor="var(--color-volt)"
								stopOpacity={0.5}
							/>
							<stop
								offset="100%"
								stopColor="var(--color-volt)"
								stopOpacity={0}
							/>
						</radialGradient>
					</defs>
					<path
						d={dots}
						stroke="var(--color-ash-faint)"
						strokeOpacity={0.55}
						strokeWidth={3}
						strokeLinecap="round"
					/>

					{mapped.map((r, i) => {
						const to = ANCHOR[r.c];
						const d = arc(to);
						const on = active === r.c;
						const dim = active != null && !on;
						const weight = r.blocked ? 1.6 : 1.4 + (r.usd / max) * 3.6;
						return (
							// biome-ignore lint/a11y/noStaticElementInteractions: hover mirror of the legend, which carries focus
							<g
								key={r.c}
								className="cm-corridor"
								style={{ opacity: dim ? 0.25 : 1 }}
								onMouseEnter={() => setActive(r.c)}
								onMouseLeave={() => setActive(null)}
							>
								<title>
									{r.blocked
										? `${r.name}: ${usd0(r.blocked)} blocked (OFAC)`
										: `${r.name}: ${usd0(r.usd)} · ${pct(r)} of volume`}
								</title>
								{/* wide invisible hit area */}
								<path d={d} fill="none" stroke="transparent" strokeWidth={16} />
								<path
									d={d}
									fill="none"
									stroke={
										r.blocked ? "var(--color-coral)" : "var(--color-volt)"
									}
									strokeOpacity={
										r.blocked ? 0.9 : on ? 1 : 0.4 + share(r) * 1.2
									}
									strokeWidth={on ? weight + 1 : weight}
									strokeLinecap="round"
									strokeDasharray={r.blocked ? "5 6" : undefined}
									pathLength={r.blocked ? undefined : 1}
									className={r.blocked ? undefined : "cm-draw"}
									style={{ animationDelay: `${i * 120}ms` }}
								/>
								{!r.blocked && !reduced && (
									<circle r={3} fill="var(--color-volt-bright)">
										<animateMotion
											dur={`${2.6 + i * 0.4}s`}
											repeatCount="indefinite"
											path={d}
											begin={`${0.9 + i * 0.12}s`}
										/>
									</circle>
								)}
								{r.blocked ? (
									<g
										transform={`translate(${px(to[0])},${py(to[1])})`}
										stroke="var(--color-coral)"
										strokeWidth={2.4}
										strokeLinecap="round"
									>
										<circle r={9} fill="var(--color-panel)" strokeWidth={1.6} />
										<path d="M-4,-4L4,4M4,-4L-4,4" />
									</g>
								) : (
									<g transform={`translate(${px(to[0])},${py(to[1])})`}>
										<circle r={10 + share(r) * 18} fill="url(#cm-glow)" />
										<circle
											r={4 + share(r) * 6}
											fill="var(--color-volt)"
											stroke="var(--color-panel)"
											strokeWidth={2}
										/>
									</g>
								)}
								<text
									x={px(to[0]) + (r.blocked ? 13 : 12 + share(r) * 6)}
									y={py(to[1]) + 4}
									className="mono cm-label"
									fill={r.blocked ? "var(--color-coral)" : "var(--color-bone)"}
								>
									{r.c}
								</text>
							</g>
						);
					})}

					{/* origin */}
					<g transform={`translate(${px(ORIGIN[0])},${py(ORIGIN[1])})`}>
						<circle r={14} fill="url(#cm-glow)" />
						<circle
							r={5}
							fill="var(--color-bone)"
							stroke="var(--color-panel)"
							strokeWidth={2}
						/>
					</g>
					<text
						x={px(ORIGIN[0]) + 10}
						y={py(ORIGIN[1]) - 10}
						className="mono cm-label"
						fill="var(--color-ash)"
					>
						US · payer
					</text>
				</svg>

				<ul className="corridor-legend">
					{rows.map((r) => {
						const on = active === r.c;
						return (
							<li key={r.c}>
								<button
									type="button"
									className={`cm-row${on ? " cm-row-on" : ""}`}
									aria-pressed={on}
									onMouseEnter={() => setActive(r.c)}
									onMouseLeave={() => setActive(null)}
									onFocus={() => setActive(r.c)}
									onBlur={() => setActive(null)}
									title={
										r.blocked
											? `${r.name}: ${usd0(r.blocked)} blocked (OFAC)`
											: `${r.name}: ${usd0(r.usd)} · ${pct(r)} of volume`
									}
								>
									<span className="flex min-w-0 items-center gap-2">
										<Cc code={r.c} label={r.name} />
										<span className="truncate">{r.name}</span>
									</span>
									{r.blocked ? (
										<span className="pill p-bad">Blocked · OFAC</span>
									) : (
										<span
											className="mono whitespace-nowrap text-ash"
											style={{ fontSize: 13 }}
										>
											{compact(r.usd)}{" "}
											<span className="text-ash-faint">{pct(r)}</span>
										</span>
									)}
									<span className="cm-share" aria-hidden="true">
										<span
											className={r.blocked ? "cm-share-blocked" : undefined}
											style={{
												width: r.blocked ? "100%" : `${(r.usd / max) * 100}%`,
											}}
										/>
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
