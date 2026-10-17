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

/** Matches `.hero-coin-disc` insets (10% 14% 12%) in the 0–100 rail viewBox. */
const COIN = { cx: 50, cy: 49, rx: 36, ry: 39 };

/** Where the corridor line meets the coin — slightly past the rim so the stroke tucks under the PNG. */
function rimOnCoin(chipX: number, chipY: number, overshoot = 1.04) {
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

function corridorPath(chipX: number, chipY: number) {
	const rim = rimOnCoin(chipX, chipY);
	const cx = chipX + (rim.x - chipX) * 0.42;
	const cy = chipY + (rim.y - chipY) * 0.42;
	return `M ${chipX} ${chipY} Q ${cx} ${cy} ${rim.x} ${rim.y}`;
}

/** Chip-side anchor in the rail viewBox (inner edge toward the coin). */
const RAIL_ANCHORS: Record<string, { x: number; y: number }> = {
	USD: { x: 7, y: 22 },
	USDC: { x: 5, y: 42 },
	MXN: { x: 7, y: 63 },
	BRL: { x: 93, y: 24 },
	COP: { x: 95, y: 44 },
	ARS: { x: 93, y: 63 },
};

/** Hero coin with corridor currency chips wired into the coverage section. */
export function HeroCoinStage() {
	return (
		<div
			className="hero-coin-stage"
			role="img"
			aria-label="The Corredor token with payment corridors to USD, USDC, MXN, BRL, COP and ARS."
		>
			<div className="hero-coin-glow" aria-hidden="true" />
			<svg
				className="hero-coin-rails"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				{CURRENCIES.map((c) => {
					const a = RAIL_ANCHORS[c.code];
					return <path key={c.code} d={corridorPath(a.x, a.y)} />;
				})}
			</svg>
			<div className="hero-coin-coin" aria-hidden="true">
				<div className="hero-coin-disc" />
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
