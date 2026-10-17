import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { RULES } from '@/domain/data'
import { activeRuleCount } from '@/domain/engine'
import { fmtDate, iso } from '@/domain/format'
import { ACTOR, useStore, VIEW_PATH, type ViewId } from '@/state/store'
import { Close, Swap } from './icons'

const TABS: [ViewId, string][] = [
  ['overview', 'Overview'],
  ['inbox', 'Inbox'],
  ['agent', 'Agent'],
  ['trust', 'Trust & compliance'],
  ['ledger', 'Ledger'],
  ['audit', 'Audit'],
  ['customize', 'Customize'],
]

/** The milestones the pitch drags between. */
const JUMPS: [number, string][] = [
  [5, 'Sep 30'],
  [6, 'Oct 1 · Res. 561'],
  [22, 'Today'],
  [35, 'Oct 30 · VASP deadline'],
]

export function Shell({ children }: { children: ReactNode }) {
  const { state, go } = useStore()
  const { pathname } = useLocation()
  const pending = state.actions.filter((a) => a.status === 'pending')

  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex flex-wrap items-center gap-[18px]">
            <div className="flex items-baseline gap-2.5">
              <span
                style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontWeight: 800,
                  fontStretch: '86%',
                  fontSize: 26,
                  letterSpacing: '-.01em',
                }}
              >
                Corredor
              </span>
              <span className="lab">Payouts · LatAm</span>
            </div>
            <nav aria-label="Main" className="flex flex-wrap gap-0.5">
              {TABS.map(([id, label]) => {
                const on = pathname === VIEW_PATH[id]
                const text =
                  id === 'agent' && pending.length ? 'Agent · ' + pending.length : label
                return (
                  <button
                    key={id}
                    type="button"
                    className={'tab' + (on ? ' tab-on' : '')}
                    aria-pressed={on}
                    onClick={() => go(id)}
                  >
                    {text}
                  </button>
                )
              })}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body" style={{ fontSize: 13 }}>
              Acting as <strong className="font-semibold">{ACTOR}</strong> · Controller
            </span>
            <span className="pill p-neutral">
              {'Rules pack v1 · ' +
                activeRuleCount(iso(state.day)) +
                ' of ' +
                RULES.length +
                ' active' +
                (state.registry.ponte ? ' · registry v2' : '')}
            </span>
            <span className="pill p-warn">Pending compliance review</span>
            <span className="pill p-muted">Rail: simulated</span>
          </div>
        </div>

        <AsOfBar />
      </header>

      <TourBar />
      {children}
      <Toast />
    </div>
  )
}

/**
 * The as-of date bar. Moving it re-runs the rules engine for every open payout
 * — the demo's single most important control.
 */
function AsOfBar() {
  const { state, setDay } = useStore()
  const label = fmtDate(iso(state.day))

  return (
    <div className="border-t border-line-soft bg-paper-dim">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
        <div className="flex min-w-[170px] flex-col gap-0.5">
          <label htmlFor="asof" className="lab">
            As-of date
          </label>
          <span
            className="mono"
            style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}
          >
            {label}
          </span>
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
          <input
            id="asof"
            type="range"
            min={0}
            max={41}
            step={1}
            value={state.day}
            onChange={(e) => setDay(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'var(--color-brand)', height: 28 }}
            aria-valuetext={label}
          />
          <div className="mono flex justify-between text-muted" style={{ fontSize: 12 }}>
            <span>Sep 25</span>
            <span>Nov 5</span>
          </div>
        </div>
        <div role="group" aria-label="Jump to date" className="flex flex-wrap gap-1.5">
          {JUMPS.map(([d, label2]) => (
            <button
              key={d}
              type="button"
              className={'jump' + (state.day === d ? ' jump-on' : '')}
              aria-pressed={state.day === d}
              onClick={() => setDay(d)}
            >
              {label2}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The 3-minute guided demo: each step says the line and performs the action. */
function TourBar() {
  const { state, tourSteps, tourBack, tourDo, tourExit } = useStore()
  if (state.tour == null) return null
  const steps = tourSteps()
  const i = state.tour
  const step = steps[i]

  return (
    <div className="bg-ink text-paper" aria-live="polite">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-3">
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[3px]">
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--color-brand-pale)',
            }}
          >
            {'Guided demo · step ' + (i + 1) + ' of ' + steps.length + ' · ' + step.time}
          </span>
          <span className="font-semibold" style={{ fontSize: 16 }}>
            {step.title}
          </span>
          <span style={{ fontSize: 14, color: '#d5e1dd' }}>{'Say: “' + step.say + '”'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm" disabled={i === 0} onClick={tourBack}>
            Previous
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={tourDo}
            style={{ borderColor: 'var(--color-brand-glow)' }}
          >
            {i === steps.length - 1 ? 'Do it and finish' : 'Do it · next step'}
          </button>
          <button type="button" className="btn btn-sm" onClick={tourExit}>
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}

/** Names every reroute a change caused, and the rule that caused it. */
function Toast() {
  const { state, closeToast } = useStore()
  return (
    <div
      aria-live="polite"
      className="fixed right-5 bottom-5 z-20 max-w-[440px]"
    >
      {state.toast && (
        <div
          className="bg-ink text-paper flex items-start gap-3 rounded-lg px-4 py-3.5"
          style={{ boxShadow: '0 8px 24px rgba(19,32,28,.25)' }}
        >
          <Swap color="var(--color-brand-glow)" style={{ flex: 'none', marginTop: 2 }} />
          <div className="flex min-w-0 flex-col gap-1">
            {state.toast.lines.map((l, n) => (
              <span key={n} style={{ fontSize: 14 }}>
                <strong className="font-semibold">{l.head}</strong> {l.body}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={closeToast}
            aria-label="Dismiss"
            className="text-paper border-0 bg-transparent p-0.5"
            style={{ minWidth: 28, minHeight: 28 }}
          >
            <Close />
          </button>
        </div>
      )}
    </div>
  )
}
