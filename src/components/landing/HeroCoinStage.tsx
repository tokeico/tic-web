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
				<path d="M 14 22 Q 38 28 50 48" />
				<path d="M 12 42 Q 36 44 50 50" />
				<path d="M 16 64 Q 38 56 50 52" />
				<path d="M 86 24 Q 62 30 50 48" />
				<path d="M 88 44 Q 64 46 50 50" />
				<path d="M 84 66 Q 62 58 50 52" />
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
