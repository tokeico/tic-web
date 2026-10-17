import type { CSSProperties } from "react";

/**
 * The icon set used by the approved design, inlined so there is no icon
 * dependency and every glyph inherits `currentColor` from its pill or row.
 */

interface IconProps {
	size?: number;
	width?: number;
	color?: string;
	style?: CSSProperties;
	className?: string;
}

/** Vertical kebab: the overflow affordance for the demoted views. */
export const More = (p: IconProps) => (
	<Svg {...p} width={0}>
		<circle cx="12" cy="5.2" r="1.7" fill="currentColor" stroke="none" />
		<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
		<circle cx="12" cy="18.8" r="1.7" fill="currentColor" stroke="none" />
	</Svg>
);

const Svg = ({
	size = 14,
	width = 2.2,
	color,
	style,
	className,
	children,
}: IconProps & { children: React.ReactNode }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke={color ?? "currentColor"}
		strokeWidth={width}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		style={style}
		className={className}
	>
		{children}
	</svg>
);

export const Check = (p: IconProps) => (
	<Svg {...p} width={p.width ?? 2.6}>
		<path d="M20 6 9 17l-5-5" />
	</Svg>
);

export const WarnTriangle = (p: IconProps) => (
	<Svg {...p}>
		<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
		<path d="M12 9v4" />
		<path d="M12 17h.01" />
	</Svg>
);

export const XCircle = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="9" />
		<path d="m15 9-6 6" />
		<path d="m9 9 6 6" />
	</Svg>
);

export const CheckCircle = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="9" />
		<path d="m8 12 3 3 5-6" />
	</Svg>
);

export const Clock = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="9" />
		<path d="M12 7v5l3 2" />
	</Svg>
);

export const InfoCircle = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="9" />
		<path d="M12 8h.01" />
		<path d="M11 12h1v4h1" />
	</Svg>
);

export const Dash = (p: IconProps) => (
	<Svg {...p}>
		<path d="M6 12h12" />
	</Svg>
);

export const ShieldAlert = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
		<path d="M12 8v5" />
		<path d="M12 16h.01" />
	</Svg>
);

export const ShieldCheck = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
		<path d="m9 12 2 2 4-4" />
	</Svg>
);

export const Lock = (p: IconProps) => (
	<Svg {...p} width={p.width ?? 2}>
		<rect x="5" y="11" width="14" height="10" rx="2" />
		<path d="M8 11V7a4 4 0 0 1 8 0v4" />
	</Svg>
);

export const Chat = (p: IconProps) => (
	<Svg {...p} width={p.width ?? 2}>
		<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
	</Svg>
);

export const Close = (p: IconProps) => (
	<Svg {...p} size={p.size ?? 16} width={p.width ?? 2}>
		<path d="M6 6l12 12" />
		<path d="M18 6 6 18" />
	</Svg>
);

export const ToolArrow = (p: IconProps) => (
	<Svg {...p} size={p.size ?? 11}>
		<path d="M4 17l6-6-6-6" />
		<path d="M12 19h8" />
	</Svg>
);

/** Shown on the reroute toast: the plan swapped rails. */
export const Swap = (p: IconProps) => (
	<Svg {...p} size={p.size ?? 18}>
		<path d="M17 3l4 4-4 4" />
		<path d="M3 11V9a2 2 0 0 1 2-2h16" />
		<path d="M7 21l-4-4 4-4" />
		<path d="M21 13v2a2 2 0 0 1-2 2H3" />
	</Svg>
);

export const FileUp = (p: IconProps) => (
	<Svg {...p} size={p.size ?? 40} width={p.width ?? 1.6}>
		<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
		<path d="M14 3v5h5" />
		<path d="M12 18v-6" />
		<path d="m9 15 3-3 3 3" />
	</Svg>
);

export const Play = ({ size = 16 }: IconProps) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="currentColor"
		aria-hidden="true"
	>
		<path d="M8 5v14l11-7z" />
	</svg>
);

/* Landing glyphs: one shape per marketing concept, so each section's
   visuals say what the section is about. */

/** Scales: the rules of the payee's country, weighed for this payment. */
export const Scales = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 3v18" />
		<path d="m19 8 3 8a5 5 0 0 1-6 0zV7" />
		<path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" />
		<path d="m5 8 3 8a5 5 0 0 1-6 0zV7" />
		<path d="M7 21h10" />
	</Svg>
);

/** Route: the mapped rail from invoice to payout. */
export const Route = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="6" cy="19" r="3" />
		<path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
		<circle cx="18" cy="5" r="3" />
	</Svg>
);

/** Banknote with a check: review, approve, then pay. */
export const BanknoteCheck = (p: IconProps) => (
	<Svg {...p}>
		<rect x="2" y="6" width="20" height="12" rx="2" />
		<circle cx="12" cy="12" r="3.4" />
		<path d="m10.7 12 1 1 1.7-1.9" />
		<path d="M6 12h.01" />
		<path d="M18 12h.01" />
	</Svg>
);

/** Fingerprint: the same invoice and date always produce the same plan. */
export const Fingerprint = (p: IconProps) => (
	<Svg {...p} width={p.width ?? 1.8}>
		<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
		<path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
		<path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
		<path d="M2 12a10 10 0 0 1 18-6" />
		<path d="M2 16h.01" />
		<path d="M21.8 16c.2-2 .131-5.354 0-6" />
		<path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
		<path d="M8.65 22c.21-.66.45-1.32.57-2" />
		<path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
	</Svg>
);

/** Quote marks: every claim in a plan cites its rule and source. */
export const Quote = (p: IconProps) => (
	<Svg {...p} width={p.width ?? 2}>
		<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
		<path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
	</Svg>
);

/** A person with a check: approval exists only for people. */
export const UserCheck = (p: IconProps) => (
	<Svg {...p}>
		<path d="m16 11 2 2 4-4" />
		<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
	</Svg>
);

/** Chain links: the hash-chained audit log. */
export const Chain = (p: IconProps) => (
	<Svg {...p}>
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
	</Svg>
);
