import { Link, type LinkProps } from "@tanstack/react-router";
import type { Country, PayoutStatus } from "#/lib/contracts";
import { COUNTRY_NAME, STATUS } from "#/lib/view";
import { PillGlyph } from "./icons";

export function StatusPill({ status }: { status: PayoutStatus }) {
	const s = STATUS[status];
	return (
		<span className={`pill ${s.cls}`}>
			<PillGlyph icon={s.icon} />
			{s.label}
		</span>
	);
}

/** Two-letter country code in the design's outlined box. */
export function Cc({ country }: { country: Country }) {
	return (
		<span className="cc" role="img" aria-label={COUNTRY_NAME[country]}>
			{country}
		</span>
	);
}

export type Actor = "AI" | "AI + Code" | "Code" | "Human";
const ACTOR_CLS: Record<Actor, string> = {
	AI: "act-ai",
	"AI + Code": "act-ai",
	Code: "act-code",
	Human: "act-human",
};

/** Who is responsible for a step: AI reads, code decides, a person approves. */
export const Act = ({
	actor,
	style,
}: {
	actor: Actor;
	style?: React.CSSProperties;
}) => (
	<span className={`act ${ACTOR_CLS[actor]}`} style={style}>
		{actor}
	</span>
);

/** A rule id that links to its source. */
export function RuleRef({
	id,
	url,
	tip,
	href,
	style,
}: {
	id: string;
	url?: string;
	tip?: string;
	href?: string;
	style?: React.CSSProperties;
}) {
	return (
		<a
			className="ruleref"
			href={href ?? url ?? "#"}
			title={tip}
			style={style}
			{...(href ? {} : { target: "_blank", rel: "noopener noreferrer" })}
		>
			{id}
		</a>
	);
}

/** A link that keeps the as-of date in the URL. */
export function KeepLink(
	props: Omit<LinkProps, "search"> & {
		className?: string;
		children?: React.ReactNode;
	},
) {
	return (
		<Link
			{...(props as LinkProps)}
			search={
				((p: Record<string, unknown>) => ({
					asOf: p.asOf,
				})) as LinkProps["search"]
			}
		/>
	);
}

export const Lab = ({
	children,
	style,
}: {
	children: React.ReactNode;
	style?: React.CSSProperties;
}) => (
	<span className="lab" style={style}>
		{children}
	</span>
);

export const H1 = ({
	children,
	id,
}: {
	children: React.ReactNode;
	id?: string;
}) => (
	<h1
		id={id}
		style={{
			margin: 0,
			fontFamily: "'Archivo',sans-serif",
			fontWeight: 750,
			fontStretch: "90%",
			fontSize: 26,
		}}
	>
		{children}
	</h1>
);
