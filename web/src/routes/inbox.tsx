import { PAYOUTS } from '@/domain/data'
import { eff, views } from '@/domain/engine'
import { local, objWord, usd } from '@/domain/format'
import { useStore } from '@/state/store'
import { DetailPane } from '@/components/DetailPane'
import { FileUp } from '@/components/icons'
import { Cc, Chip, StatusPill } from '@/components/ui'

export function InboxPage() {
  const store = useStore()
  const { state, open, loadDemo, reset, addSuspicious, go } = store
  const s = state
  const vs = s.loaded ? views(s) : []
  const sel = vs.find((v) => v.p.id === s.selected)
  const pending = s.actions.filter((a) => a.status === 'pending')

  return (
    <main className="mx-auto flex max-w-[1440px] flex-wrap items-start gap-5 p-5">
      <section
        aria-labelledby="inbox-h"
        className="flex min-w-0 flex-[999_1_620px] flex-col gap-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-baseline gap-2.5">
            <h1
              id="inbox-h"
              className="m-0"
              style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 750,
                fontStretch: '90%',
                fontSize: 26,
              }}
            >
              Payouts inbox
            </h1>
            <span className="text-muted" style={{ fontSize: 14 }}>
              {s.loaded ? vs.length + ' payouts' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.loaded && !s.sus && (
              <button type="button" className="btn btn-danger" onClick={addSuspicious}>
                Simulate a suspicious invoice
              </button>
            )}
            {pending.length > 0 && (
              <button type="button" className="btn" onClick={() => go('agent')}>
                {pending.length + ' waiting in the agent queue'}
              </button>
            )}
            {s.loaded && (
              <button type="button" className="btn" onClick={reset}>
                Reset demo
              </button>
            )}
          </div>
        </div>

        {!s.loaded && !s.loading && (
          <div
            className="flex flex-col items-center gap-3.5 rounded-[10px] bg-paper px-6 py-10 text-center"
            style={{ border: '2px dashed var(--color-line-input)' }}
          >
            <FileUp color="var(--color-brand)" />
            <p className="m-0 font-semibold" style={{ fontSize: 18 }}>
              Drop an invoice or load the demo set
            </p>
            <p className="m-0 text-muted" style={{ maxWidth: '52ch' }}>
              In the build, a dropped PDF goes to POST /api/invoices and Claude extracts the
              fields. This preview runs on the seeded invoices.
            </p>
            <button type="button" className="btn btn-primary" onClick={loadDemo}>
              Load the 4 demo invoices
            </button>
          </div>
        )}

        {s.loading && (
          <div
            className="overflow-hidden rounded-lg border border-line bg-paper"
            aria-busy="true"
          >
            {PAYOUTS.filter((p) => !p.hidden).map((p) => (
              <div
                key={p.id}
                className="grid items-center gap-4 border-b border-line-soft p-4"
                style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)' }}
              >
                <div className="flex flex-col gap-1.5">
                  <span className="mono" style={{ fontSize: 13 }}>
                    {p.file}
                  </span>
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    Reading invoice · scanning for injected instructions…
                  </span>
                </div>
                <div className="skel" />
                <div className="skel" />
              </div>
            ))}
          </div>
        )}

        {s.loaded && (
          <>
            <div className="overflow-x-auto rounded-lg border border-line bg-paper">
              <div role="table" aria-label="Payouts" style={{ minWidth: 820 }}>
                <div role="row" className="row bg-paper-head" style={{ padding: '10px 16px' }}>
                  <span role="columnheader" className="lab">
                    Payee
                  </span>
                  <span role="columnheader" className="lab">
                    Amount
                  </span>
                  <span role="columnheader" className="lab">
                    Route
                  </span>
                  <span role="columnheader" className="lab">
                    Status
                  </span>
                  <span role="columnheader" className="lab">
                    Warnings
                  </span>
                  <span role="columnheader" className="lab">
                    <span className="sr-only">Open</span>
                  </span>
                </div>

                {vs.map((v) => {
                  const { p, plan, status } = v
                  const rec = plan.rec
                  const invNo = eff(p, v.m).inv.number
                  return (
                    <div
                      key={p.id}
                      role="row"
                      className={
                        'row' +
                        (s.selected === p.id ? ' row-sel' : '') +
                        (s.flashId === p.id ? ' flash' : '')
                      }
                    >
                      <div role="cell" className="flex min-w-0 items-center gap-2.5">
                        <Cc code={p.c} label={p.country} />
                        <div className="flex min-w-0 flex-col">
                          <button
                            type="button"
                            onClick={() => open(p.id)}
                            className="border-0 bg-none p-0 text-left font-semibold text-ink"
                            style={{ background: 'none', fontSize: 15 }}
                          >
                            {p.payee}
                          </button>
                          <span className="text-muted" style={{ fontSize: 12.5 }}>
                            {p.city} · {invNo}
                          </span>
                        </div>
                      </div>

                      <div role="cell" className="flex flex-col">
                        <span
                          className="font-medium"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {local(p)}
                        </span>
                        {p.cur !== 'USD' && (
                          <span
                            className="text-muted"
                            style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}
                          >
                            {'≈ ' + usd(p.usd)}
                          </span>
                        )}
                      </div>

                      <div role="cell" className="flex flex-col items-start gap-1">
                        {rec && <Chip>{rec.route.label}</Chip>}
                        {plan.overridden && (
                          <span
                            className="font-medium"
                            style={{ fontSize: 12, color: 'var(--color-warn-ink)' }}
                          >
                            Human override
                          </span>
                        )}
                        {!rec && (
                          <span style={{ fontSize: 13.5, color: 'var(--color-bad-ink)' }}>
                            No compliant route
                          </span>
                        )}
                      </div>

                      <div role="cell">
                        <StatusPill status={status} />
                      </div>

                      <div role="cell">
                        {rec && rec.warns ? (
                          <span className="pill p-warn">
                            {rec.warns + (rec.warns === 1 ? ' warning' : ' warnings')}
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </div>

                      <div role="cell" className="text-right">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => open(p.id)}
                          aria-label={'Open ' + p.payee + ' ' + p.inv.number}
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <p className="m-0 text-muted" style={{ fontSize: 13 }}>
              {'Move the as-of date: the rules engine re-checks every open payout and picks the best compliant route for that day (preference: ' +
                objWord(s.settings.objective) +
                '). Try Sep 30 → Oct 1 → Oct 30 with Estúdio Paulista open.'}
            </p>
          </>
        )}
      </section>

      {sel && <DetailPane v={sel} />}
    </main>
  )
}
