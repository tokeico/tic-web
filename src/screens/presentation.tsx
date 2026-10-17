import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { PitchWorld, world } from "@/components/presentation/PitchWorld";
import "./presentation.css";

/**
 * The eMerge pitch, animated. A fixed 1920×1080 stage scaled to the window,
 * over a three.js world (PitchWorld) that changes shot with each slide.
 *
 * Demo numbers on slide 4 are the rules engine's own Oct 1 plan for the
 * Estúdio Paulista payout (src/fixtures/payouts.json).
 *
 * Keys: → / Space next · ← back · R replay slide · F fullscreen · 1–8 jump.
 */

const W = 1920;
const H = 1080;

/** stagger delay as a CSS variable */
const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/* ---------------------------------------------------------------------------
   motion primitives
--------------------------------------------------------------------------- */

/** Steps that tick on at the given times (ms) after mount. */
function useSteps(times: number[]) {
	const [step, setStep] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: timeline fixed per mount
	useEffect(() => {
		const ids = times.map((t, i) => setTimeout(() => setStep(i + 1), t));
		return () => ids.forEach(clearTimeout);
	}, []);
	return step;
}

/** A number that counts up once, eased, after `delay` seconds. */
function Count({
	to,
	from = 0,
	dur = 1.6,
	delay = 0,
	fmt = (n: number) => Math.round(n).toLocaleString("en-US"),
}: {
	to: number;
	from?: number;
	dur?: number;
	delay?: number;
	fmt?: (n: number) => string;
}) {
	const ref = useRef<HTMLSpanElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: plays once per mount
	useEffect(() => {
		let raf = 0;
		const start = performance.now() + delay * 1000;
		const tick = (now: number) => {
			const p = Math.min(1, Math.max(0, (now - start) / (dur * 1000)));
			const e = p === 1 ? 1 : 1 - 2 ** (-10 * p);
			if (ref.current) ref.current.textContent = fmt(from + (to - from) * e);
			if (p < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);
	return (
		<span ref={ref} className="pz-num">
			{fmt(from)}
		</span>
	);
}

/** Characters typed in, with a caret while it's going. */
function Type({
	text,
	delay = 0,
	cps = 38,
	className,
	keepCaret = false,
}: {
	text: string;
	delay?: number;
	cps?: number;
	className?: string;
	keepCaret?: boolean;
}) {
	const [n, setN] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: plays once per mount
	useEffect(() => {
		let iv: ReturnType<typeof setInterval> | undefined;
		const to = setTimeout(() => {
			iv = setInterval(() => {
				setN((v) => {
					if (v >= text.length) {
						clearInterval(iv);
						return v;
					}
					return v + 1;
				});
			}, 1000 / cps);
		}, delay * 1000);
		return () => {
			clearTimeout(to);
			clearInterval(iv);
		};
	}, []);
	const typing = n > 0 && n < text.length;
	return (
		<span className={className}>
			{text.slice(0, n)}
			{(typing || (keepCaret && n >= text.length)) && (
				<span className="pz-caret" />
			)}
			<span className="pz-ghost">{text.slice(n)}</span>
		</span>
	);
}

/**
 * Words that rise in one by one. Markup: *volt*, ~coral~, +jade+ around a
 * single word.
 */
function Words({
	text,
	start = 0,
	step = 0.045,
}: {
	text: string;
	start?: number;
	step?: number;
}) {
	return (
		<>
			{text.split(" ").map((raw, i) => {
				let w = raw;
				let cls = "";
				const m = /^([*~+])(.+)\1([.,]?)$/.exec(raw);
				if (m) {
					w = m[2] + m[3];
					cls =
						m[1] === "*" ? "hl-volt" : m[1] === "~" ? "hl-coral" : "hl-jade";
				}
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: static text
					<span key={i}>
						<span className={`pz-word ${cls}`} style={d(start + i * step)}>
							{w}
						</span>{" "}
					</span>
				);
			})}
		</>
	);
}

function Kicker({ children, delay = 0 }: { children: string; delay?: number }) {
	return (
		<div className="pz-kicker">
			<span className="pz-kicker-dot" />
			<Type text={children} delay={delay} cps={60} />
		</div>
	);
}

function Sources({
	children,
	delay = 1.6,
}: {
	children: ReactNode;
	delay?: number;
}) {
	return (
		<div className="pz-sources a-fade" style={d(delay)}>
			{children}
		</div>
	);
}

function Mark({ size = 34 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
			<path
				d="M24 2a22 22 0 1 0 0 44 22 22 0 1 0 0-44Zm0 8.8 8.8 13.2-8.8 13.2-8.8-13.2Z"
				fill="#ffff67"
				fillRule="evenodd"
			/>
		</svg>
	);
}

/* ---------------------------------------------------------------------------
   slides
--------------------------------------------------------------------------- */

function S1Title() {
	const chips = ["USD", "USDC", "MXN", "BRL", "COP", "ARS"];
	return (
		<div className="pz-pad">
			<div className="s1-left">
				<Kicker delay={0.3}>EMERGE AI HACKATHON · MIAMI · OCT 17, 2026</Kicker>
				<h1 className="s1-title" aria-label="Corredor">
					{"Corredor".split("").map((c, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static letters
						<span key={i} className="s1-letter" style={d(0.7 + i * 0.06)}>
							{c}
						</span>
					))}
				</h1>
				<div className="s1-by a-fade" style={d(1.4)}>
					BY TOKEICO
				</div>
				<p className="s1-tag">
					<Words
						text="Pay your team in Latin America for *less,* in *minutes,* with the compliance done for you."
						start={1.7}
						step={0.06}
					/>
				</p>
				<div className="s1-chips">
					{chips.map((c, i) => (
						<span key={c} className="pz-chip a-pop" style={d(2.6 + i * 0.08)}>
							<span className="pz-chip-led" style={d(i * 0.3)} />
							{c}
						</span>
					))}
				</div>
			</div>
			<div className="s1-hud a-fade" style={d(2.2)}>
				<div className="s1-hud-row">
					<span>corridors</span>
					<b>US → MX · CO · BR · AR</b>
				</div>
				<div className="s1-hud-row">
					<span>rules pack</span>
					<b>v1 · 9 rules</b>
				</div>
				<div className="s1-hud-row">
					<span>mode</span>
					<b className="t-volt">prepare · human approves</b>
				</div>
			</div>
		</div>
	);
}

function S2Problem() {
	return (
		<div className="pz-pad">
			<Kicker>THE PROBLEM</Kicker>
			<h2 className="pz-h2" style={{ maxWidth: 1500 }}>
				<Words
					text="Picture a 30-person company in Miami paying 8 people in Colombia."
					start={0.3}
				/>
			</h2>
			<div className="s2-grid">
				<div className="s2-left">
					<div className="s2-big">
						$<Count to={28} delay={1.1} dur={1.2} />
						k–$
						<Count to={62} delay={1.1} dur={1.8} />k
					</div>
					<p className="s2-sub a-up" style={d(1.4)}>
						a year lost to bank wire fees and exchange-rate markups.
					</p>
					<LeakBar />
					<p className="s2-ex a-fade" style={d(2.4)}>
						Example: 8 contractors and 4 suppliers, $76,000 a month.
					</p>
				</div>
				<div className="s2-rows">
					<div className="s2-row" style={d(1.2)}>
						<div className="s2-k">1–5 days</div>
						<div className="s2-v">
							before her team gets paid
							<div className="s2-days">
								{[0, 1, 2, 3, 4].map((i) => (
									<span key={i} style={d(i * 0.5)} />
								))}
								<em>waiting…</em>
							</div>
						</div>
					</div>
					<div className="s2-row" style={d(1.5)}>
						<div className="s2-k">1 in 10</div>
						<div className="s2-v">
							international payments fail on the first try
							<div className="s2-dots">
								{"abcdefghij".split("").map((id, i) => (
									<span
										key={id}
										className={i === 6 ? "fail" : ""}
										style={d(1.8 + i * 0.07)}
									/>
								))}
							</div>
						</div>
					</div>
					<div className="s2-row" style={d(1.8)}>
						<div className="s2-k">
							$<Count to={80730} delay={2} dur={1.6} />
						</div>
						<div className="s2-v">
							for the compliance officer she can't afford
							<div className="s2-hire">
								<span className="s2-hire-tag">HIRE · COMPLIANCE OFFICER</span>
								<span className="s2-hire-x">NOT IN BUDGET</span>
							</div>
						</div>
					</div>
				</div>
			</div>
			<Sources>
				Sources: NerdWallet (2026) · Polygon (2026) · LexisNexis Risk Solutions
				(Oct 2026) · BLS (May 2025) · Ramp help center
			</Sources>
		</div>
	);
}

/** $76k a month going out, with fee chunks peeling off as coral sparks. */
function LeakBar() {
	const fees = ["$45 wire", "$15–50 middleman", "$10–20 receiving", "2–5% FX"];
	return (
		<div className="s2-leak a-fade" style={d(1.6)}>
			<div className="s2-leak-head">
				<span>$76,000 / month out</span>
				<span className="t-coral">− fees, every payment</span>
			</div>
			<div className="s2-leak-track">
				<div className="s2-leak-fill" />
				{Array.from({ length: 14 }, (_, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: decorative sparks
						key={i}
						className="s2-leak-spark"
						style={
							{
								left: `${8 + ((i * 37) % 86)}%`,
								"--d": `${2 + (i % 7) * 0.45}s`,
								"--dx": `${((i * 13) % 9) - 4}px`,
							} as CSSProperties
						}
					/>
				))}
			</div>
			<div className="s2-leak-fees">
				{fees.map((f, i) => (
					<span key={f} className="a-pop" style={d(2.1 + i * 0.15)}>
						{f}
					</span>
				))}
			</div>
		</div>
	);
}

function S3WhyNow() {
	// t: calendar flips at 2.4s, the route breaks with it
	const step = useSteps([2400, 3400]);
	useEffect(() => {
		world.brazil = step >= 1 ? "blocked" : "ok";
	}, [step]);
	useEffect(
		() => () => {
			world.brazil = "ok";
		},
		[],
	);
	const flipped = step >= 1;
	return (
		<div className="pz-pad">
			<Kicker>WHY NOW</Kicker>
			<h2 className="pz-h2" style={{ maxWidth: 1300 }}>
				<Words
					text="On Sep 30, this route was +legal.+ On Oct 1, it ~wasn't.~"
					start={0.3}
				/>
			</h2>

			<div className="s3-band">
				<div className={`s3-cal ${flipped ? "is-flipped" : ""}`}>
					<div className="s3-cal-ring" />
					<div className="s3-cal-face s3-cal-front">
						<span>SEP</span>
						<b>30</b>
						<em className="t-jade">ROUTE ALLOWED</em>
					</div>
					<div className="s3-cal-face s3-cal-back">
						<span>OCT</span>
						<b>1</b>
						<em className="t-coral">RES. 561 IN FORCE</em>
					</div>
				</div>

				<div className={`s3-route ${flipped ? "is-broken" : ""}`}>
					<RouteNode label="From" value="Miami · USD" />
					<RouteLink />
					<RouteNode label="Coin" value="USDC · Base" />
					<RouteLink broken={flipped} />
					<RouteNode
						label={flipped ? "Blocked from Oct 1" : "Settles via"}
						value="eFX provider"
						tone={flipped ? "coral" : "jade"}
					/>
					<RouteLink broken={flipped} />
					<RouteNode label="To" value="São Paulo · BRL" dim={flipped} />
					<div className={`s3-route-alt ${step >= 2 ? "on" : ""}`}>
						<span className="s3-route-alt-line" />
						<span className="s3-route-alt-tag">
							licensed VASP · still allowed
						</span>
					</div>
				</div>
			</div>

			<div className="s3-cards">
				<div className="pz-card a-up" style={d(1.2)}>
					<div className="pz-card-k t-volt">BCB RES. 561 · IN FORCE OCT 1</div>
					<h3>Brazil changed the rules</h3>
					<p>
						From October 2026, regulated FX fintechs can't settle payments
						abroad in stablecoins. Licensed crypto firms (VASPs) still can. A
						small business would never know.
					</p>
				</div>
				<div className="pz-card a-up" style={d(1.5)}>
					<div className="pz-card-k">WHAT ABOUT RAMP?</div>
					<h3>Ramp already pays Latin America fast</h3>
					<p>
						What Ramp leaves to you is the rules. A 30-person company has nobody
						to check them. <b className="t-volt">Corredor is that person.</b>
					</p>
				</div>
			</div>
			<Sources>
				Sources: Ledger Insights, Res. 561 and 521 (2026) · Ramp help center ·
				Stripe newsroom (July 2026)
			</Sources>
		</div>
	);
}

function RouteNode({
	label,
	value,
	tone,
	dim,
}: {
	label: string;
	value: string;
	tone?: "coral" | "jade";
	dim?: boolean;
}) {
	return (
		<div
			className={`s3-rnode ${tone ? `s3-rnode-${tone}` : ""} ${dim ? "s3-rnode-dim" : ""}`}
		>
			<span>{label}</span>
			<b>{value}</b>
		</div>
	);
}

function RouteLink({ broken }: { broken?: boolean }) {
	return (
		<div className={`s3-rlink ${broken ? "is-broken" : ""}`}>
			<i />
			<i />
			<i />
		</div>
	);
}

/* the live demo ------------------------------------------------------------ */

const ROUTES = [
	{
		name: "PagaFX",
		kind: "eFX provider",
		pct: "0.55%",
		fee: "$86.57",
		time: "15 min",
		verdict: "block",
	},
	{
		name: "Ponte Digital",
		kind: "VASP · not BCB-filed",
		pct: "0.70%",
		fee: "$110.19",
		time: "20 min",
		verdict: "warn",
	},
	{
		name: "Sol VASP",
		kind: "Licensed VASP",
		pct: "0.85%",
		fee: "$133.80",
		time: "10 min",
		verdict: "pick",
	},
	{
		name: "SWIFT wire",
		kind: "Bank",
		pct: "4.50%",
		fee: "$708.33",
		time: "2 days",
		verdict: "pass",
	},
] as const;

const DEMO_T = [
	700, // 1 nodes in, packet leaves Miami
	1700, // 2 packet at coin
	2700, // 3 packet hits eFX → blocked
	3500, // 4 route check opens
	4000, // 5 row 1
	4600, // 6 row 2
	5200, // 7 row 3
	5800, // 8 row 4
	6500, // 9 pick + reroute node
	7100, // 10 memo types
	10200, // 11 approve button
	11600, // 12 cursor arrives
	12300, // 13 click
	12900, // 14 packet moves on
	13900, // 15 paid
];

function S4Demo() {
	const s = useSteps(DEMO_T);
	useEffect(() => {
		world.brazil = s >= 9 ? "rerouted" : s >= 3 ? "blocked" : "ok";
	}, [s]);
	useEffect(
		() => () => {
			world.brazil = "ok";
		},
		[],
	);

	const node3 = s >= 9 ? "reroute" : s >= 3 ? "blocked" : "idle";
	// packet stops: node centres along the 1680px track
	const stops = [165, 615, 1065, 1515];
	const at = s >= 14 ? 3 : s >= 2 ? (s >= 3 ? 2 : 1) : 0;
	const verdictAt = (i: number) => s >= 5 + i;

	return (
		<div className="pz-pad">
			<div className="s4-head">
				<div>
					<Kicker>LIVE DEMO</Kicker>
					<h2 className="pz-h2 s4-title">
						<Words text="Watch Oct 1." start={0.2} step={0.08} />
					</h2>
					<p className="s4-sub a-fade" style={d(0.5)}>
						Payout to Estúdio Paulista Design · <b>R$ 85,000</b>{" "}
						<span className="t-dim">≈ $15,740.74</span>
					</p>
				</div>
				<div className="s4-asof a-fade" style={d(0.4)}>
					<span className="pz-rec" /> AS OF <b>2026-10-01</b>
				</div>
			</div>

			<div className="dm-pipe">
				<div className="dm-pipe-rail" />
				<div
					className={`dm-pipe-lit ${node3 === "blocked" ? "is-coral" : ""}`}
					style={{ width: s >= 1 ? stops[at] : 0 }}
				/>
				<div
					className={`dm-pipe-packet ${node3 === "blocked" ? "is-coral" : ""} ${s >= 15 ? "is-done" : ""}`}
					style={{ left: stops[at], opacity: s >= 1 && s < 15 ? 1 : 0 }}
				/>
				<div className="dm-pnode a-up" style={d(0.3)}>
					<span>From</span>
					<b>Miami</b>
					<small>Operating account · USD</small>
				</div>
				<div className="dm-pnode a-up" style={d(0.4)}>
					<span>Coin</span>
					<b>USDC · Base</b>
					<small>on-chain in seconds</small>
				</div>
				<div className={`dm-pnode dm-pnode-${node3} a-up`} style={d(0.5)}>
					<span>
						{node3 === "reroute"
							? "Rerouted for Oct 1"
							: node3 === "blocked"
								? "Blocked · BR-561-EFX"
								: "Off-ramp"}
					</span>
					<b>{node3 === "reroute" ? "Licensed VASP" : "eFX provider"}</b>
					<small className={node3 === "reroute" ? "strike" : ""}>
						{node3 === "reroute" ? "eFX provider" : "PagaFX"}
					</small>
					{node3 === "blocked" && <div className="dm-pnode-shock" />}
				</div>
				<div
					className={`dm-pnode ${s >= 15 ? "dm-pnode-paid" : ""} a-up`}
					style={d(0.6)}
				>
					<span>{s >= 15 ? "Delivered · simulated rail" : "To"}</span>
					<b>São Paulo · Pix</b>
					<small>{s >= 15 ? "✓ 10 min · booked" : "Estúdio Paulista"}</small>
				</div>
			</div>

			<div className="s4-lower">
				<div className={`dm-check ${s >= 4 ? "on" : ""}`}>
					<div className="dm-check-head">
						<span className="act-tag act-code">CODE</span>
						<span>Every route, checked against the rules for Oct 1</span>
						<span className="dm-check-spin" data-done={s >= 9} />
					</div>
					<div className="dm-check-rows">
						{ROUTES.map((r, i) => (
							<div
								key={r.name}
								className={`dm-check-row ${verdictAt(i) ? "seen" : ""} ${s >= 9 && r.verdict === "pick" ? "is-pick" : ""} ${s >= 9 && r.verdict !== "pick" ? "is-dim" : ""}`}
							>
								<span className="dm-cr-name">{r.name}</span>
								<span className="dm-cr-kind">{r.kind}</span>
								<span className="dm-cr-num">{r.pct}</span>
								<span className="dm-cr-num">{r.fee}</span>
								<span className="dm-cr-num">{r.time}</span>
								<span className="dm-cr-v">
									{verdictAt(i) && <Verdict v={r.verdict} picked={s >= 9} />}
								</span>
								{s === 4 + i && <span className="dm-cr-scan" />}
							</div>
						))}
					</div>
				</div>

				<div className={`dm-memo ${s >= 10 ? "on" : ""}`}>
					<div className="dm-memo-k">
						<span className="act-tag act-ai">AI</span> MEMO · BCB RES. 561 · IN
						FORCE OCT 1
					</div>
					<p>
						{s >= 10 && (
							<Type
								text="eFX providers can't settle this payment in stablecoins from Oct 1. Rerouted through a licensed VASP. Fee shown: $133.80. Waiting for your yes."
								cps={52}
							/>
						)}
					</p>
					<div className={`dm-memo-act ${s >= 11 ? "on" : ""}`}>
						{s >= 14 ? (
							<div className="dm-memo-ok">
								<span className="act-tag act-human">HUMAN</span> Approved by
								owner · reason logged · audit #A-0419
							</div>
						) : (
							<button
								type="button"
								className={`dm-memo-btn ${s >= 13 ? "is-pressed" : ""}`}
							>
								Approve · R$ 85,000
								{s >= 13 && <span className="dm-memo-ripple" />}
							</button>
						)}
						<span className="dm-memo-note">
							Over $50,000 needs a second approver
						</span>
					</div>
					<svg
						className={`dm-cursor ${s >= 12 ? "on" : ""} ${s >= 13 ? "click" : ""}`}
						width="34"
						height="40"
						viewBox="0 0 24 28"
						aria-hidden="true"
					>
						<path
							d="M2 2 L2 22 L7.5 17 L11 25 L14.5 23.5 L11 15.8 L18.5 15.8 Z"
							fill="#fff"
							stroke="#000"
							strokeWidth="1.4"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
}

function Verdict({ v, picked }: { v: string; picked: boolean }) {
	if (v === "block")
		return <span className="dm-vd dm-vd-coral">✕ BLOCK · BR-561-EFX</span>;
	if (v === "warn")
		return <span className="dm-vd dm-vd-amber">! WARN · not filed</span>;
	if (v === "pick")
		return picked ? (
			<span className="dm-vd dm-vd-volt">★ ROUTE · licensed</span>
		) : (
			<span className="dm-vd dm-vd-jade">✓ PASS</span>
		);
	return <span className="dm-vd dm-vd-jade">✓ PASS</span>;
}

/* how it works ------------------------------------------------------------- */

function S5How() {
	const [active, setActive] = useState(0);
	useEffect(() => {
		const id = setInterval(() => setActive((a) => (a + 1) % 4), 2200);
		return () => clearInterval(id);
	}, []);
	return (
		<div className="pz-pad">
			<Kicker>HOW IT WORKS</Kicker>
			<h2 className="pz-h2 s5-h">
				<span className="s5-ph a-up" style={d(0.3)}>
					<span className="act-tag act-ai">AI</span>
					reads and explains.
				</span>{" "}
				<span className="s5-ph a-up" style={d(0.8)}>
					<span className="act-tag act-code">CODE</span>
					decides.
				</span>{" "}
				<span className="s5-ph a-up" style={d(1.3)}>
					<span className="act-tag act-human">HUMAN</span>
					approves.
				</span>
			</h2>

			<div className="s5-cards">
				<div className="s5-rail">
					<div
						className="s5-rail-lit"
						style={{ width: `${(active / 3) * 100}%` }}
					/>
				</div>
				<Step
					n="01"
					title="Drop it in"
					on={active === 0}
					delay={1.6}
					body="AP uploads the invoice or payroll. Corredor reads the payee, amount and bank details."
				>
					<div className="s5-doc">
						<div className="s5-doc-paper">
							<i />
							<i />
							<i />
							<i />
							<i />
							<i />
							<div className="s5-doc-scan" />
						</div>
						<div className="s5-doc-fields">
							<span style={d(0)}>
								payee · <b>Estúdio Paulista</b>
							</span>
							<span style={d(0.35)}>
								amount · <b>R$ 85,000</b>
							</span>
							<span style={d(0.7)}>
								pix · <b>7d9f…5e30</b>
							</span>
						</div>
					</div>
				</Step>
				<Step
					n="02"
					title="Check the rules"
					on={active === 1}
					delay={1.75}
					body="That country's rules on that date, sanctions, and the cheapest allowed route, with the fee."
				>
					<div className="s5-checks">
						{[
							"BR rules · as of Oct 1",
							"Sanctions screen",
							"Cheapest allowed route",
						].map((t, i) => (
							<div key={t} style={d(i * 0.45)}>
								<span className="s5-tick" style={d(i * 0.45)} />
								{t}
							</div>
						))}
					</div>
				</Step>
				<Step
					n="03"
					title="Owner says yes"
					on={active === 2}
					delay={1.9}
					body="One tap, with the reason written down. Over $50,000 needs a second approver."
				>
					<div className="s5-tap">
						<div className="s5-tap-btn">
							Approve
							<span className="s5-tap-ring" />
						</div>
						<div className="s5-tap-two">
							<span>&gt; $50k</span> → 2nd approver
						</div>
					</div>
				</Step>
				<Step
					n="04"
					title="Paid and booked"
					on={active === 3}
					delay={2.05}
					body="Minutes to Pix, SPEI or a local bank. Matched and booked in QuickBooks."
				>
					<div className="s5-rails">
						<div className="s5-rails-row">
							{["Pix", "SPEI", "Local bank"].map((r, i) => (
								<span key={r} style={d(i * 0.6)}>
									{r}
								</span>
							))}
						</div>
						<div className="s5-qb">
							<span>QuickBooks</span>
							<b>✓ matched · booked</b>
						</div>
					</div>
				</Step>
			</div>
			<div className="s5-real a-fade" style={d(2.6)}>
				<span>What's real today</span>
				{[
					"rules pack v1",
					"9 rules",
					"pending compliance review",
					"payment rails simulated",
				].map((t) => (
					<em key={t}>{t}</em>
				))}
			</div>
		</div>
	);
}

function Step({
	n,
	title,
	body,
	on,
	delay,
	children,
}: {
	n: string;
	title: string;
	body: string;
	on: boolean;
	delay: number;
	children: ReactNode;
}) {
	return (
		<div className={`s5-card a-up ${on ? "is-on" : ""}`} style={d(delay)}>
			<div className="s5-n">{n}</div>
			<div className="s5-viz">{children}</div>
			<h3>{title}</h3>
			<p>{body}</p>
		</div>
	);
}

/* close -------------------------------------------------------------------- */

function S6Close() {
	return (
		<div className="pz-pad s6">
			<h2 className="s6-a">
				<Words text="Ramp moves the money." start={0.2} step={0.08} />
			</h2>
			<h2 className="s6-b">
				<Words
					text="Corredor makes sure it's *allowed* *to* *move,* and *costs* *less.*"
					start={0.9}
					step={0.08}
				/>
			</h2>
			<div className="s6-foot a-fade" style={d(2.4)}>
				<Mark size={30} />
				Corredor by TOKEICO · made in Miami
			</div>
		</div>
	);
}

/* backups ------------------------------------------------------------------- */

const TABLE = [
	[
		"How fast?",
		"1–5 business days",
		"About 30 min in BRL, MXN, COP",
		"Minutes",
	],
	[
		"What does it cost?",
		"$45 wire, middlemen, 2–5% FX",
		"“Market-competitive” FX",
		"Target 1% all-in, shown first",
	],
	[
		"Is it allowed there today?",
		"Up to you",
		"Not on its payments page",
		"Checked for that date",
	],
	[
		"Why this route?",
		"No answer",
		"Not on its payments page",
		"Written reason with source",
	],
	["Need a compliance person?", "Yes", "Yes, for country rules", "No"],
];

function S7Table() {
	return (
		<div className="pz-pad">
			<Kicker>BACKUP · IF ASKED ABOUT RAMP</Kicker>
			<h2 className="pz-h2">
				<Words text="Bank vs Ramp vs *Corredor*" start={0.2} step={0.08} />
			</h2>
			<div className="s7-tbl">
				<div className="s7-tbl-hl" />
				<div className="s7-tbl-row s7-tbl-head a-fade" style={d(0.6)}>
					<span>What the owner asks</span>
					<span>Their bank</span>
					<span>Ramp</span>
					<span className="t-volt">
						<Mark size={20} /> Corredor
					</span>
				</div>
				{TABLE.map((r, i) => (
					<div key={r[0]} className="s7-tbl-row" style={d(0.9 + i * 0.22)}>
						<span>{r[0]}</span>
						<span className="t-dim">{r[1]}</span>
						<span>{r[2]}</span>
						<span className="s7-tbl-c">
							<i className="s7-tbl-tick" style={d(1.3 + i * 0.22)} />
							{r[3]}
						</span>
					</div>
				))}
			</div>
			<Sources delay={2.4}>
				Sources: Ramp help center · Stripe newsroom (July 2026) · NerdWallet
				(2026) · Polygon (2026). “Not on its payments page” means Ramp's public
				help page doesn't mention it.
			</Sources>
		</div>
	);
}

function S8Math() {
	const bars = [
		{
			k: "Bank wire · low",
			v: 28320,
			note: "$45 wire, $15 middleman, $10 receiving per payment, plus 2% FX markup",
			tone: "",
		},
		{
			k: "Bank wire · high",
			v: 62160,
			note: "$45 wire, $50 middleman, $20 receiving per payment, plus 5% FX markup",
			tone: "coral",
		},
		{
			k: "Corredor · target",
			v: 9120,
			note: "1% all-in, a target to confirm with partner pricing, not a quote",
			tone: "volt",
		},
	];
	const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
	return (
		<div className="pz-pad">
			<Kicker>BACKUP · THE MONEY MATH, ILLUSTRATIVE</Kicker>
			<h2 className="pz-h2">
				<span className="t-volt">
					$<Count to={19000} delay={0.4} dur={1.4} />
				</span>{" "}
				to{" "}
				<span className="t-volt">
					$<Count to={53000} delay={0.4} dur={2} />
				</span>{" "}
				back every year
			</h2>
			<p className="s8-sub a-fade" style={d(0.6)}>
				30-person company · 8 contractors at $3,500 and 4 suppliers at $12,000 ·
				12 payments, $76,000 a month
			</p>
			<div className="s8-bars">
				{bars.map((b, i) => (
					<div
						key={b.k}
						className={`s8-bar s8-bar-${b.tone || "plain"} a-up`}
						style={d(0.9 + i * 0.25)}
					>
						<div className="s8-bar-k">{b.k}</div>
						<div className="s8-bar-track">
							<div
								className="s8-bar-fill"
								style={
									{
										"--w": `${(b.v / 62160) * 100}%`,
										"--d": `${1.1 + i * 0.25}s`,
									} as CSSProperties
								}
							/>
							<div className="s8-bar-v">
								<Count to={b.v} delay={1.1 + i * 0.25} dur={1.6} fmt={usd} />
								<small>/ yr</small>
							</div>
						</div>
						<div className="s8-bar-note">{b.note}</div>
					</div>
				))}
				<div className="s8-bar-save a-fade" style={d(2.8)}>
					<span>Back to the business</span>
					<b>$19,200 – $53,040 / yr</b>
				</div>
			</div>
			<Sources delay={2.6}>
				Per year. Sources: NerdWallet wire fee median (2026) · Polygon fee and
				FX ranges (March 2026) · BLS compliance officer pay (May 2025)
			</Sources>
		</div>
	);
}

/* ---------------------------------------------------------------------------
   deck
--------------------------------------------------------------------------- */

type Line = { t: string; tone?: "coral" | "jade" | "volt" | "amber" };

const SLIDES: Array<{
	id: string;
	label: string;
	C: () => ReactNode;
	log: Line[];
}> = [
	{
		id: "title",
		label: "Corredor",
		C: S1Title,
		log: [
			{ t: "boot corredor-agent · rules pack v1 · 9 rules" },
			{ t: "corridors online: US → MX · CO · BR · AR", tone: "jade" },
			{ t: "mode: prepare · a person approves every payout" },
			{ t: "standing by for payouts", tone: "volt" },
		],
	},
	{
		id: "problem",
		label: "The problem",
		C: S2Problem,
		log: [
			{ t: "ingest ap_export.csv · 8 contractors · 4 suppliers" },
			{ t: "12 payments · $76,000 / month" },
			{ t: "bank cost model → $28,320–$62,160 / yr", tone: "coral" },
			{ t: "flag: no compliance owner on file", tone: "amber" },
		],
	},
	{
		id: "why-now",
		label: "Why now",
		C: S3WhyNow,
		log: [
			{ t: "watch BCB normativos · Res. 561 published" },
			{
				t: "effective 2026-10-01 · eFX ✕ stablecoin settlement",
				tone: "coral",
			},
			{ t: "re-plan scheduled payouts as of Oct 1" },
			{ t: "1 payout affected → Estúdio Paulista", tone: "amber" },
		],
	},
	{
		id: "demo",
		label: "Live demo",
		C: S4Demo,
		log: [
			{ t: "plan demo-br · R$ 85,000 · as-of 2026-10-01" },
			{ t: "PagaFX (eFX) → BLOCK BR-561-EFX", tone: "coral" },
			{ t: "evaluate 4 routes · fees · rules · time" },
			{ t: "reroute → licensed VASP · fee $133.80", tone: "volt" },
			{ t: "await owner approval…" },
			{ t: "approved · memo + reason written to audit log", tone: "jade" },
		],
	},
	{
		id: "how",
		label: "How it works",
		C: S5How,
		log: [
			{ t: "AI · extract payee, amount, Pix key" },
			{ t: "CODE · rules@date · sanctions · cost", tone: "volt" },
			{ t: "HUMAN · approve with written reason", tone: "jade" },
			{ t: "book → QuickBooks · matched" },
		],
	},
	{
		id: "close",
		label: "The ask",
		C: S6Close,
		log: [
			{ t: "allowed to move · checked for that date", tone: "volt" },
			{ t: "cheapest allowed route · fee shown first" },
			{ t: "ready when you are." },
		],
	},
	{
		id: "vs-ramp",
		label: "Backup · Ramp",
		C: S7Table,
		log: [
			{ t: "compare: bank · ramp · corredor" },
			{ t: "source: ramp public help center" },
		],
	},
	{
		id: "math",
		label: "Backup · math",
		C: S8Math,
		log: [
			{ t: "model: 12 payments · $76k / month" },
			{ t: "bank low $28,320 · high $62,160", tone: "coral" },
			{ t: "corredor target 1% → $9,120", tone: "volt" },
			{ t: "Δ $19,200–$53,040 / yr", tone: "jade" },
		],
	},
];
const N = SLIDES.length;

function AgentConsole({ lines, slow }: { lines: Line[]; slow?: boolean }) {
	// on the demo the console moves up beside the title, out of the panels' way
	const gap = slow ? 2.2 : 1.1;
	return (
		<div className={`pz-console ${slow ? "is-top" : ""}`}>
			<div className="pz-console-head">
				<span className="pz-console-dot" />
				corredor-agent
				<span className="pz-console-live">LIVE</span>
			</div>
			<div className="pz-console-body">
				{lines.map((l, i) => (
					<div
						key={l.t}
						className={`pz-console-line ${l.tone ? `t-${l.tone}` : ""}`}
						style={d(0.5 + i * gap)}
					>
						<span className="pz-console-pre">›</span>
						<Type text={l.t} delay={0.5 + i * gap} cps={70} />
					</div>
				))}
			</div>
		</div>
	);
}

function Clock() {
	const [now, setNow] = useState("");
	useEffect(() => {
		const f = () =>
			setNow(
				new Date().toLocaleTimeString("en-US", {
					hour12: false,
					timeZone: "America/New_York",
				}),
			);
		f();
		const id = setInterval(f, 1000);
		return () => clearInterval(id);
	}, []);
	return <span className="pz-num">{now} ET</span>;
}

export function PresentationPage() {
	const [cur, setCur] = useState(0);
	const [prev, setPrev] = useState<number | null>(null);
	const [dir, setDir] = useState(1);
	const [scale, setScale] = useState(0);
	const [replay, setReplay] = useState(0);
	const [hint, setHint] = useState(true);
	const curRef = useRef(0);
	const enters = useRef<number[]>(Array(N).fill(0));

	const go = useCallback((n: number) => {
		const t = Math.max(0, Math.min(N - 1, n));
		if (t === curRef.current) return;
		setDir(t > curRef.current ? 1 : -1);
		setPrev(curRef.current);
		enters.current[t] += 1;
		curRef.current = t;
		setCur(t);
		world.shot = t;
		history.replaceState(null, "", `#${t + 1}`);
	}, []);

	// deep link: /presentation#4
	useEffect(() => {
		const fromHash = () => {
			const n = Number.parseInt(location.hash.slice(1), 10);
			if (n >= 1 && n <= N) go(n - 1);
		};
		fromHash();
		window.addEventListener("hashchange", fromHash);
		return () => window.removeEventListener("hashchange", fromHash);
	}, [go]);

	useEffect(() => {
		if (prev === null) return;
		const id = setTimeout(() => setPrev(null), 750);
		return () => clearTimeout(id);
	}, [prev]);

	useEffect(() => {
		const fit = () =>
			setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
		fit();
		window.addEventListener("resize", fit);
		const id = setTimeout(() => setHint(false), 5000);
		return () => {
			window.removeEventListener("resize", fit);
			clearTimeout(id);
		};
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const k = e.key;
			if (
				k === "ArrowRight" ||
				k === " " ||
				k === "PageDown" ||
				k === "Enter"
			) {
				e.preventDefault();
				go(curRef.current + 1);
			} else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") {
				e.preventDefault();
				go(curRef.current - 1);
			} else if (k === "Home") go(0);
			else if (k === "End") go(N - 1);
			else if (k === "r" || k === "R") {
				setReplay((r) => r + 1);
				world.surge = 1;
			} else if (k === "f" || k === "F") {
				if (document.fullscreenElement) void document.exitFullscreen();
				else void document.documentElement.requestFullscreen?.();
			} else if (/^[1-8]$/.test(k)) go(Number(k) - 1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [go]);

	useEffect(
		() => () => {
			world.shot = 0;
			world.brazil = "ok";
		},
		[],
	);

	const onClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest("button, a, .pz-progress")) return;
		go(curRef.current + (e.clientX < window.innerWidth * 0.25 ? -1 : 1));
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled on window
		// biome-ignore lint/a11y/noStaticElementInteractions: click-to-advance, like a slide clicker
		<div className="pz-root" onClick={onClick}>
			<PitchWorld />
			<div className="pz-vignette" />
			<div className="pz-scan" />
			<div
				className="pz-stage"
				style={{
					transform: `translate(-50%, -50%) scale(${scale})`,
					opacity: scale ? 1 : 0,
				}}
			>
				{/* HUD */}
				<header className="pz-hud">
					<div className="pz-brand">
						<Mark />
						<div>
							<b>Corredor</b>
							<span>BY TOKEICO</span>
						</div>
					</div>
					<div className="pz-hud-mid">
						<span className="pz-live" /> AGENT LIVE · <Clock />
					</div>
					<div className="pz-hud-right">
						<span className="pz-hud-label" key={cur}>
							{SLIDES[cur].label}
						</span>
						<span className="pz-num">
							<b>{String(cur + 1).padStart(2, "0")}</b> /{" "}
							{String(N).padStart(2, "0")}
						</span>
					</div>
				</header>

				{SLIDES.map((s, k) =>
					k === cur || k === prev ? (
						<section
							key={s.id}
							className={`pz-slide ${k === cur ? "is-in" : "is-out"}`}
							data-dir={dir}
							aria-hidden={k !== cur}
						>
							<s.C key={`${enters.current[k]}-${replay}`} />
						</section>
					) : null,
				)}

				<AgentConsole
					key={`${cur}-${replay}`}
					lines={SLIDES[cur].log}
					slow={SLIDES[cur].id === "demo"}
				/>

				<div key={`w${cur}-${replay}`} className="pz-wipe" data-dir={dir} />

				<nav className="pz-progress" aria-label="Slides">
					{SLIDES.map((s, k) => (
						<button
							key={s.id}
							type="button"
							className={k === cur ? "on" : k < cur ? "past" : ""}
							onClick={() => go(k)}
							aria-label={`Slide ${k + 1}: ${s.label}`}
						/>
					))}
				</nav>

				<div className={`pz-hint ${hint ? "" : "off"}`}>
					← → navigate · R replay · F fullscreen
				</div>
			</div>
		</div>
	);
}
