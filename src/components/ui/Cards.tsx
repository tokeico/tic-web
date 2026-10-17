type CardRuleProps = {
	title?: string;
	body?: string;
	className?: string;
};

/** Card/Rule (Figma 20:109): yellow top rule, heading-s, body-m mist. */
export function CardRule({ title, body, className }: CardRuleProps) {
	return (
		<div
			className={`flex flex-col items-start gap-2 border-t-2 border-solid border-[var(--brand-yellow)] pt-4 ${className ?? ""}`}
		>
			<p className="font-heading-s m-0 w-full text-[var(--neutral-paper)]">
				{title}
			</p>
			<p className="font-body-m m-0 w-full text-[var(--neutral-mist)]">
				{body}
			</p>
		</div>
	);
}

type CardStepProps = {
	number?: string;
	title?: string;
	body?: string;
	className?: string;
};

/** Card/Step (Figma 20:112): numbered step, yellow figure, top rule. */
export function CardStep({ number, title, body, className }: CardStepProps) {
	return (
		<div
			className={`flex flex-1 flex-col items-start gap-3 border-t-2 border-solid border-[var(--brand-yellow)] pt-5 ${className ?? ""}`}
		>
			<p className="font-figure m-0 w-full text-[var(--brand-yellow)]">
				{number}
			</p>
			<p className="m-0 w-full text-xl leading-[1.35] font-semibold text-[var(--neutral-paper)]">
				{title}
			</p>
			<p className="font-body-m m-0 w-full text-[var(--neutral-mist)]">
				{body}
			</p>
		</div>
	);
}

type CardValueProps = {
	word?: string;
	line?: string;
	body?: string;
	className?: string;
};

/** Card/Value (Figma 20:116): graphite card, yellow word, Semibold line. */
export function CardValue({ word, line, body, className }: CardValueProps) {
	return (
		<div
			className={`flex flex-1 flex-col items-start gap-3 rounded-[var(--radius-xl)] bg-[var(--neutral-graphite)] p-8 ${className ?? ""}`}
		>
			<p className="font-heading-m m-0 w-full text-[var(--brand-yellow)]">
				{word}
			</p>
			<p className="m-0 w-full text-xl leading-[1.35] font-semibold text-[var(--neutral-paper)]">
				{line}
			</p>
			<p className="font-body-m m-0 w-full text-[var(--neutral-mist)]">
				{body}
			</p>
		</div>
	);
}

type CardStatProps = {
	figure?: string;
	body?: string;
	source?: string;
	className?: string;
};

/** Card/Stat (Figma 20:120): graphite card, yellow figure, mono source. */
export function CardStat({ figure, body, source, className }: CardStatProps) {
	return (
		<div
			className={`flex flex-1 flex-col items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--neutral-graphite)] p-6 ${className ?? ""}`}
		>
			<p className="font-figure m-0 w-full text-[var(--brand-yellow)]">
				{figure}
			</p>
			<p className="font-body-m m-0 w-full text-[var(--neutral-mist)]">
				{body}
			</p>
			<p className="mono-caption m-0 w-full text-[var(--neutral-stone)]">
				{source}
			</p>
		</div>
	);
}
