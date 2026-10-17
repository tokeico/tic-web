import type { CSSProperties } from 'react'

/**
 * The icon set used by the approved design, inlined so there is no icon
 * dependency and every glyph inherits `currentColor` from its pill or row.
 */

interface IconProps {
  size?: number
  width?: number
  color?: string
  style?: CSSProperties
  className?: string
}

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
    stroke={color ?? 'currentColor'}
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={style}
    className={className}
  >
    {children}
  </svg>
)

export const Check = (p: IconProps) => (
  <Svg {...p} width={p.width ?? 2.6}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
)

export const WarnTriangle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Svg>
)

export const XCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </Svg>
)

export const CheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </Svg>
)

export const Clock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)

export const InfoCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01" />
    <path d="M11 12h1v4h1" />
  </Svg>
)

export const Dash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 12h12" />
  </Svg>
)

export const ShieldAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
    <path d="M12 8v5" />
    <path d="M12 16h.01" />
  </Svg>
)

export const ShieldCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
)

export const Lock = (p: IconProps) => (
  <Svg {...p} width={p.width ?? 2}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
)

export const Chat = (p: IconProps) => (
  <Svg {...p} width={p.width ?? 2}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </Svg>
)

export const Close = (p: IconProps) => (
  <Svg {...p} size={p.size ?? 16} width={p.width ?? 2}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </Svg>
)

export const ToolArrow = (p: IconProps) => (
  <Svg {...p} size={p.size ?? 11}>
    <path d="M4 17l6-6-6-6" />
    <path d="M12 19h8" />
  </Svg>
)

/** Shown on the reroute toast: the plan swapped rails. */
export const Swap = (p: IconProps) => (
  <Svg {...p} size={p.size ?? 18}>
    <path d="M17 3l4 4-4 4" />
    <path d="M3 11V9a2 2 0 0 1 2-2h16" />
    <path d="M7 21l-4-4 4-4" />
    <path d="M21 13v2a2 2 0 0 1-2 2H3" />
  </Svg>
)

export const FileUp = (p: IconProps) => (
  <Svg {...p} size={p.size ?? 40} width={p.width ?? 1.6}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M12 18v-6" />
    <path d="m9 15 3-3 3 3" />
  </Svg>
)

export const Play = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
)
