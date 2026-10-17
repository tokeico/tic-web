# Demo review (Oct 17, 2026)

What the Corredor demo is supposed to show, how the guided tour runs, what's real and what's simulated, and the problems found when running it on the latest code.

Checked against **tic-web `489cc11`** and **tic-api `6499a17`**. The API and web app were run locally, and each tour action was driven through the API at the tour's dates. tic-api rules tests pass (27 of 27) and tic-web type-checks. Steps marked "UI only" were not clicked through in a browser.

## Summary

| | |
|---|---|
| **Works** | The core flow runs end to end: rules, reroutes, approvals, payment, ledger and the audit chain. |
| **Broken** | The tour step at 1:10 ("Oct 30") does nothing on screen. The rule now takes effect Oct 31. |
| **Setup gap** | The README skips generating the audit keys. Without them, the first demo step fails. |

## What Corredor does

Corredor is a back-office assistant for a US company paying suppliers in Latin America with stablecoins. It works out a legal and cheap way to send each payment, explains why with sources, and switches routes by itself when a country's law changes. A person still approves every payment.

**Who it's for (as pitched in the PRD):** Maria, a controller at a Miami importer who pays about 40 suppliers a month in Brazil, Mexico and Argentina. Stablecoins make the payment itself fast and cheap. The hard part is the work around it:

- **Each country has its own rules, and they change.** Brazil changed on Oct 1 and has another deadline at the end of October.
- **Choosing a provider:** which coin, which network, which local company may convert it. Done by hand every time.
- **Sanctions:** checking the payee isn't on a US blacklist.
- **Month-end:** matching blockchain transactions back to invoices and the books.

**What it does, using the Brazil invoice:**

1. An invoice comes in: R$85,000 to Estúdio Paulista in São Paulo.
2. It checks the payee against the US sanctions list.
3. It lists the possible ways to pay and what each costs.
4. It checks each option against Brazil's rules on the as-of date and picks the cheapest legal one.
5. It writes a memo naming the rule behind the choice, with a link to the law.
6. Maria approves. Over $50k needs a second, different person.
7. It pays (simulated), records the journal entry, and logs every step in a hash-chained audit trail.

When a rule takes effect, it re-checks open payouts and reroutes them, naming the rule that caused it. That is the date-slider moment in the demo.

The **Agent tab** is a chat assistant over the same data. It answers questions like "What needs my attention today?" with sources, and it has no tool that moves money. The pitch line: *AI reads and explains, code decides, a person approves.*

### The buyer question

`docs/persona-review/synthesis.md` (top-level docs folder, Oct 17) concludes that **the controller is the wrong buyer**. She already pays about 1–2% through Wise, Bill.com or Corpay, and Ramp sells stablecoin bill pay inside the tool she already uses. The "3–7%" figure describes small personal remittances, not B2B payments.

What every reviewer valued was the **dated, cited, versioned rules and the audit trail**. The most urgent buyers for that are payment rails and multi-provider payout platforms, which carry Brazil's licensing burden this month. Suggested pitch line: *"Corredor gives your compliance officer a cited, versioned recommendation as of a date. Your officer decides."*

## Brazil's route across the slider

The slider runs from Sep 25 (day 0) to Nov 5 (day 41). "Today" is Oct 17 (day 22).

| Dates | Recommended route | Why |
|---|---|---|
| Sep 25 – Sep 30 | PagaFX (eFX house) | Cheapest compliant option |
| Oct 1 – Oct 30 | Ponte Digital · USDC on Base · 0.7%, with a warning | `BR-561-EFX` takes effect Oct 1: eFX providers can't settle with foreign counterparties in virtual assets. Ponte's BCB authorization is pending |
| Oct 31 onward | Sol (authorized VASP) | `BR-VASP-AUTH` takes effect Oct 31: providers that didn't file by Oct 30 are blocked |

The tour moves the date to Sep 30, Oct 1, **Oct 30** and back to Oct 17. Oct 30 is one day before the second reroute, so nothing changes on screen.

## The four demo invoices

Results as of Oct 17, from the API. All names are fictional.

| Payee | Amount | Status | Route | Why it's in the demo |
|---|---|---|---|---|
| 🇧🇷 Estúdio Paulista Design Ltda (São Paulo) | R$85,000 (≈ $15,741) | Ready, 1 warning | USDC · Base · Ponte Digital · 0.7% | The route changes as the date moves |
| 🇲🇽 Autopartes del Norte S.A. de C.V. (Monterrey) | MX$1,200,000 (≈ $64,865) | Awaiting 2nd approver | USDC · Base · Puente MX · 0.6% | Over $50k needs two different approvers |
| 🇦🇷 Lucía Fernández, contractor (Buenos Aires) | US$4,000 | Ready, 1 warning | USDT · Tron · Pampa PSAV · 1.1% | Exchange-rate spread warning |
| 🇻🇪 Transportes Orinoco C.A. (Caracas) | US$12,500 | Blocked | None | US sanctions (OFAC) memo |

## The guided tour

Start it from Overview → **Start the 3-minute guided demo**. Each step shows a line for the presenter and a button that performs the action. Reset between rehearsals with Inbox → **Reset demo**.

| Time | Step | What should happen | Checked |
|---|---|---|---|
| 0:00 | Load four invoices | Ready, Awaiting 2nd approver, Ready with warning, Blocked | Works (fails without audit keys) |
| 0:30 | Open the Brazil payout | Route comparison and rules checklist with dates and source links | UI only |
| 0:50 | Rewind to Sep 30 | Brazil uses PagaFX | Works |
| 1:00 | Oct 1: BR-561-EFX takes effect | Reroutes to Ponte Digital, names the rule | Works |
| 1:10 | Oct 30: the VASP transition ends | Should reroute to Sol. **Nothing changes** | **Broken** |
| 1:20 | Back to today, ask the agent | Agent answers "What needs my attention today?" | Scripted without Ollama |
| 1:40 | Approve Brazil and Mexico | Brazil's warning acknowledged; Mexico gets two approvers | Works |
| 1:55 | Pay on the simulated rail | Brazil goes to Paid with simulated IDs | Works |
| 2:10 | Catch an invoice-fraud attempt | A resubmitted invoice with hidden AI instructions and changed bank details is frozen | Staged in the browser |
| 2:25 | Regulatory radar | Trust tab: proposed rule change with impact; compliance approves | UI only |
| 2:40 | Prove it: the audit chain | Chain verified; simulating tampering breaks it at that event | Works |

## Real vs. simulated

**Real (API and database):** rules engine and reroutes; approvals, the $50k two-person rule and the $150k daily cap; payment records, reconciliation and ledger entries; the hash-chained audit log and its verification; settings and the provider registry; invoice PDF upload and extraction (needs Ollama).

**Simulated (labeled in the app):** the payment rail (mock adapter); the agent's replies when Ollama isn't running; the invoice-fraud example in the tour; the radar's detection of rule changes; sending the vendor email; the agent autonomy setting (browser only).

## Problems, most urgent first

### 1. Frontend still says Oct 30; the rule now starts Oct 31 (breaks the tour)

tic-api commit `2cc2783` ("Rules verified against primary sources; Brazil reroute moves to Oct 31") moved `BR-VASP-AUTH` to Oct 31. That matches the law: providers had to file by Oct 30 and are blocked from Oct 31. The API tests were updated. The frontend wasn't. Confirmed through the API: `plan-all?asOf=2026-10-30` returns no reroute; `2026-10-31` returns the reroute to Sol.

Fix in tic-web:

- `src/state/store.tsx`: the tour step calls `api.setDay(35)` (Oct 30). Change it to `api.setDay(36)` and retitle the step "Oct 31".
- `src/domain/agent.ts`: answers and the "Move the demo clock" proposal use `2026-10-30`.
- `src/screens/inbox.tsx:347`: the hint says "Try Sep 30 → Oct 1 → Oct 30".
- `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` still describe Oct 30.

The persona review also flags the wording: label the Oct 31 change "providers that didn't file drop out", not "transition ended" or "authorized VASP".

### 2. README skips generating the audit keys (blocks setup)

Following the README leaves `AUDIT_HMAC_KEY` empty, and "Load the demo invoices" fails with `AUDIT_HMAC_KEY is not set`. Run `bun run keys` in tic-api and paste the `AUDIT_*` lines into `.env` before starting the API.

### 3. tic-web README is out of date (confusing)

It points to `src/routes/`, `TourBar.tsx` and `src/lib/demo-store.ts`. The screens now live in `src/screens/`, the tour in `src/components/Shell.tsx` and the state in `src/state/store.tsx`. It also lists the security hold and sanctions sign-off as "not built yet", but `489cc11` built them.

### 4. Live agent and invoice reading need Ollama (needs setup)

Without a local model, `/api/health` reports `"llm": false` and the agent falls back to scripted replies. On the demo machine, install Ollama and run `ollama pull llama3.1:8b`.

### 5. The tour skips the Ledger (minor)

The PRD's script shows the matched journal entry at 2:20. The tour goes from Pay straight to the fraud example. The Ledger tab works, so the presenter can open it by hand.

## Running it locally

Needs Bun and Docker (for Postgres). Ollama is optional.

```sh
# API on :3000
cd tic-api
cp .env.example .env
bun run keys            # paste the AUDIT_* lines into .env (missing from the README)
bun install
bun run db:up && bun run db:migrate && bun run db:seed
bun run dev

# Web on :8080 (second terminal)
cd tic-web
bun install && cp .env.example .env
bun --bun run dev

# Optional: live agent and invoice reading
ollama pull llama3.1:8b
```

Then open http://localhost:8080, click **Open the live demo**, and on Overview click **Start the 3-minute guided demo**. Before presenting, check http://localhost:3000/api/health: it should show `"db": true`, and `"llm": true` if you want the live agent.
