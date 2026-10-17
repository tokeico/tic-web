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

import { agentMessage, api as http, invoicePatch, rerouteLines, syncServer } from '@/domain/api-bridge'
import { append, appendFor } from '@/domain/audit'
import {
  loadSummaryMessage,
  suspiciousMessage,
  welcomeMessage,
  type AgentActionDraft,
} from '@/domain/agent'
import { remotePayouts, setServerVerify } from '@/domain/remote'
import { payoutById, visiblePayouts } from '@/domain/data'
import {
  approvedUsd,
  eff,
  fingerprint,
  mOf,
  plan,
  pv,
  rname,
} from '@/domain/engine'
import { iso, usd0 } from '@/domain/format'
import type {
  AgentAction,
  AppState,
  AuditDraft,
  AuditEvent,
  Invoice,
  Mut,
  Offramp,
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
  overview: '/app',
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

  useEffect(() => {
    let cancel = false
    syncServer(ref.current)
      .then((patch) => {
        if (cancel) return
        ref.current = { ...ref.current, ...patch }
        setState(ref.current)
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
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

      loadDemo: () => {},
      reset: () => {},
      setDay: () => {},
      setSetting: () => {},
      toggleProvider: () => {},
      approve: () => {},
      reject: () => {},
      setAck: (pid, val) => set(ackP(get(), pid, val)),
      pay: () => {},
      reconcile: () => {},
      copy: (text, key) => {
        try {
          void navigator.clipboard?.writeText(text)
        } catch {
          /* clipboard unavailable in some embeds */
        }
        set({ copied: key })
        later(() => get().copied === key && set({ copied: null }), 1500)
      },
      replay: () => {},
      radarDecide: () => {},
      tourSteps: () => [],

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
      saveEdit: (_pid) => {},


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

      toggleTamper: (_target) => {},

      closeToast: () => set({ toast: null }),
      setInput: (v) => set({ input: v }),
      ask: (_text, _goAgent) => {},

      updAction: (id, patch) =>
        set({ actions: get().actions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),

      execAction: (_id, _who) => {},

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

    const fail = (e: unknown) => {
      const body = e instanceof Error ? e.message : 'Something went wrong'
      const key = Date.now()
      set({ toast: { key, lines: [{ head: 'Couldn’t reach the API:', body }] } })
      toastLater(key, null)
    }
    const refresh = async (extra: Partial<AppState> = {}) => {
      const patch = await syncServer(get())
      set({ ...patch, ...extra })
    }
    const countryId = (c: string) => remotePayouts()?.find((p) => p.c === c)?.id

    api.loadDemo = () => {
      const s0 = get()
      if (s0.loaded || s0.loading) return
      set({ loading: true })
      void (async () => {
        try {
          await http.planAll(iso(get().day))
          const patch = await syncServer(get())
          const s = get()
          set({
            ...patch,
            loading: false,
            loaded: true,
            chat: s.chat.concat([loadSummaryMessage(iso(patch.day ?? s.day))]),
          })
        } catch (e) {
          set({ loading: false })
          fail(e)
        }
      })()
    }

    api.reset = () => {
      void (async () => {
        try {
          await http.resetDemo()
          timers.current.forEach(clearTimeout)
          timers.current = []
          const fresh = initialState()
          ref.current = fresh
          setState(fresh)
          const patch = await syncServer(fresh)
          set(patch)
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.setDay = (day) => {
      const s = get()
      if (day === s.day) return
      set({ day })
      if (!s.loaded) return
      void (async () => {
        try {
          const res = await http.planAll(iso(day))
          const lines = rerouteLines(res.reroutes)
          const key = Date.now()
          const patch = await syncServer(get())
          set({
            ...patch,
            day,
            ...(lines.length
              ? { toast: { lines, key }, flashId: res.reroutes[0]?.payoutId ?? null, reroutes: s.reroutes + lines.length }
              : {}),
          })
          if (lines.length) toastLater(key, res.reroutes[0]?.payoutId ?? null)
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.setSetting = (key, val, summary) => {
      const s = get()
      if (s.settings[key] === val) return
      if (key === 'autonomy' || key === 'requireAck') {
        set({ settings: { ...s.settings, [key]: val } })
        return
      }
      void (async () => {
        try {
          if (key === 'objective') await http.updateSettings({ objective: val as Settings['objective'], by: ACTOR })
          else if (key === 'threshold' || key === 'cap') {
            await http.updateSettings({
              policy: {
                secondApproverAboveUsd: key === 'threshold' ? (val as number) : s.settings.threshold,
                dailyCapUsd: key === 'cap' ? (val as number) : s.settings.cap,
              },
              by: ACTOR,
            })
          }
          await refresh()
          const keyN = Date.now()
          set({ toast: { key: keyN, lines: [{ head: 'Saved.', body: summary }] } })
          toastLater(keyN, null)
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.toggleProvider = (o) => {
      const s = get()
      const disabled = { ...s.settings.disabled, [o.id]: !s.settings.disabled[o.id] }
      void (async () => {
        try {
          await http.updateSettings({
            disabledOfframps: Object.entries(disabled).filter(([, on]) => on).map(([id]) => id),
            by: ACTOR,
          })
          await refresh()
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.approve = (pid, who) => {
      void (async () => {
        try {
          await http.approvePayout(pid, { approver: who, decision: 'approved' })
          await refresh()
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.reject = (pid) => {
      void (async () => {
        try {
          await http.approvePayout(pid, { approver: ACTOR, decision: 'rejected' })
          await refresh()
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.pay = (id) => {
      set({ paying: id })
      void (async () => {
        try {
          await http.payPayout(id, ACTOR)
          await refresh({ paying: null })
        } catch (e) {
          set({ paying: null })
          fail(e)
        }
      })()
    }

    api.reconcile = (id) => {
      void (async () => {
        try {
          await http.reconcilePayout(id, ACTOR)
          await refresh()
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.saveEdit = (pid) => {
      const s = get()
      const draft = s.editDraft
      if (!draft) return
      const current = payoutById(pid).inv
      const bank = current.bank.toLowerCase()
      const type = bank.includes('pix') ? 'pix' : bank.includes('clabe') || bank.includes('spei') ? 'spei' : bank.includes('cvu') ? 'cvu' : bank.includes('pse') ? 'pse' : null
      void (async () => {
        try {
          await http.editInvoice(pid, { ...invoicePatch(current, draft.values, type ? { type, value: '' } : undefined), by: ACTOR })
          await refresh({ editDraft: null })
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.radarDecide = (ok) => {
      if (!ok) {
        set({ radar: 'rejected' })
        return
      }
      void (async () => {
        try {
          const offramps = await (await import('@/lib/api')).offrampsQuery.queryFn()
          const row = offramps.find((o: { id: string; name: string }) => /ponte/i.test(o.name))
          if (row) {
            await http.updateSettings({ registry: { [row.id]: 'vasp_authorized' }, by: COMPLIANCE })
          }
          await refresh({ radar: 'approved' })
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.replay = (pid) => {
      void (async () => {
        try {
          const res = await http.replayPlan(pid, 100)
          const v = pv(payoutById(pid), get())
          set({
            replay: {
              pid,
              fp: fingerprint(v.plan),
              text: res.identical + '/' + res.n + ' identical · ' + res.ms.toFixed(1) + ' ms',
            },
          })
        } catch (e) {
          fail(e)
        }
      })()
    }

    api.toggleTamper = (target) => {
      const next = get().tamperSeq ? null : target
      void (async () => {
        try {
          const v = await http.verify(next ?? undefined)
          setServerVerify(next, { ok: v.ok, brokenAt: v.brokenAt })
        } catch {
          /* the chain badge falls back to the local check */
        }
        set({ tamperSeq: next })
      })()
    }

    api.ask = (text, goAgent) => {
      const s = get()
      if (s.busy) {
        if (goAgent) go('agent')
        return
      }
      const history = s.chat.concat([{ role: 'user', text }])
      set({ chat: history, input: '', busy: { tools: ['reading payouts'] } })
      if (goAgent) go('agent')
      void (async () => {
        try {
          const messages = history.map((m) =>
            m.role === 'user'
              ? { role: 'user' as const, content: m.text }
              : { role: 'assistant' as const, content: m.paras.concat(m.bullets, m.note ? [m.note] : []).join('\n') },
          )
          const reply = await http.askAgentApi(messages, iso(get().day))
          const s2 = get()
          const drafts: AgentActionDraft[] = reply.actions.map((a) => ({
            kind: a.kind,
            pid: a.payoutId,
            risk: a.risk,
            title: a.title,
            why: a.why,
            cites: a.cites,
            body: a.body,
          }))
          set({
            busy: null,
            chat: s2.chat.concat([agentMessage(reply)]),
            ...addActions(s2, drafts),
          })
        } catch (e) {
          set({ busy: null })
          fail(e)
        }
      })()
    }

    api.execAction = (id, who) => {
      const s = get()
      const a = s.actions.find((x) => x.id === id)
      if (!a || a.status !== 'pending' || !a.pid && a.kind !== 'asof') return
      const finish = (result: string) => set({ actions: doneList(get().actions, id, result) })
      if (a.kind === 'approve' && a.pid) {
        void http.approvePayout(a.pid, { approver: who, decision: 'approved' }).then(() => refresh()).then(() => finish('Approved · ' + who)).catch(fail)
      } else if (a.kind === 'pay' && a.pid) {
        api.pay(a.pid)
        finish('Sent (simulated)')
      } else if (a.kind === 'reconcile' && a.pid) {
        api.reconcile(a.pid)
        finish('Booked')
      } else if (a.kind === 'asof') {
        api.setDay(35)
        finish('Applied')
      } else if (a.kind === 'email') {
        finish('Sent · ' + who)
      } else if (a.kind === 'fraud' && a.pid) {
        api.reject(a.pid)
        finish('Rejected · ' + who)
      }
    }

    api.tourSteps = () => [
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
          const id = countryId('BR')
          if (id) set({ selected: id })
          go('inbox')
        },
      },
      {
        title: 'Rewind to Sep 30',
        say: 'Before Resolution 561, the cheapest compliant provider was an eFX house.',
        time: '0:50',
        act: () => {
          const id = countryId('BR')
          if (id) set({ selected: id })
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
          later(() => api.ask('What needs my attention today?', true), 400)
        },
      },
      {
        title: 'Approve Brazil and Mexico',
        say: 'Warnings must be acknowledged, and over fifty thousand dollars needs two different people.',
        time: '1:40',
        act: () => {
          const br = countryId('BR')
          const mx = countryId('MX')
          void (async () => {
            try {
              if (br) {
                set(ackP(get(), br, true))
                await http.approvePayout(br, { approver: ACTOR, decision: 'approved' })
              }
              if (mx) {
                await http.approvePayout(mx, { approver: ACTOR, decision: 'approved' }).catch(() => {})
                await http.approvePayout(mx, { approver: COMPLIANCE, decision: 'approved' }).catch(() => {})
              }
              await refresh({ selected: br ?? null })
              go('inbox')
            } catch (e) {
              fail(e)
            }
          })()
        },
      },
      {
        title: 'Pay on the simulated rail',
        say: 'Payment only follows human approval. The rail is a mock, and the app says so.',
        time: '1:55',
        act: () => {
          const br = countryId('BR')
          if (!br) return
          set({ selected: br })
          go('inbox')
          api.pay(br)
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
    ]

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
