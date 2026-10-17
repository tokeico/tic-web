# Corredor web (`tic-web`)

The Corredor frontend. TanStack Start (React 19), Router and Query, built with rsbuild. It talks to [`tic-api`](../tic-api) for plans, approvals, payments, the ledger and the audit chain. Product and screen plan: `docs/FRONTEND.md`.

## Run it

Requires Bun and Docker for PostgreSQL. Set up and start the API first in a separate terminal:

```sh
cd ../tic-api
bun install
cp .env.example .env
bun run keys
```

Paste all three generated `AUDIT_*` lines into the API's `.env`, replacing the empty entries. Keep the keys private and retain them between restarts so existing audit events remain verifiable.

```sh
bun run db:up && bun run db:migrate && bun run db:seed
bun run dev
```

Then start the web app in a second terminal:

```sh
cd ../tic-web
bun install
cp .env.example .env
bun --bun run dev
```

Before presenting, check http://localhost:3000/api/health for `"db": true`. Open http://localhost:8080, click **Open the live demo**, then go to Overview (under **More views**) and click **Start the 3-minute guided demo**. **Reset demo** (Inbox) restores the four draft invoices.

The interactive tour compares Sep 30 → Oct 1 → **Oct 31**, then returns to Oct 17. Oct 30 is still a valid filing day; Corredor blocks providers that didn't file from Oct 31. Sol's authorization is hypothetical and all demo providers are fictional. Each screen explains what it does, why it matters and what to try. Steps remain open for inspection and use a separate **Next step** button. Fictional screening, staged invoice fraud, radar and audit exploration come first; manual approvals, simulated payment and the matched Ledger entry form the closing sequence.

The fictional name-check sandbox in Trust uses `data/presentation/sdn.csv` and `data/presentation/alt.csv` in `tic-api` through `GET /api/demo/screen`. It is explicitly simulated and cannot clear a payout. Normal payout screening still uses the separate OFAC snapshot.

The current API demo state is shared. Do not expose it as an independent multi-visitor sandbox until visitor isolation is implemented; **Reset demo** currently resets the shared dataset.

### Optional: live agent and invoice reading

Install Ollama, run `ollama pull llama3.1:8b`, and start `ollama serve` unless it is already running as a service. The API defaults to that model on `http://localhost:11434`. Check http://localhost:3000/api/health for `"llm": true` before demonstrating live chat or uncached PDF extraction. The seeded invoices and deterministic workflow do not require Ollama. See [`tic-api` setup](../tic-api/README.md) and `docs/AGENT.md`.

## Docker

```sh
docker build -t tic-web .
docker run -e API_ORIGIN=http://<api-host>:3000 -p 8080:3000 tic-web
```

The image runs `bun run start` (srvx serving `dist/`); `API_ORIGIN` tells the server where to proxy `/api/*` and is read at request time (`PUBLIC_API_URL` is baked in at build time, dev only). From the hackathon root, `docker compose up -d --build` (see `../docker-compose.yml`) runs db + api + web at http://localhost:8080.

## Screens

| Tab                  | What                                                                                                                                                                                                       | Data                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Overview             | Pipeline (who is responsible for each step), key numbers, "Needs a person", latest audit events                                                                                                            | `/api/payouts?detail=1`, `/api/audit`                      |
| Inbox                | Payouts table and the detail panel: approval, pay, reconcile, routes, rules checklist, memo, sanctions, invoice fields                                                                                     | payouts, approve, pay, reconcile, PATCH, replay            |
| Agent                | Local-model chat plus the "Waiting for you" queue                                                                                                                                                          | `/api/agent/chat`; dry runs use `/api/payouts/:id/preview` |
| Trust & compliance   | Regulatory radar (registry update with a real dry-run impact), agent permissions, guardrails                                                                                                               | `/api/settings` (registry), preview                        |
| Books → Transactions | Search payment receipts by payee, invoice, hash or reference; filter networks; copy references and open invoice activity. Mock receipts are labeled simulated; wires are separate from blockchain networks | `/api/payouts?detail=1`, `/api/audit`                      |
| Books → Ledger       | Booked journal entries, CSV export                                                                                                                                                                         | `/api/ledger`, `/api/ledger.csv`                           |
| Books → Audit        | Hash-chained events, verification, tamper simulation                                                                                                                                                       | `/api/audit`, `/api/audit/verify?tamper=`                  |
| Customize            | Autonomy, approval policy, routing preference, providers, rules pack                                                                                                                                       | `/api/settings`, `/api/offramps`, `/api/rules?all=1`       |

The as-of date lives in the URL (`?asOf=2026-10-17`) on every page; moving it re-plans every open payout through `POST /api/plan-all`.

### Real vs. simulated

- **Real (API):** rules engine, reroutes, approvals and daily cap, payment records, reconciliation, ledger, audit chain, settings, registry update, uploaded-invoice security holds and compliance sanctions sign-off.
- **Simulated, and labeled as such:** the payment rail (mock adapter), scripted demo narration, the tour's browser-staged fraud invoice, the vendor email "send", the regulatory radar's detection, agent autonomy and the warning-acknowledgment preference (browser session only).
- **Invoices:** drop PDFs on the Inbox (or "Upload invoice"); fields are read by the local model with checksum checks, then planned. Uncached extraction requires Ollama.
- **Browser-only:** human route-override drafts and the staged fraud example are not equivalent to persisted API reviews.

## Where things are

| Path                            | What                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/screens/`                  | Screen implementations, including `books.tsx` composing the transaction explorer, Ledger and Audit |
| `src/routes/`                   | Thin TanStack Router route definitions                                                             |
| `src/components/Shell.tsx`      | Header, navigation, as-of bar, toast and guided tour bar                                           |
| `src/components/DetailPane.tsx` | Inbox payout detail and reviews                                                                    |
| `src/lib/api.ts`                | The only code that calls the API                                                                   |
| `src/state/store.tsx`           | Actions, API refreshes, chat, queue, guided tour steps and client state                            |
| `src/domain/agent.ts`           | Scripted responder, suggestions, demo narration and radar impact                                   |
| `src/domain/api-bridge.ts`      | Maps API responses to the screen data model                                                        |
| `src/lib/contracts.ts`          | **Copy** of `tic-api/src/contracts.ts`. Don't edit it here                                         |
| `src/styles.css`                | Shared theme and styles                                                                            |

After `tic-api/src/contracts.ts` changes: `cp ../tic-api/src/contracts.ts src/lib/contracts.ts`.

## Checks

```sh
bunx tsc --noEmit          # types
bun test                   # demo steps, payment-state guards and explorer records
bun --bun run check        # Biome (ARIA-role grids and non-null assertions are allowed on purpose, see biome.json)
bun --bun run build
```
