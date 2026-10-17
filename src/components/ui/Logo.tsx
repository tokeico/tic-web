type LogoMarkProps = {
	size?: number;
	className?: string;
};

/**
 * The Corredor mark: a coin with a diamond passage (brandbook §03).
 * Primary on black; reversed (black passage coin) is the same asset.
 * Min size 24px; clear space: one diamond width.
 */
export function LogoMark({ size = 38, className }: LogoMarkProps) {
	return (
		<img
			src="/assets/logo-mark.svg"
			alt="Corredor"
			width={size}
			height={size}
			className={className}
			style={{ width: size, height: size }}
		/>
	);
}

type LogoLockupProps = {
	layout?: "inline" | "stacked";
	className?: string;
};

/** Corredor by TOKEISO. Inline for headers, stacked for covers. */
export function LogoLockup({ layout = "inline", className }: LogoLockupProps) {
	if (layout === "stacked") {
		return (
			<div className={`flex items-center gap-6 ${className ?? ""}`}>
				<LogoMark size={96} />
				<div className="flex flex-col items-start gap-1">
					<p className="font-display-xl m-0 leading-[1.05] text-[var(--neutral-paper)]">
						Corredor
					</p>
					<p className="eyebrow m-0 text-[var(--neutral-mist)] tracking-[3.52px]">
						By tokeiso
					</p>
				</div>
			</div>
		);
	}
	return (
		<div className={`flex items-center gap-3 ${className ?? ""}`}>
			<LogoMark size={38} />
			<p className="font-heading-s m-0 text-[var(--neutral-paper)]">Corredor</p>
			<p className="eyebrow m-0 text-[var(--neutral-stone)]">By tokeiso</p>
		</div>
	);
}
