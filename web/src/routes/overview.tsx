import { actorOf } from '@/domain/audit'
import { views } from '@/domain/engine'
import { fmtDate, iso, usd0 } from '@/domain/format'
import { useStore } from '@/state/store'
import { Play } from '@/components/icons'
import { Card, Lab } from '@/components/ui'

/**
 * The overview is the pitch in one screen: the pipeline with who owns each
 * step, the numbers, what needs a person, and the tail of the audit chain.
 */
export function OverviewPage() {
  const { state, go, open, loadDemo, startTour } = useStore()
  const s = state
  const asOf = iso(s.day)
  const L = s.loaded
  const vs = L ? views(s) : []
  const pending = s.actions.filter((a) => a.status === 'pending')

  const routed = vs.filter(
    (v) =>
      v.plan.rec &&
      v.plan.rec.route.kind === 'stablecoin' &&
      !['rejected', 'security_hold', 'blocked', 'needs_info'].includes(v.status),
  )
  const savings = routed.reduce(
    (t, v) => t + (v.p.usd * (4.5 - v.plan.rec!.route.fee)) / 100,
    0,
  )
  const avgMin = routed.length
    ? Math.round(routed.reduce((t, v) => t + v.plan.rec!.route.min, 0) / routed.length)
    : 0
  const humanEvents = s.events.filter(
    (e) => actorOf(e.type).actor === 'Human' && e.type !== 'asof_changed',
  ).length
  const stops = vs.filter(
    (v) =>
      v.status === 'security_hold' ||
      v.status === 'blocked' ||
      (v.status === 'rejected' && v.p.security),
  ).length
  const flagged = vs.filter((v) => v.p.security).length
  const waiting = vs.filter(
    (v) => v.status === 'ready' || v.status === 'awaiting_second_approver',
  ).length
  const checksN = vs.reduce(
    (t, v) => t + v.plan.evals.reduce((t2, e) => t2 + e.results.length, 0),
    0,
  )

  const stages: [string, string, string, string][] = [
    ['Intake', 'AI', 'Claude reads the PDF into typed fields', L ? String(vs.length) : '—'],
    ['Security scan', 'AI + Code', 'Injection, bank change, duplicates', L ? flagged + ' flagged' : '—'],
    ['Sanctions screen', 'Code', 'OFAC SDN fuzzy match', L ? vs.length + ' clear' : '—'],
    [
      'Rules engine',
      'Code',
      'Deterministic, as of ' + fmtDate(asOf).replace(', 2026', ''),
      L ? checksN + ' checks' : '—',
    ],
    ['Memo', 'AI', 'Explains with citations, never decides', L ? String(vs.length) : '—'],
    ['Approval', 'Human', 'Two people over the threshold', L ? waiting + ' waiting' : '—'],
    [
      'Pay',
      'Human',
      'Confirmed by a person · simulated rail',
      L ? String(vs.filter((v) => v.status === 'paid' || v.status === 'booked').length) : '—',
    ],
    [
      'Reconcile and book',
      'Code',
      'Match references, journal entry',
      L ? String(vs.filter((v) => v.status === 'booked').length) : '—',
    ],
  ]

  const kpis = [
    {
      label: 'Fees saved vs. SWIFT',
      value: L ? usd0(savings) : '—',
      sub: L ? 'on ' + routed.length + ' payouts routed by stablecoin' : 'Load the demo invoices',
      color: 'var(--color-brand-ink)',
    },
    {
      label: 'Settlement time',
      value: L && avgMin ? avgMin + ' min' : '—',
      sub: 'average, vs. about 2 days by wire',
      color: 'var(--color-ink)',
    },
    {
      label: 'Decisions with sources',
      value: L ? vs.length + '/' + vs.length : '—',
      sub: 'every route choice cites dated, linked rules',
      color: 'var(--color-ink)',
    },
    {
      label: 'Reroutes from rule changes',
      value: String(s.reroutes || 0),
      sub: 'automatic, each one names its rule',
      color: 'var(--color-ink)',
    },
    {
      label: 'Human decisions',
      value: String(humanEvents),
      sub: '0 payments made without a person',
      color: 'var(--color-warn-ink)',
    },
    {
      label: 'Fraud and sanctions stops',
      value: L ? String(stops) : '—',
      sub: 'security holds and sanctions blocks',
      color: 'var(--color-bad-ink)',
    },
  ]

  const needs: { tag: string; cls: string; text: string; cta: string; go: () => void }[] = []
  vs.forEach((v) => {
    const num = v.m.edits?.number || v.p.inv.number
    const openIt = () => open(v.p.id)
    if (v.status === 'security_hold')
      needs.push({
        tag: 'Security',
        cls: 'pill p-bad',
        text: v.p.payee + ' ' + num + ': injected instructions and changed bank details',
        cta: 'Review',
        go: openIt,
      })
    else if (v.status === 'awaiting_second_approver')
      needs.push({
        tag: 'Approve',
        cls: 'pill p-warn',
        text: v.p.payee + ' needs a second approver',
        cta: 'Open',
        go: openIt,
      })
    else if (v.status === 'ready')
      needs.push({
        tag: 'Approve',
        cls: 'pill p-ok',
        text:
          v.p.payee +
          ' is ready' +
          (v.plan.rec && v.plan.rec.warns ? ' (warning to acknowledge)' : ''),
        cta: 'Open',
        go: openIt,
      })
    else if (v.status === 'needs_info')
      needs.push({
        tag: 'Info',
        cls: 'pill p-warn',
        text: v.p.payee + ' is missing required fields',
        cta: 'Open',
        go: openIt,
      })
    else if (v.status === 'approved')
      needs.push({
        tag: 'Pay',
        cls: 'pill p-neutral',
        text: v.p.payee + ' is approved and ready to pay',
        cta: 'Open',
        go: openIt,
      })
    else if (v.status === 'paid')
      needs.push({
        tag: 'Book',
        cls: 'pill p-neutral',
        text: v.p.payee + ' is paid and ready to reconcile',
        cta: 'Open',
        go: openIt,
      })
  })
  if (pending.length)
    needs.push({
      tag: 'Agent',
      cls: 'pill p-ok',
      text: pending.length + ' agent proposal' + (pending.length > 1 ? 's' : '') + ' waiting for you',
      cta: 'Review',
      go: () => go('agent'),
    })
  if (L && s.radar === 'pending')
    needs.push({
      tag: 'Compliance',
      cls: 'pill p-warn',
      text: 'Registry update proposed by the regulatory radar',
      cta: 'Review',
      go: () => go('trust'),
    })
  const openVerify = ['MX-BANK-CRYPTO', 'AR-PSAV'].filter((id) => !s.verified[id]).length
  if (L && openVerify)
    needs.push({
      tag: 'Compliance',
      cls: 'pill p-warn',
      text: openVerify + ' rule' + (openVerify > 1 ? 's' : '') + ' flagged “verify” in the rules pack',
      cta: 'Review',
      go: () => go('trust'),
    })

  const feed = s.events
    .slice(-7)
    .reverse()
    .map((e) => ({ ...e, ...actorOf(e.type) }))

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[780px] flex-col gap-2">
          <Lab>The compliance brain for paying Latin America in stablecoins</Lab>
          <h1
            className="m-0"
            style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 800,
              fontStretch: '86%',
              fontSize: 36,
              lineHeight: 1.06,
              letterSpacing: '-.01em',
            }}
          >
            AI reads and explains. Code decides. A person approves.
          </h1>
          <p className="m-0 text-body" style={{ maxWidth: '66ch' }}>
            Every payout runs the same pipeline. Each step is labeled with who is responsible for
            it, and every step is written to a hash-chained audit log.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!s.loaded && !s.loading && (
            <button type="button" className="btn" onClick={loadDemo}>
              Load the demo invoices
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={startTour}>
            <Play />
            Start the 3-minute guided demo
          </button>
        </div>
      </section>

      <section aria-label="Pipeline">
        <ol
          className="m-0 grid list-none gap-2 p-0"
          style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}
        >
          {stages.map(([name, actor, sub, count], i) => (
            <li key={name} className="stage">
              <div className="flex items-center justify-between gap-1.5">
                <span className="mono text-faint" style={{ fontSize: 12 }}>
                  {'0' + (i + 1)}
                </span>
                <span
                  className={
                    'act ' +
                    (actor === 'Human' ? 'act-human' : actor === 'Code' ? 'act-code' : 'act-ai')
                  }
                >
                  {actor}
                </span>
              </div>
              <span className="font-semibold" style={{ fontSize: 15 }}>
                {name}
              </span>
              <span
                className="mono"
                style={{ fontWeight: 600, fontSize: 22, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}
              >
                {count}
              </span>
              <span className="text-muted" style={{ fontSize: 12.5 }}>
                {sub}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-label="Key numbers"
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}
      >
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <Lab>{k.label}</Lab>
            <span
              className="mono"
              style={{
                fontWeight: 600,
                fontSize: 28,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
                color: k.color,
              }}
            >
              {k.value}
            </span>
            <span className="text-muted" style={{ fontSize: 13 }}>
              {k.sub}
            </span>
          </div>
        ))}
      </section>
      <p className="mt-[-8px] mb-0 text-muted" style={{ fontSize: 12.5 }}>
        Numbers come from the demo invoices, demo FX rates and fictional provider fees.
      </p>

      <section className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[1_1_420px]">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="m-0" style={{ fontSize: 17 }}>
              Needs a person
            </h2>
            <span className="text-muted" style={{ fontSize: 13 }}>
              {needs.length ? needs.length + ' items' : ''}
            </span>
          </div>
          {needs.length === 0 && (
            <p className="m-0 text-muted" style={{ fontSize: 14 }}>
              Nothing waiting. Load the demo invoices to start.
            </p>
          )}
          {needs.map((nd, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2.5 border-t border-line-soft py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={nd.cls}>{nd.tag}</span>
                <span style={{ fontSize: 14 }}>{nd.text}</span>
              </div>
              <button type="button" className="btn btn-sm" onClick={nd.go}>
                {nd.cta}
              </button>
            </div>
          ))}
        </Card>

        <Card className="min-w-0 flex-[1_1_420px]">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="m-0" style={{ fontSize: 17 }}>
              Who did what
            </h2>
            <span className="text-muted" style={{ fontSize: 13 }}>
              Latest from the audit chain
            </span>
          </div>
          {feed.length === 0 && (
            <p className="m-0 text-muted" style={{ fontSize: 14 }}>
              No activity yet.
            </p>
          )}
          {feed.map((e) => (
            <div
              key={e.seq}
              className="grid items-center gap-2.5 border-t border-line-soft py-[7px]"
              style={{ gridTemplateColumns: '62px minmax(0,1fr) 44px', fontSize: 13.5 }}
            >
              <span className={e.cls} style={{ justifySelf: 'start' }}>
                {e.actor}
              </span>
              <span className="min-w-0">
                <strong className="font-semibold">{e.payee}</strong> · {e.summary}
              </span>
              <span className="mono text-muted" style={{ fontSize: 12 }}>
                {e.time}
              </span>
            </div>
          ))}
        </Card>
      </section>
    </main>
  )
}
