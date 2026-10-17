import { eff, type EngineState } from './engine'
import { fmtDate, local, objWord, usd } from './format'
import type { PayoutView } from './types'

export interface Memo {
  summary: string
  rationale: string
  warnings: string[]
  checks: string[]
  cited: { id: string; href: string }[]
  guard: string
}

/**
 * The memo the LLM writes in the shipped build, and the deterministic template
 * that backs it up. Either way it only *explains* the plan: the citation guard
 * below is what keeps a memo from inventing a rule or moving a decision.
 */
export function memoFor(v: PayoutView, s: EngineState): Memo {
  const { p, m, plan } = v
  const dateLabel = fmtDate(plan.iso)
  const rec = plan.rec
  const st = m.lockedSettings || s.settings
  const wire = plan.evals.find((e) => e.route.kind === 'wire')!
  const pe = eff(p, m)

  let summary: string
  let rationale: string

  if (rec) {
    summary =
      'Pay ' +
      p.payee +
      ' ' +
      local(p) +
      (p.cur === 'USD' ? '' : ' (' + usd(p.usd) + ')') +
      ' for ' +
      pe.inv.desc.charAt(0).toLowerCase() +
      pe.inv.desc.slice(1) +
      '.'
    if (plan.overridden) {
      rationale =
        'A person chose ' +
        rec.route.label +
        ' over the engine’s pick (' +
        plan.engine!.route.label +
        '): “' +
        m.override!.reason +
        '”. The chosen route passes every active rule as of ' +
        dateLabel +
        '.'
    } else {
      rationale =
        rec.route.label +
        ' is the ' +
        objWord(st.objective) +
        ' route that passes every active rule as of ' +
        dateLabel +
        '.'
      plan.evals
        .filter((e) => e.route.fee < rec.route.fee && !e.compliant && e.route.off)
        .forEach((e) => {
          const b = e.results.find((x) => x.o === 'block' || x.o === 'fields')!
          rationale +=
            ' ' +
            e.route.off!.name +
            ' (' +
            e.route.fee.toFixed(2) +
            '%) is cheaper but blocked by ' +
            b.rule.id +
            '.'
        })
    }
    if (rec.route.kind !== 'wire') {
      rationale +=
        ' Against a SWIFT wire it saves ' +
        usd((p.usd * (wire.route.fee - rec.route.fee)) / 100) +
        ' and about two days.'
    }
    if (p.security && !m.secCleared) {
      summary =
        'Hold: ' +
        summary.charAt(0).toLowerCase() +
        summary.slice(1) +
        ' The route is compliant, but the invoice failed security checks.'
    }
  } else if (plan.status === 'needs_info') {
    summary = 'Hold ' + p.payee + ' (' + local(p) + ') until the missing fields arrive.'
    rationale =
      'No route can be used: ' +
      plan.evals[0].results
        .filter((x) => x.o === 'fields')
        .map((x) => x.rule.id + ': ' + x.msg)
        .join(' ')
  } else {
    summary =
      'Do not pay ' +
      p.payee +
      ' (' +
      local(p) +
      '). Every route is blocked as of ' +
      dateLabel +
      '.'
    rationale =
      p.c === 'VE'
        ? 'VE-OFAC blocks the wire and any stablecoin route until a named general license is recorded and a person signs off.'
        : 'Every candidate route fails at least one active rule.'
  }

  const target = rec || plan.evals.find((e) => e.route.kind === 'wire')!
  const warnings = target.results
    .filter((x) => x.o === 'warn')
    .map((x) => x.rule.id + ': ' + x.msg)

  const checks: string[] = []
  if (p.security && !m.secCleared)
    checks.push(
      'Do not pay until the security hold is resolved: call the vendor on the number in the vendor master.',
    )
  if (p.c === 'BR') checks.push('Confirm the purpose code matches the vendor’s FX contract.')
  if (rec && rec.route.off && rec.route.off.type === 'vasp_pending')
    checks.push('Ponte Digital’s authorization ends Oct 29: confirm before paying after that date.')
  if (p.c === 'MX') checks.push('Second approver: confirm the CLABE against the vendor master file.')
  if (p.c === 'AR') checks.push('Confirm the contractor accepts settlement at the rate shown.')
  if (p.c === 'VE')
    checks.push(
      m.license
        ? 'Keep a copy of general license ' + m.license.number + ' with the payment file.'
        : 'Record a named OFAC general license, or decline the payment.',
    )
  if (!m.reviewed && !p.security)
    p.low.forEach((f) =>
      checks.push(
        'Re-check the ' + (f === 'bank' ? 'bank identifier' : f) + ': extraction confidence was low.',
      ),
    )

  const cited = target.results
    .filter((x) => x.o !== 'na' && x.o !== 'inactive')
    .map((x) => ({ id: x.rule.id, href: '#rule-' + x.rule.id }))
  const inPlan = cited.filter((c) => target.results.some((x) => x.rule.id === c.id)).length
  const guard =
    'Citation guard: ' +
    cited.length +
    ' cited rule' +
    (cited.length === 1 ? '' : 's') +
    ', ' +
    inPlan +
    ' found in the engine’s plan. The memo can’t add a rule or change the decision.'

  return { summary, rationale, warnings, checks, cited, guard }
}
