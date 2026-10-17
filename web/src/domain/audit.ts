import { payoutById } from './data'
import { h64 } from './format'
import type { AuditDraft, AuditEvent } from './types'

/**
 * Append-only, hash-chained audit log. Each event's hash covers the previous
 * hash plus a canonical payload, so editing any past event breaks verification
 * from that point on.
 *
 * The shipped backend chains with keyed HMAC-SHA-512 and signs checkpoints with
 * Ed25519 (spec §12). This preview chains with the same shape over a plain hash
 * so the "simulate tampering" demo works client-side.
 */

const GENESIS = '0'.repeat(64)

export function append(events: AuditEvent[], items: AuditDraft[]): AuditEvent[] {
  const out = events.slice()
  items.forEach((it) => {
    const seq = out.length + 1
    const prev = out.length ? out[out.length - 1].hash : GENESIS
    const t = 12 + seq
    const time =
      String(9 + Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')
    const payload = JSON.stringify({
      seq,
      type: it.type,
      payoutId: it.pid || null,
      summary: it.summary,
      time,
    })
    out.push({
      seq,
      type: it.type,
      pid: it.pid ?? null,
      payee: it.payee ?? '',
      summary: it.summary,
      time,
      payload,
      prev,
      hash: h64(prev + payload),
    })
  })
  return out
}

/** Appends events already scoped to one payout. */
export function appendFor(
  events: AuditEvent[],
  id: string,
  items: Omit<AuditDraft, 'pid' | 'payee'>[],
): AuditEvent[] {
  const p = payoutById(id)
  return append(
    events,
    items.map((e) => ({ ...e, pid: id, payee: p.payee })),
  )
}

export function verify(
  events: AuditEvent[],
  tamperSeq: number | null,
): { ok: boolean; brokenAt?: number } {
  for (const e of events) {
    const payload =
      e.seq === tamperSeq
        ? e.payload.replace('"summary":"', '"summary":"EDITED ')
        : e.payload
    if (h64(e.prev + payload) !== e.hash) return { ok: false, brokenAt: e.seq }
  }
  return { ok: true }
}

export type Actor = 'AI' | 'Code' | 'Human'

/** Who was responsible for an event — the claim the whole product rests on. */
export function actorOf(type: string): { actor: Actor; cls: string } {
  if (['extracted', 'memo', 'agent_proposed', 'security_flagged'].includes(type))
    return { actor: 'AI', cls: 'act act-ai' }
  if (['screened', 'planned', 'asof_changed', 'reconciled'].includes(type))
    return { actor: 'Code', cls: 'act act-code' }
  return { actor: 'Human', cls: 'act act-human' }
}
