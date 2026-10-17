type RouteStopProps = {
	label?: string;
	value?: string;
	/** Previous value, shown struck through on the updated stop. */
	was?: string;
	state?: "default" | "updated";
	className?: string;
};

/**
 * Route/Stop (Figma 20:124). Default: neutral edge, stone label.
 * Updated: 2px brand-yellow border, yellow label, struck "was" line.
 */
export function RouteStop({
	label,
	value,
	was,
	state = "default",
	className,
}: RouteStopProps) {
	if (state === "updated") {
		return (
			<div
				className={`flex flex-1 flex-col items-start gap-1.5 rounded-[var(--radius-md)] border-2 border-solid border-[var(--brand-yellow)] p-[18px] ${className ?? ""}`}
			>
				<p className="m-0 text-sm leading-[1.5] text-[var(--brand-yellow)]">
					{label}
				</p>
				<p className="m-0 text-xl leading-[1.35] font-semibold text-[var(--neutral-paper)]">
					{value}
				</p>
				{was ? (
					<p className="m-0 text-sm leading-[1.5] text-[var(--neutral-stone)] line-through">
						{was}
					</p>
				) : null}
			</div>
		);
	}
	return (
		<div
			className={`flex flex-1 flex-col items-start gap-1.5 rounded-[var(--radius-md)] border border-solid border-[var(--neutral-edge)] p-[18px] ${className ?? ""}`}
		>
			<p className="m-0 text-sm leading-[1.5] text-[var(--neutral-stone)]">
				{label}
			</p>
			<p className="m-0 text-xl leading-[1.35] font-semibold text-[var(--neutral-paper)]">
				{value}
			</p>
		</div>
	);
}
