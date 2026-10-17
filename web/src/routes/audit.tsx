import { actorOf, verify } from '@/domain/audit'
import { useStore } from '@/state/store'
import { ShieldCheck, XCircle } from '@/components/icons'
import { Card, Chip, Lab } from '@/components/ui'

/**
 * The audit log. Append-only and hash-chained: "simulate tampering" rewrites
 * one past event's payload, and verification fails from that point on.
 */
export function AuditPage() {
  const { state: s, toggleTamper } = useStore()
  const chk = verify(s.events, s.tamperSeq)
  const tamperTarget = Math.min(3, s.events.length)
  const events = s.events
    .slice()
    .reverse()
    .map((e) => ({ ...e, ...actorOf(e.type) }))

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1
            className="m-0"
            style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 750,
              fontStretch: '90%',
              fontSize: 26,
            }}
          >
            Audit log
          </h1>
          <span className={'pill ' + (chk.ok ? 'p-ok' : 'p-bad')}>
            {chk.ok ? <ShieldCheck /> : <XCircle />}
            {chk.ok
              ? 'Chain verified · ' + s.events.length + ' events'
              : 'Chain broken at #' + chk.brokenAt}
          </span>
        </div>
        <button
          type="button"
          className="btn"
          disabled={s.events.length === 0}
          onClick={() => toggleTamper(tamperTarget)}
        >
          {s.tamperSeq ? 'Undo tamper' : 'Simulate tampering with #' + (tamperTarget || 3)}
        </button>
      </div>

      <p className="m-0 text-muted" style={{ fontSize: 14, maxWidth: '90ch' }}>
        Append-only and hash-chained. Each event’s hash covers the previous hash plus its payload,
        so editing any past event breaks verification from that point on. Agent steps, engine steps
        and human decisions are tagged separately.
      </p>

      {s.events.length === 0 && (
        <Card>
          <p className="m-0 text-muted" style={{ fontSize: 14 }}>
            No events yet. Load the demo invoices to start the chain.
          </p>
        </Card>
      )}

      {s.events.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-paper">
          <div role="table" aria-label="Audit events" style={{ minWidth: 900 }}>
            <div role="row" className="ev bg-paper-head">
              <span role="columnheader">
                <Lab>#</Lab>
              </span>
              <span role="columnheader">
                <Lab>Actor</Lab>
              </span>
              <span role="columnheader">
                <Lab>Event</Lab>
              </span>
              <span role="columnheader">
                <Lab>Detail</Lab>
              </span>
              <span role="columnheader">
                <Lab>Hash</Lab>
              </span>
              <span role="columnheader">
                <Lab>Time</Lab>
              </span>
            </div>
            {events.map((e) => (
              <div key={e.seq} role="row" className="ev">
                <span role="cell" className="mono">
                  {e.seq}
                </span>
                <span role="cell">
                  <span className={e.cls}>{e.actor}</span>
                </span>
                <span role="cell">
                  <Chip>{e.type}</Chip>
                </span>
                <span role="cell">
                  <strong className="font-semibold">{e.payee}</strong> · {e.summary}
                </span>
                <span role="cell" className="mono" style={{ fontSize: 12.5 }}>
                  {e.hash.slice(0, 12) + '…'}
                </span>
                <span role="cell" className="mono" style={{ fontSize: 12.5 }}>
                  {e.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
