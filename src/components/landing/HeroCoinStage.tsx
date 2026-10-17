type HeroCurrency = {
	code: string;
	country: string;
	href: string;
	side: "left" | "right";
	top: string;
	flag?: string;
	stablecoin?: boolean;
};

const CURRENCIES: HeroCurrency[] = [
	{
		code: "USD",
		country: "United States",
		href: "#coverage",
		side: "left",
		top: "18%",
		flag: "🇺🇸",
	},
	{
		code: "USDC",
		country: "USD Coin",
		href: "#coverage",
		side: "left",
		top: "40%",
		stablecoin: true,
	},
	{
		code: "MXN",
		country: "Mexico",
		href: "#coverage",
		side: "left",
		top: "62%",
		flag: "🇲🇽",
	},
	{
		code: "BRL",
		country: "Brazil",
		href: "#coverage",
		side: "right",
		top: "20%",
		flag: "🇧🇷",
	},
	{
		code: "COP",
		country: "Colombia",
		href: "#coverage",
		side: "right",
		top: "42%",
		flag: "🇨🇴",
	},
	{
		code: "ARS",
		country: "Argentina",
		href: "#coverage",
		side: "right",
		top: "64%",
		flag: "🇦🇷",
	},
];

/** Same coordinate space as hero-coin.png (1024×682). */
const COIN = { cx: 508, cy: 336, rx: 292, ry: 302 };

type RailAnchor = { x: number; y: number; overshoot?: number };

/** Where the corridor line meets the coin — slightly past the rim so the stroke tucks under the PNG. */
function rimOnCoin(chipX: number, chipY: number, overshoot = 1.06) {
	const dx = COIN.cx - chipX;
	const dy = COIN.cy - chipY;
	const a =
		(dx * dx) / (COIN.rx * COIN.rx) + (dy * dy) / (COIN.ry * COIN.ry);
	const s = (1 - 1 / Math.sqrt(a)) * overshoot;
	return {
		x: chipX + dx * s,
		y: chipY + dy * s,
	};
}

/** Straight segment so both ends land exactly on chip and rim. */
function corridorPath(anchor: RailAnchor) {
	const rim = rimOnCoin(anchor.x, anchor.y, anchor.overshoot ?? 1.06);
	return `M ${anchor.x} ${anchor.y} L ${rim.x} ${rim.y}`;
}

/** Inner edge of each chip toward the coin (viewBox pixels). */
const RAIL_ANCHORS: Record<string, RailAnchor> = {
	USD: { x: 78, y: 132, overshoot: 1.1 },
	USDC: { x: 68, y: 288 },
	MXN: { x: 82, y: 448 },
	BRL: { x: 946, y: 138, overshoot: 1.1 },
	COP: { x: 956, y: 292 },
	ARS: { x: 942, y: 452 },
};

/** Hero coin with corridor currency chips wired into the coverage section. */
export function HeroCoinStage() {
	return (
		<div
			className="hero-coin-stage"
			role="img"
			aria-label="The Corredor token with payment corridors to USD, USDC, MXN, BRL, COP and ARS."
		>
			<div className="hero-coin-frame" aria-hidden="true">
				<div className="hero-coin-glow" />
				<div className="hero-coin-glow hero-coin-glow--core" />
				<svg
					className="hero-coin-rails"
					viewBox="0 0 1024 682"
					aria-hidden="true"
				>
					{CURRENCIES.map((c) => {
						const a = RAIL_ANCHORS[c.code];
						return <path key={c.code} d={corridorPath(a)} />;
					})}
				</svg>
				<img
					className="hero-coin-art"
					src="/hero-coin.png"
					width={1024}
					height={682}
					alt=""
				/>
			</div>
			{CURRENCIES.map((c, i) => (
				<a
					key={c.code}
					href={c.href}
					className={`lp-chip hero-currency-chip hero-currency-chip--${c.side}`}
					style={{ top: c.top, animationDelay: `${i * 0.45}s` }}
					title={`${c.country} · ${c.code}`}
				>
					{c.stablecoin ? (
						<span className="hero-usdc-mark" aria-hidden="true" />
					) : (
						<span className="lp-flag" aria-hidden="true">
							{c.flag}
						</span>
					)}
					{c.code}
				</a>
			))}
		</div>
	);
}
