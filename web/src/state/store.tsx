import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from '@tanstack/react-router'

import { append, appendFor } from '@/domain/audit'
import {
  loadSummaryMessage,
  respond,
  suspiciousMessage,
  welcomeMessage,
  type AgentActionDraft,
} from '@/domain/agent'
import { PAYOUTS, payoutById, visiblePayouts } from '@/domain/data'
import {
  approvedUsd,
  eff,
  fingerprint,
  mOf,
  need,
  plan,
  pv,
  rname,
} from '@/domain/engine'
import { fmtDate, h32, h64, iso, r2, usd0 } from '@/domain/format'
import type {
  AgentAction,
  AppState,
  AuditDraft,
  AuditEvent,
  Invoice,
  Journal,
  JournalLine,
  Mut,
  Offramp,
  Payment,
  Settings,
  ToastLine,
} from '@/domain/types'

/**
 * The single client-side store. Mirrors the approved prototype's state shape
 * one-to-one so the demo behaves identically, and keeps every mutation in one
 * place for when the API lands: each action below maps to one endpoint
 * (POST /api/payouts/:id/approve, /pay, /reconcile, …).
 */

export const ACTOR = 'Maria Lopez'
export const COMPLIANCE = 'Daniel Ortiz'
export const APPROVERS = [ACTOR, COMPLIANCE]

export type ViewId =
  | 'overview'
  | 'inbox'
  | 'agent'
  | 'trust'
  | 'ledger'
  | 'audit'
  | 'customize'

export const VIEW_PATH: Record<ViewId, string> = {
  overview: '/',
  inbox: '/inbox',
  agent: '/agent',
  trust: '/trust',
  ledger: '/ledger',
  audit: '/audit',
  customize: '/customize',
}

export const initialState = (): AppState => ({
  loaded: false,
  loading: false,
  // Day 22 of the demo clock is Oct 17, 2026 — "today" for the pitch.
  day: 22,
  selected: null,
  mut: {},
  events: [],
  toast: null,
  flashId: null,
  tamperSeq: null,
  paying: null,
  copied: null,
  settings: {
    threshold: 50000,
    cap: 150000,
    objective: 'cheapest',
    disabled: {},
    autonomy: 'prepare',
    requireAck: true,
  },
  chat: [welcomeMessage()],
  input: '',
  busy: null,
  actions: [],
  actionSeq: 0,
  overrideDraft: null,
  editDraft: null,
  secDraft: null,
  sus: false,
  registry: {},
  radar: 'pending',
  verified: {},
  replay: null,
  tour: null,
  reroutes: 0,
  autoRuns: 0,
})

export interface TourStep {
  title: string
  say: string
  time: string
  act: () => void
}

export interface Store {
  state: AppState
  go: (view: ViewId) => void
  open: (pid: string) => void
  closeDetail: () => void
  loadDemo: () => void
  reset: () => void
  setDay: (day: number) => void
  setSetting: <K extends keyof Settings>(key: K, val: Settings[K], summary: string) => void
  toggleProvider: (o: Offramp) => void
  approve: (pid: string, who: string) => void
  reject: (pid: string) => void
  setAck: (pid: string, val: boolean) => void
  pay: (pid: string) => void
  reconcile: (pid: string) => void
  copy: (text: string, key: string) => void
  replay: (pid: string) => void
  startOverride: (pid: string, routeId: string, label: string) => void
  setOverrideText: (text: string) => void
  confirmOverride: () => void
  cancelOverride: () => void
  clearOverride: (pid: string) => void
  startEdit: (pid: string, values: Invoice) => void
  setEditField: (key: keyof Invoice, value: string) => void
  saveEdit: (pid: string) => void
  cancelEdit: () => void
  setSecDraft: (pid: string, patch: { cb?: boolean; note?: string }) => void
  clearSecurityHold: (pid: string) => void
  rejectFraud: (pid: string) => void
  addSuspicious: () => void
  radarDecide: (ok: boolean) => void
  markVerified: (ruleId: string) => void
  toggleTamper: (target: number) => void
  closeToast: () => void
  setInput: (v: string) => void
  ask: (text: string, goAgent?: boolean) => void
  updAction: (id: string, patch: Partial<AgentAction>) => void
  execAction: (id: string, who: string) => void
  dismissAction: (id: string) => void
  tourSteps: () => TourStep[]
  startTour: () => void
  tourBack: () => void
  tourDo: () => void
  tourExit: () => void
}

const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore must be used inside <StoreProvider>')
  return s
}

/** Convenience: the live state object. */
export const useAppState = () => useStore().state

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  const ref = useRef(state)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const t = timers.current
    return () => t.forEach(clearTimeout)
  }, [])

  const store = useMemo<Store>(() => {
    const get = () => ref.current
    const set = (patch: Partial<AppState>) => {
      ref.current = { ...ref.current, ...patch }
      setState(ref.current)
    }
    const later = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms))
    }
    const go = (view: ViewId) => {
      void navigate({ to: VIEW_PATH[view] })
    }

    const withMut = (s: AppState, id: string, changes: Partial<Mut>) => {
      const mut = { ...s.mut }
      const prev: Mut = mut[id] ?? { approvals: [] }
      mut[id] = { ...prev, ...changes }
      return mut
    }

    // ---- reroute detection -------------------------------------------------
    /**
     * Compares the plan for every open payout before and after a change, so a
     * reroute can name the rule that caused it.
     */
    const diff = (oldS: AppState, newS: AppState, reason: string) => {
      const lines: ToastLine[] = []
      let flashId: string | null = null
      const oldIso = iso(oldS.day)
      const newIso = iso(newS.day)
      visiblePayouts(newS.sus).forEach((p) => {
        const mn = mOf(newS, p.id)
        if (mn.final || mn.lockedIso) return
        const a = plan(p, oldIso, oldS)
        const b = plan(p, newIso, newS)
        const ai = a.rec ? a.rec.route.id : null
        const bi = b.rec ? b.rec.route.id : null
        if (ai === bi) return
        let why = ''
        if (newIso > oldIso && a.rec) {
          const ev = b.evals.find((e) => e.route.id === ai)
          const hit = ev && ev.results.find((x) => x.o === 'block')
          if (hit) why = hit.rule.id + ' took effect'
        }
        if (!why && newIso < oldIso && b.rec) {
          const ev = a.evals.find((e) => e.route.id === bi)
          const hit = ev && ev.results.find((x) => x.o === 'block')
          if (hit) why = hit.rule.id + ' not yet in effect'
        }
        if (!why && b.overrideLost && !a.overrideLost) why = 'your override is no longer compliant'
        if (!why) why = reason || ''
        lines.push({
          head:
            'Rerouted ' +
            p.payee.split(' ').slice(0, 2).join(' ') +
            ' ' +
            eff(p, mn).inv.number.slice(-4) +
            ':',
          body: rname(a.rec) + ' → ' + rname(b.rec) + (why ? ' · ' + why : ''),
        })
        flashId = p.id
      })
      return { lines, flashId }
    }

    const toastLater = (key: number, fid: string | null) => {
      if (fid) later(() => get().flashId === fid && set({ flashId: null }), 1300)
      later(() => get().toast?.key === key && set({ toast: null }), 6000)
    }

    /** Applies a patch, detects reroutes it caused, and logs the events. */
    const change = (patch: Partial<AppState>, reason: string, evItems?: AuditDraft[]) => {
      const s = get()
      const ns = { ...s, ...patch }
      const d = diff(s, ns, reason)
      let events: AuditEvent[] = patch.events || s.events
      if (evItems && evItems.length) events = append(events, evItems)
      const out: Partial<AppState> = { ...patch, events }
      if (d.lines.length) {
        const key = Date.now()
        out.toast = { lines: d.lines, key }
        out.flashId = d.flashId
        out.reroutes = (s.reroutes || 0) + d.lines.length
        set(out)
        toastLater(key, d.flashId)
        return
      }
      set(out)
    }

    // ---- human actions -----------------------------------------------------
    const approveP = (s: AppState, id: string, who: string, via?: string) => {
      const p = payoutById(id)
      const m = mOf(s, id)
      const approvals = m.approvals.concat([
        { who, at: 'Oct 17, ' + (10 + m.approvals.length) + ':0' + (5 + m.approvals.length) },
      ])
      const n = need(p, s)
      const changes: Partial<Mut> = { approvals }
      if (approvals.length >= n) {
        // The plan freezes at approval, so an approved payout stops moving.
        changes.final = 'approved'
        changes.lockedIso = iso(s.day)
        changes.lockedSettings = s.settings
      }
      return {
        mut: withMut(s, id, changes),
        events: appendFor(s.events, id, [
          {
            type: 'approved',
            summary:
              'Approval ' + approvals.length + ' of ' + n + ' by ' + who + (via ? ' · ' + via : ''),
          },
        ]),
        reached: !!changes.final,
      }
    }

    const rejectP = (s: AppState, id: string, who: string, reason: string) => ({
      mut: withMut(s, id, { final: 'rejected', rejectedBy: who, rejectReason: reason }),
      events: appendFor(s.events, id, [{ type: 'rejected', summary: reason }]),
    })

    const ackP = (s: AppState, id: string, val: boolean): Partial<AppState> => {
      const out: Partial<AppState> = { mut: withMut(s, id, { ack: val }) }
      if (val) {
        out.events = appendFor(s.events, id, [
          { type: 'warnings_acknowledged', summary: 'Rule warnings acknowledged by ' + ACTOR },
        ])
      }
      return out
    }

    const reconcileP = (s: AppState, id: string) => {
      const p = payoutById(id)
      const v = pv(p, s)
      const r = v.plan.rec!.route
      const book = r2(p.amount / p.rate)
      const settle = r2(p.amount / p.settle)
      const fx = r2(book - settle)
      const fee = r2((book * r.fee) / 100)
      const lines: JournalLine[] = [
        { acct: 'Accounts Payable – ' + p.payee, dr: book, cr: null },
        { acct: 'Bank & network fees', dr: fee, cr: null },
      ]
      if (fx < 0) {
        lines.push({
          acct: 'FX loss (booking ' + p.rate + ' vs. settle ' + p.settle + ')',
          dr: -fx,
          cr: null,
        })
      }
      lines.push({
        acct: 'Cash – ' + (r.off ? r.off.asset + ' (' + r.off.net + ')' : 'Operating account'),
        dr: null,
        cr: r2(book - fx + fee),
      })
      if (fx >= 0) {
        lines.push({
          acct:
            fx > 0
              ? 'FX gain (booking ' + p.rate + ' vs. settle ' + p.settle + ')'
              : 'FX gain/loss (USD invoice)',
          dr: null,
          cr: fx,
        })
      }
      const journal: Journal = {
        id: 'JE-2026-10-' + h32('je' + id).slice(0, 4).toUpperCase(),
        lines,
        route: r.label,
      }
      return {
        mut: withMut(s, id, { final: 'booked', journal }),
        events: appendFor(s.events, id, [
          {
            type: 'reconciled',
            summary:
              'Matched invoice ↔ tx ↔ ' + v.m.payment!.railName + ' ref · ' + journal.id,
          },
        ]),
      }
    }

    const pay = (id: string) => {
      set({ paying: id })
      later(() => {
        const s = get()
        const p = payoutById(id)
        const v = pv(p, s)
        if (!v.plan.rec) {
          set({ paying: null })
          return
        }
        const r = v.plan.rec.route
        const H = h64('pay:' + id).toUpperCase()
        const railName = r.off ? r.off.rail : 'SWIFT'
        const railRef =
          railName === 'Pix'
            ? 'E' + H.slice(0, 31)
            : railName === 'SPEI'
              ? 'MBAN' + H.slice(0, 16)
              : railName === 'CVU'
                ? 'CVU-' + H.slice(0, 14)
                : 'MT103-' + H.slice(0, 12)
        const payment: Payment = {
          txHash: r.off
            ? '0x' + h64('tx:' + id)
            : 'UETR ' + H.slice(0, 8).toLowerCase() + '-' + H.slice(8, 12).toLowerCase(),
          offrampRef:
            (r.off ? r.off.name.split(' ')[0].toUpperCase() : 'WIRE') + '-' + h32(id).toUpperCase(),
          railRef,
          railName,
        }
        const changes: Partial<Mut> = { final: 'paid', payment }
        if (!v.m.lockedIso) {
          changes.lockedIso = iso(s.day)
          changes.lockedSettings = s.settings
        }
        set({
          paying: null,
          mut: withMut(s, id, changes),
          events: appendFor(s.events, id, [
            {
              type: 'paid',
              summary:
                'Sent via ' + rname(v.plan.rec) + ' (simulated) · confirmed by ' + ACTOR,
            },
          ]),
        })
      }, 900)
    }

    // ---- agent queue -------------------------------------------------------
    const addActions = (s: AppState, list: AgentActionDraft[]) => {
      let seq = s.actionSeq
      const acts = s.actions.slice()
      const added: AgentAction[] = []
      list.forEach((a) => {
        // One pending card per kind + payout.
        if (acts.some((x) => x.status === 'pending' && x.kind === a.kind && x.pid === a.pid)) return
        seq++
        const na: AgentAction = { id: 'A' + seq, status: 'pending', ...a }
        acts.push(na)
        added.push(na)
      })
      const events = append(
        s.events,
        added.map((a) => ({
          type: 'agent_proposed',
          pid: a.pid,
          payee: a.pid ? payoutById(a.pid).payee : 'Agent',
          summary: a.title + ' (awaiting a person)',
        })),
      )
      return { actions: acts, actionSeq: seq, events }
    }

    const doneList = (actions: AgentAction[], id: string, result: string) =>
      actions.map((x) => (x.id === id ? { ...x, status: 'done' as const, result } : x))

    const ask = (text: string, goAgent?: boolean) => {
      const s = get()
      if (s.busy) {
        if (goAgent) go('agent')
        return
      }
      const r = respond(text, s)
      set({
        chat: s.chat.concat([{ role: 'user', text }]),
        input: '',
        busy: { tools: r.msg.tools },
      })
      if (goAgent) go('agent')
      later(() => {
        const s2 = get()
        const patch: Partial<AppState> = { busy: null, chat: s2.chat.concat([r.msg]) }
        if (r.actions && r.actions.length) Object.assign(patch, addActions(s2, r.actions))
        if (r.auto) patch.autoRuns = (s2.autoRuns || 0) + 1
        set(patch)
        if (r.auto) api.setDay(r.auto.day)
      }, 1000)
    }

    const addSuspicious = () => {
      const s = get()
      if (!s.loaded) return
      if (s.sus) {
        set({ selected: 'br2' })
        go('inbox')
        return
      }
      const p = payoutById('br2')
      const events = append(s.events, [
        {
          type: 'extracted',
          pid: 'br2',
          payee: p.payee,
          summary: 'Fields extracted from ' + p.file,
        },
        {
          type: 'security_flagged',
          pid: 'br2',
          payee: p.payee,
          summary:
            'Injected instructions ignored · bank details differ from vendor master · possible duplicate of INV-2026-0412',
        },
      ])
      const s1 = { ...s, events, sus: true }
      const ap = addActions(s1, [
        {
          kind: 'fraud',
          pid: 'br2',
          risk: 'High',
          title: 'Reject INV-2026-0419 as suspected fraud',
          why: 'Rejects the invoice and logs the reason. Nothing is paid. Then call the vendor on the number in the vendor master.',
          cites: [],
        },
      ])
      const key = Date.now()
      set({
        sus: true,
        events: ap.events,
        actions: ap.actions,
        actionSeq: ap.actionSeq,
        chat: s.chat.concat([suspiciousMessage()]),
        selected: 'br2',
        toast: {
          lines: [
            {
              head: 'Security hold:',
              body:
                'Estúdio Paulista INV-2026-0419 · injected instructions ignored, bank details changed',
            },
          ],
          key,
        },
        flashId: 'br2',
      })
      go('inbox')
      toastLater(key, 'br2')
    }

    const api: Store = {
      state,
      go,
      open: (pid) => {
        set({ selected: pid })
        go('inbox')
      },
      closeDetail: () => set({ selected: null, overrideDraft: null, editDraft: null }),

      loadDemo: () => {
        const s0 = get()
        if (s0.loaded || s0.loading) return
        set({ loading: true })
        later(() => {
          const s = get()
          // Mexico arrives with one approval already on file.
          const mut: Record<string, Mut> = {
            mx: { approvals: [{ who: ACTOR, at: 'Oct 17, 09:42' }] },
          }
          const ns = { ...s, mut }
          const asOf = iso(s.day)
          const items: AuditDraft[] = []
          PAYOUTS.filter((p) => !p.hidden).forEach((p) => {
            const pl = plan(p, asOf, ns)
            items.push({
              type: 'extracted',
              pid: p.id,
              payee: p.payee,
              summary: 'Fields extracted from ' + p.file + '; injection scan clean',
            })
            items.push({
              type: 'screened',
              pid: p.id,
              payee: p.payee,
              summary: 'OFAC SDN: clear',
            })
            items.push({
              type: 'planned',
              pid: p.id,
              payee: p.payee,
              summary: pl.rec
                ? 'Route ' + pl.rec.route.label
                : 'No compliant route (' + p.c + ' rules)',
            })
            items.push({
              type: 'memo',
              pid: p.id,
              payee: p.payee,
              summary: 'Memo drafted; citation guard passed',
            })
          })
          items.push({
            type: 'approved',
            pid: 'mx',
            payee: 'Autopartes del Norte S.A. de C.V.',
            summary: 'Approval 1 of 2 by ' + ACTOR,
          })
          set({
            loading: false,
            loaded: true,
            mut,
            events: append(s.events, items),
            chat: s.chat.concat([loadSummaryMessage(asOf)]),
          })
        }, 1400)
      },

      reset: () => {
        timers.current.forEach(clearTimeout)
        timers.current = []
        set(initialState())
      },

      setDay: (day) => {
        const s = get()
        if (day === s.day) return
        if (!s.loaded) {
          set({ day })
          return
        }
        // Collapse a run of slider moves into one audit event.
        let events = s.events
        if (events.length && events[events.length - 1].type === 'asof_changed') {
          events = events.slice(0, -1)
        }
        change({ day, events }, '', [
          {
            type: 'asof_changed',
            pid: null,
            payee: 'Demo clock',
            summary:
              'As-of moved to ' + fmtDate(iso(day)) + '; all open payouts re-planned',
          },
        ])
      },

      setSetting: (key, val, summary) => {
        const s = get()
        if (s.settings[key] === val) return
        const settings = { ...s.settings, [key]: val }
        change({ settings }, 'preference changed', [
          {
            type: 'settings_changed',
            pid: null,
            payee: 'Settings',
            summary: summary + ' (by ' + ACTOR + ')',
          },
        ])
      },

      toggleProvider: (o) => {
        const s = get()
        const disabled = { ...s.settings.disabled }
        disabled[o.id] = !disabled[o.id]
        const settings = { ...s.settings, disabled }
        change({ settings }, disabled[o.id] ? o.name + ' disabled' : o.name + ' enabled', [
          {
            type: 'settings_changed',
            pid: null,
            payee: 'Settings',
            summary:
              o.name + (disabled[o.id] ? ' disabled' : ' enabled') + ' as an off-ramp (by ' + ACTOR + ')',
          },
        ])
      },

      approve: (pid, who) => {
        const r = approveP(get(), pid, who)
        set({ mut: r.mut, events: r.events })
      },

      reject: (pid) => set(rejectP(get(), pid, ACTOR, 'Rejected by ' + ACTOR)),

      setAck: (pid, val) => set(ackP(get(), pid, val)),

      pay,

      reconcile: (pid) => set(reconcileP(get(), pid)),

      copy: (text, key) => {
        try {
          void navigator.clipboard?.writeText(text)
        } catch {
          /* clipboard is unavailable in some embeds; the value stays visible */
        }
        set({ copied: key })
        later(() => get().copied === key && set({ copied: null }), 1500)
      },

      replay: (pid) => {
        const s = get()
        const p = payoutById(pid)
        const v = pv(p, s)
        const fp = fingerprint(v.plan)
        const ctx = v.m.lockedSettings ? { ...s, settings: v.m.lockedSettings } : s
        const t0 = performance.now()
        let same = 0
        for (let i = 0; i < 100; i++) {
          if (fingerprint(plan(p, v.plan.iso, ctx)) === fp) same++
        }
        const ms = performance.now() - t0
        set({
          replay: { pid, fp, text: same + '/100 identical · ' + ms.toFixed(1) + ' ms' },
          events: appendFor(s.events, pid, [
            {
              type: 'decision_replayed',
              summary: 'Plan recomputed 100×: ' + same + '/100 identical (' + fp + ')',
            },
          ]),
        })
      },

      startOverride: (pid, routeId, label) =>
        set({ overrideDraft: { pid, routeId, label, text: '' } }),
      setOverrideText: (text) => {
        const od = get().overrideDraft
        if (od) set({ overrideDraft: { ...od, text } })
      },
      cancelOverride: () => set({ overrideDraft: null }),
      confirmOverride: () => {
        const s = get()
        const d = s.overrideDraft
        if (!d) return
        change(
          {
            mut: withMut(s, d.pid, {
              override: { routeId: d.routeId, reason: d.text.trim(), by: ACTOR },
              ack: false,
            }),
            overrideDraft: null,
          },
          'human override',
          [
            {
              type: 'route_overridden',
              pid: d.pid,
              payee: payoutById(d.pid).payee,
              summary: 'Route set to ' + d.label + ' by ' + ACTOR + ': “' + d.text.trim() + '”',
            },
          ],
        )
      },
      clearOverride: (pid) => {
        const s = get()
        const mm = { ...mOf(s, pid) }
        delete mm.override
        change({ mut: { ...s.mut, [pid]: mm } }, 'override removed', [
          {
            type: 'override_removed',
            pid,
            payee: payoutById(pid).payee,
            summary: 'Back to the engine’s pick · by ' + ACTOR,
          },
        ])
      },

      startEdit: (pid, values) => set({ editDraft: { pid, values } }),
      setEditField: (key, value) => {
        const ed = get().editDraft
        if (ed) set({ editDraft: { ...ed, values: { ...ed.values, [key]: value } } })
      },
      cancelEdit: () => set({ editDraft: null }),
      saveEdit: (pid) => {
        const s = get()
        if (!s.editDraft) return
        const p = payoutById(pid)
        const pe = eff(p, mOf(s, pid))
        const vals: Invoice = { ...s.editDraft.values }
        ;(Object.keys(vals) as (keyof Invoice)[]).forEach((k) => {
          const v = vals[k]
          if (typeof v === 'string') (vals[k] as string) = v.trim()
        })
        if (!vals.purposeCode) vals.purposeCode = null
        const labels: Record<keyof Invoice, string> = {
          number: 'invoice no.',
          taxId: 'payee tax id',
          bank: 'bank identifier',
          due: 'due date',
          purposeCode: 'purpose code',
          desc: 'description',
        }
        const changed = (Object.keys(labels) as (keyof Invoice)[])
          .filter((k) => (vals[k] || null) !== (pe.inv[k] || null))
          .map((k) => labels[k])
        change(
          { mut: withMut(s, pid, { edits: vals, reviewed: true }), editDraft: null },
          'fields edited',
          [
            {
              type: 'edited',
              pid,
              payee: p.payee,
              summary:
                (changed.length ? 'Changed ' + changed.join(', ') : 'Fields reviewed, no changes') +
                ' · by ' +
                ACTOR +
                ' · re-planned',
            },
          ],
        )
      },

      setSecDraft: (pid, patch) => {
        const cur = get().secDraft
        const base = cur && cur.pid === pid ? cur : { pid, cb: false, note: '' }
        set({ secDraft: { ...base, ...patch } })
      },
      clearSecurityHold: (pid) => {
        const s = get()
        const note = (s.secDraft?.note || '').trim()
        set({
          secDraft: null,
          mut: withMut(s, pid, { secCleared: { by: ACTOR, note } }),
          events: appendFor(s.events, pid, [
            {
              type: 'security_cleared',
              summary:
                'Hold cleared by ' + ACTOR + ' after callback to number on file: “' + note + '”',
            },
          ]),
        })
      },
      rejectFraud: (pid) =>
        set(rejectP(get(), pid, ACTOR, 'Rejected as suspected fraud by ' + ACTOR)),

      addSuspicious,

      radarDecide: (ok) => {
        const s = get()
        if (ok) {
          change(
            { registry: { ...s.registry, ponte: true }, radar: 'approved' },
            'registry update approved',
            [
              {
                type: 'registry_updated',
                pid: null,
                payee: 'Compliance',
                summary:
                  'Ponte Digital → authorized VASP · proposed by agent, approved by ' + COMPLIANCE,
              },
            ],
          )
        } else {
          set({
            radar: 'rejected',
            events: append(s.events, [
              {
                type: 'registry_rejected',
                pid: null,
                payee: 'Compliance',
                summary: 'Ponte Digital registry update rejected by ' + COMPLIANCE,
              },
            ]),
          })
        }
      },

      markVerified: (ruleId) => {
        const s = get()
        set({
          verified: { ...s.verified, [ruleId]: true },
          events: append(s.events, [
            {
              type: 'rule_verified',
              pid: null,
              payee: 'Compliance',
              summary: ruleId + ' source reviewed by ' + COMPLIANCE,
            },
          ]),
        })
      },

      toggleTamper: (target) => set({ tamperSeq: get().tamperSeq ? null : target }),

      closeToast: () => set({ toast: null }),
      setInput: (v) => set({ input: v }),
      ask,

      updAction: (id, patch) =>
        set({ actions: get().actions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),

      execAction: (id, who) => {
        const s = get()
        const a = s.actions.find((x) => x.id === id)
        if (!a || a.status !== 'pending') return
        if (a.kind === 'approve') {
          const r = approveP(s, a.pid!, who, 'from agent proposal')
          set({
            mut: r.mut,
            events: r.events,
            actions: r.reached ? doneList(s.actions, id, 'Approved · ' + who) : s.actions,
          })
        } else if (a.kind === 'reconcile') {
          const r = reconcileP(s, a.pid!)
          set({ mut: r.mut, events: r.events, actions: doneList(s.actions, id, 'Booked') })
        } else if (a.kind === 'email') {
          set({
            events: appendFor(s.events, a.pid!, [
              {
                type: 'vendor_email_sent',
                summary: 'Vendor email sent by ' + who + ' (simulated) · drafted by agent',
              },
            ]),
            actions: doneList(s.actions, id, 'Sent · ' + who),
          })
        } else if (a.kind === 'fraud') {
          const r = rejectP(
            s,
            a.pid!,
            who,
            'Rejected as suspected fraud by ' + who + ' · proposed by agent',
          )
          set({ mut: r.mut, events: r.events, actions: doneList(s.actions, id, 'Rejected · ' + who) })
        } else if (a.kind === 'license') {
          const number = (a.license || '').trim()
          change(
            {
              mut: withMut(s, 've', { license: { number, by: who } }),
              actions: doneList(s.actions, id, 'Signed off · ' + who),
            },
            'general license recorded',
            [
              {
                type: 'license_recorded',
                pid: 've',
                payee: payoutById('ve').payee,
                summary:
                  'General license ' + number + ' signed off by ' + who + ' · proposed by agent',
              },
            ],
          )
        } else if (a.kind === 'asof') {
          api.setDay(35)
          set({ actions: doneList(get().actions, id, 'Applied') })
        } else if (a.kind === 'pay') {
          pay(a.pid!)
          set({ actions: doneList(s.actions, id, 'Sent (simulated)') })
        }
      },

      dismissAction: (id) => {
        const s = get()
        const a = s.actions.find((x) => x.id === id)
        if (!a) return
        set({
          actions: s.actions.map((x) =>
            x.id === id ? { ...x, status: 'dismissed' as const, result: 'Dismissed' } : x,
          ),
          events: append(s.events, [
            {
              type: 'agent_proposal_dismissed',
              pid: a.pid,
              payee: a.pid ? payoutById(a.pid).payee : 'Agent',
              summary: a.title + ' · dismissed by ' + ACTOR,
            },
          ]),
        })
      },

      // ---- guided demo -----------------------------------------------------
      tourSteps: () => [
        {
          title: 'Load four invoices from four countries',
          say: 'Paying Latin America costs 3 to 7 percent and takes days. Stablecoins fix the money. Corredor fixes everything around it.',
          time: '0:00',
          act: () => {
            go('inbox')
            api.loadDemo()
          },
        },
        {
          title: 'Open the Brazil payout',
          say: 'Every decision shows the rule, the date it took effect and a source link.',
          time: '0:30',
          act: () => {
            set({ selected: 'br' })
            go('inbox')
          },
        },
        {
          title: 'Rewind to Sep 30',
          say: 'Before Resolution 561, the cheapest compliant provider was an eFX house.',
          time: '0:50',
          act: () => {
            set({ selected: 'br' })
            go('inbox')
            api.setDay(5)
          },
        },
        {
          title: 'Oct 1: BR-561-EFX takes effect',
          say: 'The law changes, the route changes, and the app names the rule that did it.',
          time: '1:00',
          act: () => api.setDay(6),
        },
        {
          title: 'Oct 30: the VASP transition ends',
          say: 'It reroutes again to an authorized provider. Rules are data with dates, not code.',
          time: '1:10',
          act: () => api.setDay(35),
        },
        {
          title: 'Back to today, ask the agent',
          say: 'The agent reads and explains, with sources. It has no tool that moves money.',
          time: '1:20',
          act: () => {
            api.setDay(22)
            later(() => ask('What needs my attention today?', true), 60)
          },
        },
        {
          title: 'Approve Brazil and Mexico',
          say: 'Warnings must be acknowledged, and over fifty thousand dollars needs two different people.',
          time: '1:40',
          act: () => {
            let s = get()
            const br = pv(payoutById('br'), s)
            if (br.status === 'ready') {
              const s1 = { ...s, ...ackP(s, 'br', true) } as AppState
              const r = approveP(s1, 'br', ACTOR)
              s = { ...s1, mut: r.mut, events: r.events }
            }
            const mx = pv(payoutById('mx'), s)
            if (mx.status === 'awaiting_second_approver') {
              const r = approveP(s, 'mx', COMPLIANCE)
              s = { ...s, mut: r.mut, events: r.events }
            }
            set({ mut: s.mut, events: s.events, selected: 'br' })
            go('inbox')
          },
        },
        {
          title: 'Pay on the simulated rail',
          say: 'Payment only follows human approval. The rail is a mock, and the app says so.',
          time: '1:55',
          act: () => {
            set({ selected: 'br' })
            go('inbox')
            if (pv(payoutById('br'), get()).status === 'approved') pay('br')
          },
        },
        {
          title: 'Catch an invoice-fraud attempt',
          say: 'A resubmitted invoice hides instructions for the AI and swaps the bank details. We treat it as data and freeze it.',
          time: '2:10',
          act: () => addSuspicious(),
        },
        {
          title: 'Regulatory radar',
          say: 'An agent watches the sources, proposes changes with an impact analysis, and compliance approves.',
          time: '2:25',
          act: () => go('trust'),
        },
        {
          title: 'Prove it: the audit chain',
          say: 'AI reads and explains, code decides, a person approves, and every step is hash-chained.',
          time: '2:40',
          act: () => go('audit'),
        },
      ],
      startTour: () => set({ tour: 0 }),
      tourBack: () => set({ tour: Math.max(0, (get().tour ?? 0) - 1) }),
      tourDo: () => {
        const i = get().tour
        if (i == null) return
        const steps = api.tourSteps()
        steps[i].act()
        set({ tour: i + 1 < steps.length ? i + 1 : null })
      },
      tourExit: () => set({ tour: null }),
    }

    return api
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  // `store` is rebuilt only on navigate; hand components the live state.
  const value = useMemo<Store>(() => ({ ...store, state }), [store, state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

/** Helpers shared by the views that render money and policy copy. */
export const policyText = (s: AppState, pUsd: number) =>
  pUsd > s.settings.threshold
    ? 'Over ' + usd0(s.settings.threshold) + ': needs a second, different approver'
    : 'One approval needed'

export const capText = (s: AppState) =>
  'Daily cap: ' + usd0(approvedUsd(s)) + ' of ' + usd0(s.settings.cap)

export const overCap = (s: AppState, pUsd: number, final?: string) =>
  !final && approvedUsd(s) + pUsd > s.settings.cap
