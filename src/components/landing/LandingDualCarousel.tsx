import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import {
	Chat,
	CheckCircle,
	Clock,
	ShieldCheck,
	WarnTriangle,
} from "@/components/icons";

const HOW_STEPS = [
	{
		n: "01",
		icon: Chat,
		title: "Drop in your invoice",
		body: "Tell us who you’re paying and in which country.",
	},
	{
		n: "02",
		icon: Clock,
		title: "We analyze the rules",
		body: "Corredor checks local regulations and available payment routes, as of today’s date.",
	},
	{
		n: "03",
		icon: WarnTriangle,
		title: "We build your payment plan",
		body: "Corredor maps a customized route for your invoice—rails, local rules, and tradeoffs.",
	},
	{
		n: "04",
		icon: CheckCircle,
		title: "You review and pay",
		body: "See every rule cited, approve when you’re ready, then pay on the recommended rail.",
	},
];

const SECURITY_SLIDES = [
	{
		title: "Deterministic engine",
		body: "The same invoice and date always produce the same plan — replayable, with a fingerprint.",
	},
	{
		title: "Every claim cited",
		body: "Each decision names the rule, its effective date, and links the source.",
	},
	{
		title: "No money-moving AI",
		body: "The agent can read and propose. Approving and paying exist only for people.",
	},
	{
		title: "Hash-chained audit",
		body: "Every AI step, engine step and human decision is chained; editing one breaks the chain.",
	},
];

type Slide = {
	n?: string;
	icon?: ComponentType<{ size?: number }>;
	title: string;
	body: string;
};

function MiniCarousel({
	id,
	label,
	slides,
	heading,
}: {
	id: string;
	label: string;
	slides: Slide[];
	heading: string;
}) {
	const [index, setIndex] = useState(0);
	const count = slides.length;
	const slide = slides[index];
	const Icon = slide.icon;
	const reduceMotion = useReducedMotion();

	const goTo = (next: number) => {
		setIndex(((next % count) + count) % count);
	};

	useEffect(() => {
		if (reduceMotion) return;
		const timer = window.setInterval(() => {
			setIndex((i) => (i + 1) % count);
		}, 7000);
		return () => window.clearInterval(timer);
	}, [count, reduceMotion]);

	const prev = () => goTo(index - 1);
	const next = () => goTo(index + 1);

	return (
		<div id={id} className="lp-mini-carousel">
			<div className="lp-mini-carousel-header flex flex-wrap items-end justify-between gap-3">
				<div className="flex flex-col gap-1">
					<span className="lab text-ash-dim">{label}</span>
					<h2 className="display m-0 lp-mini-carousel-title">{heading}</h2>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="lp-carousel-btn"
						onClick={prev}
						aria-label={`Previous ${label} slide`}
					>
						←
					</button>
					<button
						type="button"
						className="lp-carousel-btn"
						onClick={next}
						aria-label={`Next ${label} slide`}
					>
						→
					</button>
				</div>
			</div>

			<div className="lp-mini-carousel-viewport">
				<article
					key={index}
					className={`lp-mini-carousel-panel lp-step${reduceMotion ? "" : " lp-carousel-slide-in"}`}
					aria-live="polite"
				>
					<div className="flex items-center justify-between gap-3">
						{slide.n ? (
							<span className="mono lp-mini-carousel-num">{slide.n}</span>
						) : (
							<span style={{ color: "var(--color-volt)" }}>
								<ShieldCheck size={18} />
							</span>
						)}
						{Icon ? (
							<span className="text-ash-dim">
								<Icon size={18} />
							</span>
						) : null}
					</div>
					<span className="font-semibold" style={{ fontSize: 14.5 }}>
						{slide.title}
					</span>
					<span
						className="text-ash-dim"
						style={{ fontSize: 13, lineHeight: 1.45 }}
					>
						{slide.body}
					</span>
				</article>
			</div>

			<div
				className="lp-mini-carousel-dots flex gap-1.5"
				role="tablist"
				aria-label={`${label} slides`}
			>
				{slides.map((s, i) => (
					<button
						key={s.title}
						type="button"
						role="tab"
						aria-selected={i === index}
						aria-label={`${s.title}`}
						className="lp-carousel-dot"
						data-active={i === index ? "" : undefined}
						onClick={() => goTo(i)}
					/>
				))}
			</div>
		</div>
	);
}

function useReducedMotion() {
	const [reduce, setReduce] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReduce(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);
	return reduce;
}

/** Compact how-it-works and security carousels, side by side at the page foot. */
export function LandingDualCarousel() {
	return (
		<section
			className="lp-section lp-section-subtle"
			aria-label="Product details"
		>
			<div className="mx-auto grid max-w-[1320px] gap-8 px-6 py-10 lg:grid-cols-2 lg:gap-10">
				<MiniCarousel
					id="how-it-works"
					label="How it works"
					heading="From invoice to compliant payout."
					slides={HOW_STEPS}
				/>
				<MiniCarousel
					id="security"
					label="Security"
					heading="AI explains. Code decides. You approve."
					slides={SECURITY_SLIDES}
				/>
			</div>
		</section>
	);
}
