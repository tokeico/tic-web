import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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

/** Coin ellipse in hero-coin.png pixel space (1024×682). */
const COIN_ART = { cx: 508, cy: 336, rx: 292, ry: 302 };

type CoinEllipse = { cx: number; cy: number; rx: number; ry: number };

function rimOnCoin(
	chipX: number,
	chipY: number,
	coin: CoinEllipse,
	overshoot = 1.05,
) {
	const dx = coin.cx - chipX;
	const dy = coin.cy - chipY;
	const a =
		(dx * dx) / (coin.rx * coin.rx) + (dy * dy) / (coin.ry * coin.ry);
	const s = (1 - 1 / Math.sqrt(a)) * overshoot;
	return { x: chipX + dx * s, y: chipY + dy * s };
}

/** Gentle bow outward from the coin so corridors read organic, not laser-straight. */
function corridorPath(
	startX: number,
	startY: number,
	rimX: number,
	rimY: number,
	coin: CoinEllipse,
) {
	const mx = (startX + rimX) / 2;
	const my = (startY + rimY) / 2;
	let outX = mx - coin.cx;
	let outY = my - coin.cy;
	const outLen = Math.hypot(outX, outY);
	if (outLen < 1) {
		return `M ${startX} ${startY} L ${rimX} ${rimY}`;
	}
	outX /= outLen;
	outY /= outLen;
	const chord = Math.hypot(rimX - startX, rimY - startY);
	const bow = chord * 0.11;
	const cx = mx + outX * bow;
	const cy = my + outY * bow;
	return `M ${startX} ${startY} Q ${cx} ${cy} ${rimX} ${rimY}`;
}

function coinInStage(
	frameRect: DOMRect,
	stageRect: DOMRect,
): CoinEllipse {
	const scale = Math.min(frameRect.width / 1024, frameRect.height / 682);
	const imgW = 1024 * scale;
	const imgH = 682 * scale;
	const imgLeft =
		frameRect.left - stageRect.left + (frameRect.width - imgW) / 2;
	const imgTop =
		frameRect.top - stageRect.top + (frameRect.height - imgH) / 2;
	return {
		cx: imgLeft + (COIN_ART.cx / 1024) * imgW,
		cy: imgTop + (COIN_ART.cy / 682) * imgH,
		rx: (COIN_ART.rx / 1024) * imgW,
		ry: (COIN_ART.ry / 682) * imgH,
	};
}

/** Hero coin with corridor currency chips wired into the coverage section. */
export function HeroCoinStage() {
	const stageRef = useRef<HTMLDivElement>(null);
	const frameRef = useRef<HTMLDivElement>(null);
	const chipRefs = useRef(new Map<string, HTMLAnchorElement>());
	const chipRefFns = useRef(
		new Map<string, (el: HTMLAnchorElement | null) => void>(),
	);
	const pathRefs = useRef(new Map<string, SVGPathElement>());
	const pathRefFns = useRef(
		new Map<string, (el: SVGPathElement | null) => void>(),
	);
	const [stageSize, setStageSize] = useState({ w: 100, h: 68 });

	const applyRails = useCallback(() => {
		const stage = stageRef.current;
		const frame = frameRef.current;
		if (!stage || !frame) return;

		const sr = stage.getBoundingClientRect();
		if (sr.width < 1 || sr.height < 1) return;

		const coin = coinInStage(frame.getBoundingClientRect(), sr);

		for (const c of CURRENCIES) {
			const pathEl = pathRefs.current.get(c.code);
			const chip = chipRefs.current.get(c.code);
			if (!pathEl || !chip) continue;

			const cr = chip.getBoundingClientRect();
			const startX =
				c.side === "left" ? cr.right - sr.left : cr.left - sr.left;
			const startY = cr.top - sr.top + cr.height / 2;
			const rim = rimOnCoin(startX, startY, coin);
			pathEl.setAttribute(
				"d",
				corridorPath(startX, startY, rim.x, rim.y, coin),
			);
		}
	}, []);

	const syncStageSize = useCallback(() => {
		const stage = stageRef.current;
		if (!stage) return;
		const sr = stage.getBoundingClientRect();
		if (sr.width < 1 || sr.height < 1) return;
		const w = sr.width;
		const h = sr.height;
		setStageSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
	}, []);

	const layoutSync = useCallback(() => {
		syncStageSize();
		applyRails();
	}, [applyRails, syncStageSize]);

	const chipRef = useCallback((code: string) => {
		let fn = chipRefFns.current.get(code);
		if (!fn) {
			fn = (el: HTMLAnchorElement | null) => {
				if (el) chipRefs.current.set(code, el);
				else chipRefs.current.delete(code);
			};
			chipRefFns.current.set(code, fn);
		}
		return fn;
	}, []);

	const pathRef = useCallback((code: string) => {
		let fn = pathRefFns.current.get(code);
		if (!fn) {
			fn = (el: SVGPathElement | null) => {
				if (el) pathRefs.current.set(code, el);
				else pathRefs.current.delete(code);
			};
			pathRefFns.current.set(code, fn);
		}
		return fn;
	}, []);

	useLayoutEffect(() => {
		const stage = stageRef.current;
		if (!stage) return;

		layoutSync();
		const ro = new ResizeObserver(() => layoutSync());
		ro.observe(stage);
		const frame = frameRef.current;
		if (frame) ro.observe(frame);

		window.addEventListener("resize", layoutSync);
		void document.fonts?.ready.then(layoutSync);

		return () => {
			ro.disconnect();
			window.removeEventListener("resize", layoutSync);
		};
	}, [layoutSync]);

	// CSS wobble uses transform — ResizeObserver won't fire; sample each frame.
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return;
		}

		let frame = 0;
		const tick = () => {
			applyRails();
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [applyRails]);

	return (
		<div
			ref={stageRef}
			className="hero-coin-stage"
			role="img"
			aria-label="The Corredor token with payment corridors to USD, USDC, MXN, BRL, COP and ARS."
		>
			<svg
				className="hero-coin-rails"
				viewBox={`0 0 ${stageSize.w} ${stageSize.h}`}
				aria-hidden="true"
			>
				{CURRENCIES.map((c) => (
					<path key={c.code} ref={pathRef(c.code)} />
				))}
			</svg>
			<div ref={frameRef} className="hero-coin-frame">
				<div className="hero-coin-glow" aria-hidden="true" />
				<div className="hero-coin-glow hero-coin-glow--halo" aria-hidden="true" />
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
					ref={chipRef(c.code)}
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
