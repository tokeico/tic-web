import type { ComponentType } from "react";
import { BanknoteCheck, FileUp, Route, Scales } from "@/components/icons";

/** One step of the flow. The icon carries the meaning; the rail (CSS)
 *  shows that the four steps are a sequence, not a menu. */
const STEPS: {
	n: string;
	icon: ComponentType<{ size?: number; width?: number }>;
	title: string;
	body: string;
}[] = [
	{
		n: "01",
		icon: FileUp,
		title: "Drop in your invoice",
		body: "Tell us who you’re paying and in which country.",
	},
	{
		n: "02",
		icon: Scales,
		title: "We analyze the rules",
		body: "Corredor checks local regulations and available routes, as of today’s date.",
	},
	{
		n: "03",
		icon: Route,
		title: "We build your plan",
		body: "Corredor maps a customized route for your invoice—rails, local rules, and tradeoffs.",
	},
	{
		n: "04",
		icon: BanknoteCheck,
		title: "You review",
		body: "See every rule cited, approve when you’re ready, then pay on the recommended rail.",
	},
];

/**
 * Static timeline of the four steps. Broke out of the old carousel so the
 * whole flow is visible at once; anchors the hero's "See how it works" CTA.
 */
export function HowItWorks() {
	return (
		<section id="how-it-works" className="lp-section">
			<div className="lp-shell flex flex-col items-center gap-8 py-16">
				<div className="flex flex-col items-center gap-3 text-center">
					<span className="lab" style={{ color: "var(--color-volt)" }}>
						How it works
					</span>
					<h2
						className="display m-0"
						style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.1 }}
					>
						From invoice to compliant payout.
					</h2>
					<p
						className="m-0 text-ash"
						style={{ fontSize: 16, maxWidth: "52ch" }}
					>
						The same four steps for every payout — and the last one always
						belongs to a person.
					</p>
				</div>

				<ol className="lp-timeline">
					{STEPS.map((s) => {
						const Icon = s.icon;
						return (
							<li key={s.n} className="lp-timeline-step">
								<span className="lp-glyph-badge" aria-hidden="true">
									<Icon size={19} width={2} />
								</span>
								<div className="flex min-w-0 flex-col gap-1.5">
									<span className="mono lp-timeline-num">{s.n}</span>
									<span className="font-semibold" style={{ fontSize: 15 }}>
										{s.title}
									</span>
									<span
										className="text-ash-dim"
										style={{ fontSize: 13, lineHeight: 1.45 }}
									>
										{s.body}
									</span>
								</div>
							</li>
						);
					})}
				</ol>
			</div>
		</section>
	);
}
