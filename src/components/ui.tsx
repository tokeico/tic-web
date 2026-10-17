import type { ReactNode } from 'react'

import { pill, type PillIcon } from '@/domain/engine'
import type { Outcome, Status } from '@/domain/types'
import {
  Check,
  CheckCircle,
  Clock,
  Dash,
  InfoCircle,
  ShieldAlert,
  WarnTriangle,
  XCircle,
} from './icons'

export const Lab = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={'lab ' + className}>{children}</span>
)

export const Chip = ({ children }: { children: ReactNode }) => (
  <span className="chip">{children}</span>
)

/** Country code badge. */
export const Cc = ({ code, label }: { code: string; label?: string }) => (
  <span className="cc" aria-label={label}>
    {code}
  </span>
)

const PILL_ICON: Record<PillIcon, (p: { size?: number }) => ReactNode> = {
  ok: Check,
  warn: WarnTriangle,
  bad: XCircle,
  shield: ShieldAlert,
  wait: Clock,
  done: CheckCircle,
}

export function StatusPill({ status }: { status: Status }) {
  const { label, cls, icon } = pill(status)
  const Icon = PILL_ICON[icon]
  return (
    <span className={cls}>
      <Icon />
      {label}
    </span>
  )
}

/** Who was responsible: AI, Code or Human. */
export const ActorTag = ({ actor, cls }: { actor: string; cls: string }) => (
  <span className={cls}>{actor}</span>
)

/** A rule id that links to its source. Every decision carries one. */
export function RuleRef({
  id,
  url,
  tip,
}: {
  id: string
  url: string
  tip?: string
}) {
  return (
    <a className="ruleref" href={url} target="_blank" rel="noopener" title={tip}>
      {id}
    </a>
  )
}

const OUTCOME_ICON: Record<Outcome, (p: { size?: number }) => ReactNode> = {
  pass: Check,
  warn: WarnTriangle,
  block: XCircle,
  fields: InfoCircle,
  na: Dash,
  inactive: Clock,
}

export const OUTCOME_CLS: Record<Outcome, string> = {
  pass: 'ic-ok',
  warn: 'ic-warn',
  block: 'ic-bad',
  fields: 'ic-warn',
  na: 'ic-muted',
  inactive: 'ic-muted',
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  pass: 'Pass',
  warn: 'Warning',
  block: 'Blocked',
  fields: 'Fields needed',
  na: 'Not applicable',
  inactive: 'Not in effect',
}

export function OutcomeIcon({ o }: { o: Outcome }) {
  const Icon = OUTCOME_ICON[o]
  return <Icon size={18} />
}

/** Security-check rows use shield-alert rather than a plain cross. */
export function SecurityIcon({ kind }: { kind: 'ok' | 'warn' | 'bad' }) {
  if (kind === 'ok') return <Check size={18} />
  if (kind === 'warn') return <WarnTriangle size={18} />
  return <ShieldAlert size={18} />
}

export const SEC_CLS: Record<'ok' | 'warn' | 'bad', string> = {
  ok: 'ic-ok',
  warn: 'ic-warn',
  bad: 'ic-bad',
}

export const Card = ({
  children,
  className = '',
  id,
  style,
}: {
  children: ReactNode
  className?: string
  id?: string
  style?: React.CSSProperties
}) => (
  <div className={'card ' + className} id={id} style={style}>
    {children}
  </div>
)

export const CardHead = ({
  title,
  aside,
  level = 3,
}: {
  title: ReactNode
  aside?: ReactNode
  level?: 2 | 3
}) => {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <H className="m-0" style={{ fontSize: level === 2 ? 18 : 16 }}>
        {title}
      </H>
      {aside}
    </div>
  )
}

export const Muted = ({ children, size = 13 }: { children: ReactNode; size?: number }) => (
  <span className="text-ash-dim" style={{ fontSize: size }}>
    {children}
  </span>
)
