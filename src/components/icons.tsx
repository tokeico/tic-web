// The design's inline icons (same paths and stroke widths), as components.

interface IconProps {
	size?: number;
	sw?: number;
	stroke?: string;
}

function Svg({
	size = 14,
	sw = 2.2,
	stroke = "currentColor",
	children,
	fill = "none",
	style,
}: IconProps & {
	children: React.ReactNode;
	fill?: string;
	style?: React.CSSProperties;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={fill}
			stroke={fill === "none" ? stroke : undefined}
			strokeWidth={sw}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			style={style}
		>
			{children}
		</svg>
	);
}

export const IcCheck = (p: IconProps) => (
	<Svg sw={2.6} {...p}>
		<path d="M20 6 9 17l-5-5" />
	</Svg>
);
export const IcWarn = (p: IconProps) => (
	<Svg {...p}>
		<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
		<path d="M12 9v4" />
		<path d="M12 17h.01" />
	</Svg>
);
export const IcBad = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="9" />
		<path d="m15 9-6 6" />
		<path d="m9 9 6 6" />
	</Svg>
);
export const IcShield = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
		<path d="M12 8v5" />
		<path d="M12 16h.01" />
	</Svg>
);
export const IcShieldCheck = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
		<path d="m9 12 2 2 4-4" />
	</Svg>
);
export const IcWait = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="9" />
		<path d="M12 7v5l3 2" />
	</Svg>
);
export const IcDone = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="9" />
		<path d="m8 12 3 3 5-6" />
	</Svg>
);
export const IcFields = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="9" />
		<path d="M12 8h.01" />
		<path d="M11 12h1v4h1" />
	</Svg>
);
export const IcNa = (p: IconProps) => (
	<Svg {...p}>
		<path d="M6 12h12" />
	</Svg>
);
export const IcClose = (p: IconProps) => (
	<Svg size={16} sw={2} {...p}>
		<path d="M6 6l12 12" />
		<path d="M18 6 6 18" />
	</Svg>
);
export const IcChat = (p: IconProps) => (
	<Svg sw={2} {...p}>
		<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
	</Svg>
);
export const IcPlay = (p: IconProps) => (
	<Svg size={16} fill="currentColor" {...p}>
		<path d="M8 5v14l11-7z" />
	</Svg>
);
export const IcLock = (p: IconProps) => (
	<Svg size={14} sw={2} {...p}>
		<rect x="5" y="11" width="14" height="10" rx="2" />
		<path d="M8 11V7a4 4 0 0 1 8 0v4" />
	</Svg>
);
export const IcTool = (p: IconProps) => (
	<Svg size={11} {...p}>
		<path d="M4 17l6-6-6-6" />
		<path d="M12 19h8" />
	</Svg>
);
export const IcSwap = (p: IconProps) => (
	<Svg size={18} stroke="#7fe0c8" {...p}>
		<path d="M17 3l4 4-4 4" />
		<path d="M3 11V9a2 2 0 0 1 2-2h16" />
		<path d="M7 21l-4-4 4-4" />
		<path d="M21 13v2a2 2 0 0 1-2 2H3" />
	</Svg>
);
export const IcUpload = (p: IconProps) => (
	<Svg size={40} sw={1.6} stroke="#0e6b5c" {...p}>
		<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
		<path d="M14 3v5h5" />
		<path d="M12 18v-6" />
		<path d="m9 15 3-3 3 3" />
	</Svg>
);

import type { PillIcon } from "#/lib/view";

/** The icon inside a status pill. */
export function PillGlyph({ icon }: { icon: PillIcon }) {
	switch (icon) {
		case "ok":
			return <IcCheck />;
		case "warn":
			return <IcWarn />;
		case "bad":
			return <IcBad />;
		case "shield":
			return <IcShield />;
		case "wait":
			return <IcWait />;
		case "done":
			return <IcDone />;
	}
}
