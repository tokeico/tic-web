# Corredor web (`tic-web`)

The Corredor frontend, translated from the "Corredor · clickable MVP" design. TanStack Start (React 19), Router and Query, built with rsbuild. It talks to [`tic-api`](../tic-api) for everything: plans, approvals, payments, the ledger and the audit chain. Product and screen plan: `docs/FRONTEND.md`.

## Run it

```sh
cd ../tic-api && bun run db:up && bun run db:migrate && bun run db:seed && bun run dev   # API on :3000
cd ../tic-web && bun install && cp .env.example .env && bun --bun run dev               # web on :8080
```

Open http://localhost:8080 for the landing page; **Come in** (header or the closing section) enters the app at `/app`, where you click **Start the 3-minute guided demo**. **Reset demo** (Inbox) wipes back to the four draft invoices.

## Screens

| Tab | What | Data |
|---|---|---|
| Overview | Pipeline (who is responsible for each step), key numbers, "Needs a person", latest audit events | `/api/payouts?detail=1`, `/api/audit` |
| Inbox | Payouts table and the detail panel: approval, pay, reconcile, routes, rules checklist, memo, sanctions, invoice fields | payouts, approve, pay, reconcile, PATCH, replay |
| Agent | Chat plus the "Waiting for you" queue | scripted replies over live data; dry runs use `/api/payouts/:id/preview` |
| Trust & compliance | Regulatory radar (registry update with a real dry-run impact), agent permissions, guardrails | `/api/settings` (registry), preview |
| Ledger | Booked journal entries, CSV export | `/api/ledger`, `/api/ledger.csv` |
| Audit | Hash-chained events, verification, tamper simulation | `/api/audit`, `/api/audit/verify?tamper=` |
| Customize | Autonomy, approval policy, routing preference, providers, rules pack | `/api/settings`, `/api/offramps`, `/api/rules?all=1` |

The as-of date lives in the URL (`?asOf=2026-10-17`) on every page; moving it re-plans every open payout through `POST /api/plan-all`.

### Real vs. simulated

- **Real (API):** rules engine, reroutes, approvals and daily cap, payment records, reconciliation, ledger, audit chain, settings, registry update.
- **Simulated, and labeled as such:** the payment rail (mock adapter), the agent's replies (scripted over live data; the local model will write them), the vendor email "send", the regulatory radar's detection, agent autonomy and the warning-acknowledgment preference (browser session only).
- **From the design, not built yet:** the "suspicious invoice" security hold, human route overrides and OFAC license sign-off.

## Where things are

| Path | What |
|---|---|
| `src/routes/` | Landing page at `/`; one file per tab under `src/routes/app/` (`app.tsx` wraps them in the `Shell`) |
| `src/components/Shell.tsx` | Header, tabs, as-of bar, toast; `TourBar.tsx` is the guided demo; `PayoutPanel.tsx` the inbox detail |
| `src/lib/api.ts` | The only code that calls the API |
| `src/lib/use-actions.ts` | Every button's behaviour (writes, refreshes, error toasts) |
| `src/lib/agent.ts` · `radar.ts` | The agent's responder and the radar's dry run |
| `src/lib/demo-store.ts` | Client-only state (chat, queue, tour, toast) |
| `src/lib/contracts.ts` | **Copy** of `tic-api/src/contracts.ts`. Don't edit it here |
| `src/styles.css` | The app's design CSS, verbatim, plus the landing page's brand CSS (Tailwind runs without its preflight reset; landing resets are scoped to `.landing-root`); `src/lib/st.ts` keeps the app's inline styles verbatim too |

After `tic-api/src/contracts.ts` changes: `cp ../tic-api/src/contracts.ts src/lib/contracts.ts`.

## Checks

```sh
bunx tsc --noEmit          # types
bun --bun run check        # Biome (ARIA-role grids and non-null assertions are allowed on purpose, see biome.json)
bun --bun run build
```
