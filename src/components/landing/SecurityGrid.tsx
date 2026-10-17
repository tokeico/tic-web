import type { ComponentType } from "react";
import { Chain, Fingerprint, Quote, UserCheck } from "@/components/icons";

/** One guarantee the product makes about the agent. A distinct glyph per
 *  card, so the grid reads without being read. */
const GUARANTEES: {
	icon: ComponentType<{ size?: number; width?: number }>;
	title: string;
	body: string;
}[] = [
	{
		icon: Fingerprint,
		title: "Deterministic engine",
		body: "The same invoice and date always produce the same plan — replayable, with a fingerprint.",
	},
	{
		icon: Quote,
		title: "Every claim cited",
		body: "Each decision names the rule, its effective date, and links the source.",
	},
	{
		icon: UserCheck,
		title: "No money-moving AI",
		body: "The agent can read and propose. Approving and paying exist only for people.",
	},
	{
		icon: Chain,
		title: "Hash-chained audit",
		body: "Every AI step, engine step and human decision is chained; editing one breaks the chain.",
	},
];

/**
 * Security as a visible 2×2 grid of guarantees. Broke out of the old
 * carousel so all four sit next to the section anchor, not behind rotation.
 */
export function SecurityGrid() {
	return (
		<section id="security" className="lp-section lp-section-subtle">
			<div className="lp-shell flex flex-col items-center gap-8 py-16">
				<div className="flex flex-col items-center gap-3 text-center">
					<span className="lab" style={{ color: "var(--color-volt)" }}>
						Security
					</span>
					<h2
						className="display m-0"
						style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.1 }}
					>
						AI explains. Code decides. You approve.
					</h2>
					<p
						className="m-0 text-ash"
						style={{ fontSize: 16, maxWidth: "52ch" }}
					>
						Four guarantees enforced by the code, not the prompt.
					</p>
				</div>

				<div className="lp-security-grid">
					{GUARANTEES.map(({ icon: Icon, title, body }) => (
						<article key={title} className="lp-step">
							<span className="lp-glyph-badge" aria-hidden="true">
								<Icon size={20} width={2} />
							</span>
							<span className="font-semibold" style={{ fontSize: 15.5 }}>
								{title}
							</span>
							<span
								className="text-ash-dim"
								style={{ fontSize: 13.5, lineHeight: 1.5 }}
							>
								{body}
							</span>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
