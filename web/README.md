# Corredor — frontend

The clickable MVP from the design canvas, built for real: React 19 + TanStack
Router + Tailwind v4 on Vite. Runs entirely on fixtures, so it demos end to end
with no backend running.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build  →  dist/
npm run smoke      # mounts the app in jsdom and drives the whole demo script
```

## Routes

| Path | What it is |
|---|---|
| `/` | Marketing landing page — hero token, how it works, coverage map, security, CTA |
| `/app` | The product: overview dashboard (the lockup in the header links back to `/`) |
| `/inbox` `/agent` `/trust` `/ledger` `/audit` `/customize` | The rest of the product, inside the shell |

## Design system

Black ground, volt-yellow accent, sampled from the Corredor brand artwork
(`#ecf038`). One rule holds it together: **volt marks the engine's chosen path
and the action a person takes on it** — recommended route, primary buttons, the
as-of control. Compliance outcomes never borrow it: pass is jade, warning is
amber, blocked is coral. That keeps the yellow meaning "act here" on every
screen.

Type is Poppins (display) / Figtree (UI) / IBM Plex Mono (every number, rule id,
hash and date). All of it lives in `src/styles.css` — change a token there, not
in a component.

### Image assets

`public/corredor-mark.png` and `public/hero-coin.png` were lifted out of the
brand artwork by `tools/brand-extract.mjs` and `tools/crop-hero.mjs`, so they
are the right shapes at demo resolution but are **not** final exports. Drop in
the real SVG/PNG at the same paths and nothing else needs to change — the mark
is applied as a CSS mask (`.corredor-mark`), so it takes its colour from a
token.

## What works today

The full demo script from the PRD, client-side:

- **Overview** — pipeline with the AI / Code / Human tag on each step, KPIs,
  "needs a person", the tail of the audit chain, and the 3-minute guided tour.
- **Inbox + detail** — four payouts, route comparison, rules checklist with
  dated source links, memo, approvals, mock payment, reconcile.
- **As-of date** — the slider and the jump buttons (Sep 30 → Oct 1 → Oct 30)
  re-plan every open payout and toast each reroute *with the rule that caused
  it*.
- **Agent** — scripted responder plus the action queue: every proposal waits
  for a person.
- **Trust & compliance** — regulatory radar with a dry-run impact analysis,
  agent permissions, guardrails.
- **Ledger** — journal entries with the FX line, matched to tx + rail refs.
- **Audit** — hash-chained log, with "simulate tampering" breaking verification.
- **Customize** — autonomy, thresholds, routing preference, providers; each
  change re-runs the rules and is written to the log.

## Where the backend plugs in

Nothing in the UI reaches for `fetch` yet. The seams, in dependency order:

| Fixture today | Replace with |
|---|---|
| `src/domain/data.ts` → `PAYOUTS` | `GET /api/payouts` |
| `src/domain/data.ts` → `RULES`, `OFFRAMPS` | `GET /api/rules`, `GET /api/offramps` |
| `src/domain/engine.ts` → `plan()` | `GET /api/payouts/:id/plan?asOf=` (keep this file as the typed client's response shape — the server engine is the same algorithm) |
| `src/domain/memo.ts` → `memoFor()` | `POST /api/payouts/:id/memo` (Llama); this stays as the template fallback |
| `src/domain/agent.ts` → `respond()` | `POST /api/agent/messages` |
| `src/domain/audit.ts` → `append()`, `verify()` | `GET /api/audit`, `GET /api/audit/verify` (server chains with HMAC-SHA-512 + Ed25519 checkpoints) |
| `src/state/store.tsx` → `approve`, `pay`, `reconcile`, … | one `POST` each; the store already funnels every mutation through these actions |

`src/domain/types.ts` is the contract. Freeze it with the backend first and the
two halves can be built independently.

Two notes for whoever wires it up:

- The engine is intentionally pure and synchronous. Keeping a client-side copy
  is what makes the as-of slider feel instant; the server plan stays the source
  of truth for anything that gets written down.
- Every mutation in `store.tsx` already appends its own audit event. When the
  API takes over, drop those local appends and read the chain back from the
  server rather than keeping both.

## Known gaps

- **No real file drop.** The empty state explains that a dropped PDF will go to
  `POST /api/invoices`, and the button loads the seeded invoices instead — same
  as the approved mockup. Real upload needs extraction behind it.
- **Scripted agent.** `respond()` is keyword-matched over the demo data, not a
  model call. The queue, the autonomy levels and the tool list are real.
- **Demo hashes.** The audit chain uses FNV-1a so it runs in the browser with no
  crypto dependency. Shape matches the spec; the keyed HMAC chain and the signed
  checkpoints belong on the server.
- **Fictional numbers.** Provider fees, FX rates and the registry are demo data.
  The UI says so in three places, and the rules pack stays labeled "pending
  compliance review".

## Layout

```
src/
  domain/        pure logic, no React — data, engine, memo, agent, audit, format
  state/store.tsx  one store; every human action and audit append lives here
  components/    Shell (header, as-of bar, tour, toast), DetailPane, ui, icons
  routes/        one file per tab
  styles.css     Tailwind v4 @theme tokens + the component classes (.pill, .btn…)
tools/smoke.tsx  the jsdom walkthrough run by `npm run smoke`
```

Colors, type and the component classes are ported from the mockup verbatim, so
`styles.css` is the place to change a token — not the components.

## Stack note

The tech spec calls for TanStack Start on Bun. This is plain Vite + TanStack
Router because Bun isn't a dependency yet and the server half only matters once
the API exists. Everything here is Start-compatible: the routes are a
code-based route tree in `src/router.tsx`, so moving over means adding Start's
entry points and leaving `routes/`, `components/` and `domain/` untouched.
