import { eff, views } from '@/domain/engine'
import { fmtDate, num } from '@/domain/format'
import { useStore } from '@/state/store'
import { Check } from '@/components/icons'
import { Card, Lab } from '@/components/ui'

/**
 * Booked journal entries: AP, fees, cash and the FX line, each matched to the
 * on-chain reference and the local rail reference.
 */
export function LedgerPage() {
  const { state: s, go } = useStore()
  const vs = s.loaded ? views(s) : []
  const journal = vs
    .filter((v) => v.m.journal)
    .map((v) => ({
      id: v.m.journal!.id,
      payee: v.p.payee,
      date: fmtDate(v.m.lockedIso || ''),
      route: v.m.journal!.route,
      lines: v.m.journal!.lines,
      match:
        'Invoice ' +
        eff(v.p, v.m).inv.number +
        ' ↔ ' +
        v.m.payment!.txHash.slice(0, 14) +
        '… ↔ ' +
        v.m.payment!.railName +
        ' ' +
        v.m.payment!.railRef.slice(0, 12) +
        '…',
    }))

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h1
          className="m-0"
          style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 750,
            fontStretch: '90%',
            fontSize: 26,
          }}
        >
          Ledger
        </h1>
        <a className="btn" href="#ledger-csv" title="Wired to GET /api/ledger.csv in the build">
          Export CSV
        </a>
      </div>

      {journal.length === 0 && (
        <Card>
          <p className="m-0 font-semibold" style={{ fontSize: 16 }}>
            Nothing booked yet
          </p>
          <p className="m-0 text-muted" style={{ fontSize: 14 }}>
            Approve, pay and reconcile a payout from the inbox or the agent’s queue. Its journal
            entry lands here.
          </p>
          <div>
            <button type="button" className="btn" onClick={() => go('inbox')}>
              Go to inbox
            </button>
          </div>
        </Card>
      )}

      {journal.map((je) => (
        <Card key={je.id}>
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold" style={{ fontSize: 16 }}>
                {je.payee}
              </span>
              <span className="mono text-muted" style={{ fontSize: 12.5 }}>
                {je.id + ' · ' + je.date + ' · ' + je.route}
              </span>
            </div>
            <span className="pill p-ok">
              <Check />
              Matched
            </span>
          </div>

          <div className="overflow-x-auto">
            <div role="table" aria-label="Journal lines" style={{ minWidth: 520 }}>
              <div
                role="row"
                className="grid gap-2.5 border-b border-line-soft pb-1.5"
                style={{ gridTemplateColumns: 'minmax(0,1fr) 130px 130px' }}
              >
                <span role="columnheader">
                  <Lab>Account</Lab>
                </span>
                <span role="columnheader" className="text-right">
                  <Lab>Debit (USD)</Lab>
                </span>
                <span role="columnheader" className="text-right">
                  <Lab>Credit (USD)</Lab>
                </span>
              </div>
              {je.lines.map((ln, i) => (
                <div
                  key={i}
                  role="row"
                  className="grid gap-2.5 border-b border-line-soft py-2"
                  style={{ gridTemplateColumns: 'minmax(0,1fr) 130px 130px', fontSize: 14 }}
                >
                  <span role="cell">{ln.acct}</span>
                  <span
                    role="cell"
                    className="mono text-right"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {ln.dr == null ? '' : num(ln.dr)}
                  </span>
                  <span
                    role="cell"
                    className="mono text-right"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {ln.cr == null ? '' : num(ln.cr)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <span className="text-muted" style={{ fontSize: 13 }}>
            {je.match}
          </span>
        </Card>
      ))}
    </main>
  )
}
