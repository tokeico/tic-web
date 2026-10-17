type ButtonProps = {
	label?: string;
	variant?: "primary" | "ghost";
	size?: "large" | "small";
	href?: string;
	className?: string;
};

/**
 * Button (Figma 20:84). Pill radius, Geist labels.
 * Primary: brand yellow on black text. Ghost: 1px neutral edge, paper text.
 */
export function Button({
	label = "Come in",
	variant = "primary",
	size = "large",
	href,
	className,
}: ButtonProps) {
	const base =
		"inline-flex items-center justify-center rounded-[var(--radius-pill)] whitespace-nowrap cursor-pointer hover:-translate-y-0.5";
	const styles =
		variant === "primary"
			? size === "small"
				? "bg-[var(--brand-yellow)] px-[22px] py-3 text-sm font-medium text-[var(--brand-black)] hover:bg-[#ffff80]"
				: "bg-[var(--brand-yellow)] px-8 py-[18px] text-[17px] font-semibold text-[var(--brand-black)] hover:bg-[#ffff80]"
			: size === "small"
				? "border border-solid border-[var(--neutral-edge)] px-[22px] py-3 text-sm font-medium text-[var(--neutral-paper)] hover:border-[var(--neutral-stone)]"
				: "border border-solid border-[var(--neutral-edge)] px-8 py-[17px] text-[17px] font-semibold text-[var(--neutral-paper)] hover:border-[var(--neutral-stone)]";

	if (href) {
		return (
			<a href={href} className={`${base} ${styles} ${className ?? ""}`}>
				{label}
			</a>
		);
	}
	return (
		<button type="button" className={`${base} ${styles} ${className ?? ""}`}>
			{label}
		</button>
	);
}
