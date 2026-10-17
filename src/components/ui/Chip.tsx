type ChipProps = {
	label?: string;
	className?: string;
};

/** Chip (Figma 20:103): black pill, neutral edge, paper text. */
export function Chip({ label, className }: ChipProps) {
	return (
		<div
			className={`inline-flex items-center rounded-[var(--radius-pill)] border border-solid border-[var(--neutral-edge)] bg-[var(--brand-black)] px-4 py-2 ${className ?? ""}`}
		>
			<p className="m-0 text-sm leading-[1.3] font-medium text-[var(--neutral-paper)] whitespace-nowrap">
				{label}
			</p>
		</div>
	);
}
