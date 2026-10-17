# Corredor — Combined spec (archive)

*eMerge AI Hackathon 2026 · Enterprise AI · Team spec*

- [Part 1 · PRD](#prd)
- [Part 2 · Architecture](#arch)
- [Part 3 · Frontend & team](#fe)

The compliance brain for paying Latin America in stablecoins. It knows each country's rules as of today, picks a compliant route, explains every decision with sources, reroutes when a rule changes, and books the result. **AI reads and explains, code decides, a human approves.**

-   **Stack:** TanStack · Hono · Bun · Postgres
-   **Rules pack:** v1 · 9 rules, each sourced
-   **AI:** Llama 3.1 8B · local (Ollama)
-   **Ship by:** 6:00 PM today

## Rule-change simulator

*The HTML archive included an interactive as-of date slider for the Brazil R$85,000 payout demo. Reproduce that behavior in the app using the same rules pack and demo data described below.*

*Part 1*

## Product requirements

**Event:** eMerge AI Hackathon 2026 · Enterprise AI track · Oct 17, 2026 (code 9 AM–6 PM, submit by 6 PM) **Deliverables:** working demo · public repo · short deck

---
## 1. One-liner

Corredor is an accounts-payable agent for paying Latin America in stablecoins. It knows each country's payment rules as of today, picks a compliant route, explains every decision with sources, reroutes when a rule changes, and books the result. **You just approve.**

## 2. Problem

US and Miami companies that pay suppliers and contractors in Latin America lose **3–7% per payment** to bank wires that take **1–5 days**. Stablecoins settle in minutes for less, but the work around the payment is still manual and risky:

| Pain                                                                                                                              | Who feels it           | Today                                                             |
|-----------------------------------------------------------------------------------------------------------------------------------|------------------------|-------------------------------------------------------------------|
| Every country has different rules, and they change (Brazil changed Oct 1, 2026; its crypto-provider licensing deadline is Oct 30) | Compliance, controller | Someone reads law-firm memos and hopes nothing changed            |
| Picking the coin, network and licensed local provider                                                                             | AP / treasury          | Manual, done per payment, tribal knowledge                        |
| Sanctions exposure (Venezuela, lookalike names)                                                                                   | Compliance             | Manual list checks, or none                                       |
| Matching blockchain transactions to invoices and the ERP                                                                          | Controller             | Hashes copied from block explorers into spreadsheets at month-end |

Result: companies either keep overpaying for wires or take compliance risk they can't see.

## 3. Why we win (positioning)

-   **The payment rails exist:** Bitso Business, Bridge, BlindPay, Conduit. **Stablecoin AP exists:** Ramp (since Jul 2026), Request Finance, Bitwave.
-   **What's missing:** a compliance brain that works across every rail. It treats each country's rules as versioned data, checks every payment against today's rules, writes a cited memo, and reroutes on its own when a rule takes effect.
-   **Private by design:** the AI runs on our own machine (Llama via Ollama). Invoices and payee bank details never go to a third-party AI service.
-   **Design principle:** *AI reads and explains, code decides, a human approves.* This answers the most common CFO objection on Reddit, "AI never touches my GLs… probabilistic, not deterministic."

## 4. Users

-   **Primary: Maria, a controller at a Miami importer.** About 40 LatAm payees a month across BR, MX, AR and CO. She owns approvals and month-end close and wants zero compliance surprises.
-   **Secondary: an AP clerk** who forwards invoices and fixes missing payee data.
-   **Viewer: an auditor or compliance reviewer** who reads the memo and audit trail.

## 5. Goals and non-goals

**Goals (today)** 1. Turn an invoice PDF into a compliant, approved, paid and booked payout, end to end. 2. Get the same decision every time for the same inputs and date, and show why, with sources. 3. Run a live rule-change moment: the as-of date moves and the route changes. 4. Make it obvious which parts are real and which are mocked.

**Non-goals (today)** - Moving real money or holding customer funds. - Being a licensed payment provider or giving legal advice. The rules pack is sourced but needs human compliance review. - Covering every country. We do BR, MX, AR and VE, with CO as a stretch. - Production auth, multi-tenancy or vendor onboarding portals.

## 6. Success criteria (mapped to the judging rubric)

| Rubric (pts)    | We hit it when…                                                                               |
|-----------------|-----------------------------------------------------------------------------------------------|
| Innovation (25) | Judges see a route change live when the date crosses Oct 1, and every decision cites its rule |
| Technical (25)  | The full pipeline runs live on four invoices, rules tests pass, and the audit chain verifies  |
| Impact (20)     | The problem is framed with real numbers and named competitors, and we say who pays            |
| Design/UX (15)  | One approval card per payout shows who, how much, route, cost and status at a glance          |
| Pitch (15)      | Three minutes, rehearsed twice, with a backup video recorded                                  |

## 7. Core flow

    Invoice in → Extract → Sanctions screen → Route options → Rules check (as-of date)
              → Memo → Approval (2nd approver over cap) → Pay → Reconcile → Journal entry → Audit log

## 8. Functional requirements

Priority: **P0** must ship for the demo · **P1** strongly wanted · **P2** stretch.

### 8.1 Invoice intake and extraction

-   **P0** Upload a PDF (or pick a seeded invoice). The local Llama model extracts payee name, country, amount, currency, invoice number, due date, local bank identifier (Pix key / CLABE / CVU / account), payee tax ID (CNPJ / RFC / CUIT) and description.
-   **P0** Extracted fields are editable before planning. Low-confidence fields are highlighted.
-   **P1** Field validation: CLABE is 18 digits with a check digit, a CNPJ is 14 digits, a CVU is 22 digits.
-   **P1** If required data is missing (for example Brazil's purpose code), the agent drafts an email to the vendor asking for it.

### 8.2 Sanctions screening

-   **P0** Fuzzy-match the payee name against the OFAC SDN list. The result is clear, possible match (with score and the matched entry), or hit.
-   **P0** A possible match or hit blocks the payment until a human reviews it.

### 8.3 Route options

-   **P0** For each payout, list candidate routes: a SWIFT wire, plus stablecoin routes (coin, network, off-ramp provider, local rail), each with estimated cost (%, $) and time.
-   **P0** Off-ramp providers and fees come from a seeded registry (demo data, labeled as such).

### 8.4 Rules engine (the core)

-   **P0** Rules are data (`rules.json`). Each rule has an id, corridor, effective-from and effective-to dates, a source name and URL, a condition, an outcome (`block`, `warn` or `require_fields`) and a message.
-   **P0** Takes an **as-of date** and evaluates every candidate route. The recommended route is the **cheapest compliant one**.
-   **P0** Deterministic: the same inputs and as-of date always give the same result. Covered by unit tests.
-   **P0** Rules v1:

| ID                   | Corridor | Effective                                                    | Rule                                                          | Outcome                                                                              |
|----------------------|----------|--------------------------------------------------------------|---------------------------------------------------------------|--------------------------------------------------------------------------------------|
| BR-521-FX            | BR       | 2026-02-02                                                   | Stablecoin payments are foreign-exchange operations           | `require_fields`: purpose code, payer and payee data                                 |
| BR-521-CAP           | BR       | 2026-02-02                                                   | Per-operation cap of USD 100k for standard VASPs              | `block` the route above the cap                                                      |
| BR-561-EFX           | BR       | 2026-10-01                                                   | eFX providers may not settle overseas payments in stablecoins | `block` routes whose off-ramp is an eFX provider                                     |
| BR-VASP-PENDING-WARN | BR       | 2026-02-02 → 2026-10-29                                      | Off-ramp authorization still pending                          | `warn`                                                                               |
| BR-VASP-AUTH         | BR       | 2026-10-30                                                   | VASP authorization transition ends                            | `block` routes whose off-ramp isn't authorized                                       |
| MX-BANK-CRYPTO       | MX       | 2019 (Banxico Circular 4/2019, reaffirmed Jun 2026) ⚠ verify | Banks may not operate with crypto                             | `block` routes that off-ramp through a bank. A licensed non-bank is required.        |
| AR-PSAV              | AR       | CNV PSAV registry ⚠ verify date                              | Ramps must be registered PSAVs                                | `block` unregistered off-ramps (P2P desks)                                           |
| AR-FX-SPREAD         | AR       | —                                                            | Official vs. parallel exchange-rate gap                       | `warn` if the spread is over 5%, showing both rates                                  |
| VE-OFAC              | VE       | —                                                            | Venezuela sanctions program                                   | `block` every route unless a named general license is recorded and a human signs off |

> Have someone check the BR rows against the BCB resolutions before the pitch. Sources are listed in ARCHITECTURE.md §6.

### 8.5 Memo

-   **P0** For each payout, the local Llama model writes a short memo covering what's being paid, the chosen route, why it complies (each rule cited with its source link), the warnings, and what a human should check. The model explains the engine's result and never overrides it. If the model is down, a template memo built from the rule messages is used.

### 8.6 Approval and mandate (Agent Passport–lite)

-   **P0** One approval card per payout with approve and reject.
-   **P0** Policy: payouts over **$50,000** need a second approver. A daily cap of **$150,000** applies across payouts.
-   **P1** Approver identity and timestamp are recorded and shown on the card.

### 8.7 Payout execution

-   **P0** The rail adapter interface has a **mock** implementation that returns realistic IDs: a transaction hash, an off-ramp reference, and a local-rail reference such as a Pix end-to-end ID.
-   **P1** A **Bridge** or **BlindPay** sandbox implementation behind the same interface. Decide by 10:30 AM whether it's usable; otherwise ship the mock.
-   **P0** The UI shows that the rail is simulated, with a small "sandbox / simulated" badge.

### 8.8 Reconciliation and books

-   **P0** Match invoice ↔ transaction hash ↔ local rail reference. Status: matched or exception.
-   **P0** Generate a journal entry: debit Accounts Payable, credit Cash (USDC), with lines for FX gain or loss and fees.
-   **P1** Export a CSV in QuickBooks or NetSuite journal import format.

### 8.9 Audit log

-   **P0** Append-only and hash-chained. Every step writes an event: extracted, screened, planned, memo, approved, paid, reconciled.
-   **P0** A "verify chain" check in the UI shows the chain is intact.

### 8.10 Demo clock

-   **P0** An as-of date slider, defaulting to today. Moving it re-runs the rules on all open payouts and animates any route change, with a "why" tooltip naming the rule that changed.

## 9. Screens

1.  **Payouts inbox:** a table of invoices with payee, country flag, amount, recommended route, status pill (Ready / Needs info / Blocked / Awaiting 2nd approver / Paid / Booked) and the as-of slider at the top.
2.  **Payout detail:** the extracted fields, a route comparison (wire vs. stablecoin), the rules checklist (each rule ✓ / ⚠ / ✕ with its source link), the memo, and the approve buttons.
3.  **Ledger:** reconciled payouts, journal entries, export.
4.  **Audit:** an event timeline with the chain-verified badge.

## 10. Demo script (3 minutes)

Seed data: four invoices, all names fictional.

| #   | Payee                                         | Amount       | Expected (as of Oct 17)                                                                                                                                                         |
|-----|-----------------------------------------------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1   | Estúdio Paulista Design Ltda (São Paulo)      | R$85,000     | **Ready, with warning.** USDC on Base → VASP whose authorization is pending → Pix, purpose code filled. Sep 30: the cheaper eFX route. Oct 30: switches to the authorized VASP. |
| 2   | Autopartes del Norte S.A. de C.V. (Monterrey) | MX$1,200,000 | **Awaiting 2nd approver** (over $50k). USDC → licensed non-bank → SPEI.                                                                                                         |
| 3   | Lucía Fernández, contractor (Buenos Aires)    | US$4,000     | **Ready, with warning.** USDT on Tron → registered PSAV → CVU. Rate-spread warning shown.                                                                                       |
| 4   | Transportes Orinoco C.A. (Caracas)            | US$12,500    | **Blocked.** VE-OFAC memo.                                                                                                                                                      |

1.  **0:00 Hook:** "Paying Latin America costs 3–7% and days. Stablecoins fix the money. Corredor fixes everything else."
2.  **0:20** Drop the four invoices. Fields extract live.
3.  **0:50** Statuses appear: Ready, Awaiting 2nd approver, Warning, Blocked. Open Brazil and show the route comparison and the cited rules checklist.
4.  **1:30 Rule-change moment:** drag the date to Sep 30 and Brazil uses the cheaper eFX provider. Drag to Oct 1 and it reroutes ("BR-561-EFX took effect"). Drag to Oct 30 and it reroutes again to the authorized VASP ("BR-VASP-AUTH: transition ended"). Back to today.
5.  **2:00** Approve Brazil, then second-approve Mexico. Pay and show the simulated IDs.
6.  **2:20** Ledger: the matched journal entry with the FX line. Audit: chain verified.
7.  **2:40 Close:** "Ramp and Bitso move the money. Corredor is the compliance brain across every rail. AI reads and explains, code decides, you approve."

## 11. Risks and mitigations

| Risk                                   | Mitigation                                                                                                |
|----------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Legal detail wrong                     | Sourced rules pack, labeled "pending compliance review"; verify the BR rows before the pitch              |
| Sandbox access gated                   | Same rail interface plus a mock; decide at 10:30                                                          |
| Extraction misfires live               | Pinned demo PDFs, fields editable, cached extraction for the four demo invoices                           |
| "Ramp already does this"               | Competition slide: they own the rail, we're the compliance layer across all rails                         |
| Local model too slow or flaky on stage | Pre-pulled and warmed model, cached extraction, template memo fallback, `llama3.2:3b` as a lighter option |

## 12. Owners (3 frontend + 3 backend)

Full split, screens and the integration timeline are in **Part 3: Frontend and team plan** (`FRONTEND.md`).

| Who | Scope                                                                                            |
|-----|--------------------------------------------------------------------------------------------------|
| FE1 | App shell, inbox, as-of slider, reroute toast, invoice upload                                    |
| FE2 | Payout detail: fields, route comparison, rules checklist, memo                                   |
| FE3 | Shared components, approve and pay, ledger, audit (plus deck and video from 4:30)                |
| BE1 | Rules engine, rules and demo data, quotes, golden tests, fixtures                                |
| BE2 | Local LLM (Ollama + Llama): PDF text, extraction, memo, vendor email                             |
| BE3 | DB, approvals, rail adapter, reconciliation, audit chain, deploy (plus deck and video from 4:30) |

## 13. Timeline

| Time  | Milestone                                                                                  |
|-------|--------------------------------------------------------------------------------------------|
| 9:00  | Request sandboxes. Scaffold the app. Settle the data contracts (types in ARCHITECTURE §5). |
| 10:30 | Rail decision (sandbox or mock). Extraction works on the four PDFs.                        |
| 12:00 | Rules engine and tests green. Screening and quotes wired.                                  |
| 2:00  | Memo, approvals and payout execution end to end.                                           |
| 3:30  | Reconciliation, journal, audit chain, slider animation.                                    |
| 4:30  | **Feature freeze.** Polish, rehearse, record backup video, deck, README.                   |
| 5:30  | Submit.                                                                                    |

*Part 2*

## Technical architecture

---
## 1. Principles

1.  **AI reads and explains, code decides, a human approves.** A **local Llama model** extracts invoices and writes memos. The allow/block decision is plain TypeScript over data. Money moves only after a human approves.
2.  **Invoices never leave our infrastructure.** The LLM runs on our own machine through Ollama, with no third-party AI API. That's a real selling point to finance and compliance buyers.
3.  **Rules are data.** Every rule has an effective date and a source URL. Changing the law means changing one row of JSON.
4.  **Deterministic core.** The same inputs and the same as-of date always give the same plan, and `bun test` proves it.
5.  **One interface per external dependency.** Rails, the sanctions list, FX and the LLM each sit behind an interface with a fallback, so the demo never depends on anything outside the laptop.
6.  **Tamper-evident evidence.** Every step is appended to a keyed hash chain with signed checkpoints (§12).

## 2. System overview

    ┌──────────────── tic-web (TanStack Start · React 19 · Tailwind) ── :8080 ───────┐
    │ Router (file routes) · Query (server state) · Form · Table                     │
    │ Inbox · Payout detail · Ledger · Audit · As-of slider (URL search param)       │
    └───────────────┬────────────────────────────────────────────────────────────────┘
                    │ fetch JSON (CORS)   PUBLIC_API_URL
    ┌───────────────▼──────────────── tic-api (Bun · Hono) ── :3000 ──────────────────┐
    │ routes/*  ──►  corredor/*  (pure TS core)                                      │
    │                                                                                │
    │  pdf→text ─► extract ─► screen ─► quote ─► RULES ENGINE(asOf) ─► memo ─► approve│
    │  (unpdf)    (Llama)    (OFAC)   (registry) (pure TS + rules.json) (Llama) (policy)
    │                                                               │                │
    │                                 reconcile ◄── pay ◄───────────┘                │
    │                                 (match+JE)    (RailAdapter: mock | sandbox)    │
    │  audit.append() every step ─► HMAC-SHA-512 chain + Ed25519-signed checkpoints  │
    └──────┬──────────────────────────────┬──────────────────────────────────────────┘
           │ Drizzle (bun-sql)            │ HTTP :11434
    ┌──────▼────────┐             ┌───────▼─────────────┐   ┌──────────────────────────┐
    │ Postgres 17   │             │ Ollama · Llama 3.1 8B│   │ Bridge / BlindPay sandbox │
    │ (Docker/managed)            │ (local, no cloud AI) │   │ (optional, else mock)     │
    └───────────────┘             └─────────────────────┘   └──────────────────────────┘

## 3. Stack

| Layer                    | Choice                                                                                         | Notes                                                                                                             |
|--------------------------|------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| Web                      | **TanStack Start** (React 19) + **TanStack Router / Query / Form / Table**, Tailwind v4, Biome | Already in `tic-web`. Its bundler is **rsbuild**, not Vite (see §16).                                             |
| API                      | **Hono** on **Bun**                                                                            | Already in `tic-api`. Use `hono/cors` and `@hono/zod-validator`.                                                  |
| Validation and contracts | **zod v4**                                                                                     | Shared schemas. `z.toJSONSchema()` feeds the LLM's structured output.                                             |
| DB                       | **Postgres 17 + Drizzle** (`drizzle-orm/bun-sql`)                                              | Already in `tic-api`. Follow `DATABASE.md`: edit the schema, `db:generate`, `db:migrate`, commit `drizzle/`.      |
| LLM                      | **Ollama** serving **Llama 3.1 8B Instruct** (`llama3.1:8b`); fallback `llama3.2:3b`           | Native `/api/chat` with a JSON-schema `format` for structured output. Temperature 0 with a fixed seed.            |
| PDF text                 | `unpdf`                                                                                        | Text layer from the PDF goes to the LLM, so no vision model is needed. Demo PDFs are generated with a text layer. |
| Crypto                   | `node:crypto` (works in Bun)                                                                   | HMAC-SHA-512 and Ed25519 (§12)                                                                                    |
| Tests                    | `bun test`                                                                                     | Per `tic-api/CLAUDE.md`. Don't use vitest.                                                                        |
| Hosting                  | **BitQate**: Docker containers, managed Postgres, Git-push deploys                             | §15                                                                                                               |

## 4. Repo layout

### `tic-api`

    src/
    ├─ index.ts                 Hono app: cors, routes, error handler; export default { port: 3000, fetch: app.fetch }
    ├─ routes/                  payouts.ts · invoices.ts · plan.ts · ledger.ts · audit.ts · rules.ts · settings.ts
    ├─ contracts.ts             zod schemas + types shared with tic-web (§5) ← contract freeze 9:30
    ├─ corredor/
    │  ├─ rules/rules.json      rules pack v1 (§6)
    │  ├─ rules/checks.ts       pure check functions
    │  ├─ rules/engine.ts       plan(invoice, routes, asOf) → Plan
    │  ├─ quote.ts              candidate routes from offramps.json + fx.json
    │  ├─ screen.ts             OFAC SDN fuzzy match
    │  ├─ policy.ts             mandate: 2nd approver, daily cap
    │  ├─ rails/{adapter,mock,bridge}.ts
    │  ├─ reconcile.ts          match + journal entry
    │  └─ audit.ts              HMAC chain + signed checkpoints + verify
    ├─ llm/
    │  ├─ ollama.ts             chatJSON(schema, system, user)
    │  ├─ pdf.ts                PDF → text (unpdf)
    │  ├─ extract.ts            text → Invoice (+ sha256 cache in DB)
    │  └─ memo.ts               Plan → Memo (cited-rule guard, template fallback)
    ├─ db/{index,schema,migrate}.ts   (existing; add tables §11)
    data/   offramps.json · fx.json · sdn.csv · seed/invoices/*.pdf
    scripts/ seed.ts · fixtures.ts (writes fixtures for tic-web) · keys.ts (generates audit keys)
    test/   rules.test.ts · audit.test.ts
    Dockerfile

### `tic-web`

    src/
    ├─ routes/
    │  ├─ __root.tsx            shell: nav, AsOf slider, badges, QueryClientProvider
    │  ├─ index.tsx             Payouts inbox  (search: ?asOf=2026-10-17)
    │  ├─ payouts.$id.tsx       Payout detail
    │  ├─ ledger.tsx            Ledger
    │  └─ audit.tsx             Audit
    ├─ lib/
    │  ├─ contracts.ts          copied from tic-api/src/contracts.ts (do not edit here)
    │  ├─ api.ts                queryOptions + mutations, USE_FIXTURES switch
    │  └─ format.ts             Money, dates
    ├─ components/              StatusPill, Money, RouteChip, RuleRef, SimBadge, …
    └─ fixtures/                JSON produced by tic-api scripts/fixtures.ts

## 5. Contracts (`tic-api/src/contracts.ts`, copied to `tic-web/src/lib/contracts.ts`)

    import { z } from "zod";

    export const Country = z.enum(["BR", "MX", "AR", "CO", "VE"]);
    export const LocalRail = z.enum(["pix", "spei", "cvu", "pse", "swift"]);

    export const Invoice = z.object({
      invoiceNumber: z.string(),
      payeeName: z.string(),
      payeeCountry: Country,
      payeeTaxId: z.string().nullable(),          // CNPJ / RFC / CUIT / RIF
      amount: z.number(),
      currency: z.string(),                       // BRL, MXN, USD, ...
      dueDate: z.string().nullable(),             // ISO date
      bankId: z.object({ type: LocalRail, value: z.string() }).nullable(),
      description: z.string(),
      purposeCode: z.string().nullable(),
      lowConfidence: z.array(z.string()),         // fields the model was unsure about
    });
    export type Invoice = z.infer<typeof Invoice>;

    export type OfframpType =
      | "vasp_authorized" | "vasp_pending" | "efx" | "bank"
      | "nonbank_licensed" | "psav_registered" | "p2p_unregistered";

    export interface Offramp {
      id: string; name: string; country: z.infer<typeof Country>; type: OfframpType;
      feePct: number; assets: ("USDC" | "USDT")[]; networks: ("base" | "arbitrum" | "tron")[];
      rail: z.infer<typeof LocalRail>; minutes: number;
    }

    export interface Route {
      id: string; kind: "wire" | "stablecoin";
      asset: "USDC" | "USDT" | null; network: "base" | "arbitrum" | "tron" | null;
      offramp: Offramp | null; rail: z.infer<typeof LocalRail>;
      feePct: number; feeUsd: number; minutes: number; amountUsd: number;
    }

    export type Outcome = "pass" | "warn" | "block" | "require_fields";
    export interface RuleResult {
      ruleId: string; title: string; outcome: Outcome; message: string;
      source: { name: string; url: string }; effectiveFrom: string | null; missingFields?: string[];
    }
    export interface RouteEvaluation { route: Route; results: RuleResult[]; compliant: boolean }

    export type PayoutStatus =
      | "draft" | "needs_info" | "blocked" | "awaiting_second_approver" | "ready"
      | "approved" | "paid" | "booked";

    export interface Plan {
      payoutId: string; asOf: string;
      screening: { status: "clear" | "possible_match" | "hit"; match?: string; score?: number };
      evaluations: RouteEvaluation[]; recommended: Route | null;
      status: PayoutStatus; reasons: string[];
    }

    export const Memo = z.object({
      summary: z.string(), routeRationale: z.string(), citedRuleIds: z.array(z.string()),
      warnings: z.array(z.string()), humanChecks: z.array(z.string()), vendorEmail: z.string().optional(),
    });
    export type Memo = z.infer<typeof Memo>;

    // frontend-facing shapes: PayoutSummary, PayoutDetail, Reroute, JournalEntry, AuditEvent (FRONTEND §5)

## 6. Rules pack (`corredor/rules/rules.json`)

Each rule = **when** (corridor + effective window) + **check** (named function plus params) + **outcome** + **source**.

    [
      { "id": "BR-521-FX", "corridor": "BR", "title": "Stablecoin payment = FX operation",
        "effectiveFrom": "2026-02-02", "effectiveTo": null, "appliesTo": "stablecoin",
        "check": { "fn": "requireFields", "params": { "fields": ["purposeCode", "payeeTaxId"] } },
        "outcome": "require_fields",
        "message": "Brazil treats stablecoin payments as FX: purpose code and counterparty data required.",
        "source": { "name": "BCB Res. 521 (via fcm.law)", "url": "https://fcm.law/brazil-vasp-license/" } },

      { "id": "BR-521-CAP", "corridor": "BR", "title": "USD 100k cap per operation (standard VASP)",
        "effectiveFrom": "2026-02-02", "effectiveTo": null, "appliesTo": "stablecoin",
        "check": { "fn": "amountUsdAbove", "params": { "limit": 100000, "offrampTypes": ["vasp_authorized", "vasp_pending"] } },
        "outcome": "block", "message": "Above the USD 100k per-operation cap for standard VASPs.",
        "source": { "name": "Stablecoin Insider / BCB Res. 521", "url": "https://stablecoininsider.org/stablecoin-regulation-in-latin-america/" } },

      { "id": "BR-561-EFX", "corridor": "BR", "title": "eFX providers can't settle in stablecoins",
        "effectiveFrom": "2026-10-01", "effectiveTo": null, "appliesTo": "stablecoin",
        "check": { "fn": "offrampTypeIn", "params": { "types": ["efx"] } },
        "outcome": "block", "message": "Since Oct 1, 2026, eFX providers may not settle overseas payments in stablecoins. Use an authorized VASP or bank.",
        "source": { "name": "BCB Res. 561 (via Eco)", "url": "https://eco.com/support/en/articles/15575501-brazil-stablecoin-regulation-2026-what-drex-s-pivot-means-for-usdc-and-usdt-inflows" } },

      { "id": "BR-VASP-PENDING-WARN", "corridor": "BR", "title": "Off-ramp authorization still pending",
        "effectiveFrom": "2026-02-02", "effectiveTo": "2026-10-29", "appliesTo": "stablecoin",
        "check": { "fn": "offrampTypeIn", "params": { "types": ["vasp_pending"] } },
        "outcome": "warn", "message": "Off-ramp's BCB authorization is pending; it must be authorized by Oct 30, 2026.",
        "source": { "name": "fcm.law", "url": "https://fcm.law/brazil-vasp-license/" } },

      { "id": "BR-VASP-AUTH", "corridor": "BR", "title": "VASP authorization transition ends Oct 30",
        "effectiveFrom": "2026-10-30", "effectiveTo": null, "appliesTo": "stablecoin",
        "check": { "fn": "offrampTypeIn", "params": { "types": ["vasp_pending"] } },
        "outcome": "block", "message": "Off-ramp is not BCB-authorized after the transition period.",
        "source": { "name": "fcm.law", "url": "https://fcm.law/brazil-vasp-license/" } },

      { "id": "MX-BANK-CRYPTO", "corridor": "MX", "title": "Banks may not operate with crypto",
        "effectiveFrom": "2019-03-08", "effectiveTo": null, "appliesTo": "stablecoin",
        "check": { "fn": "offrampTypeIn", "params": { "types": ["bank"] } },
        "outcome": "block", "message": "Mexican banks may not operate with crypto. Use a licensed non-bank off-ramp.",
        "source": { "name": "iProUP (Banxico/CNBV reminder, 2026)", "url": "https://www.iproup.com/economia-digital/67728-bitcoin-bancos-mexicanos-sigue-prohibido-acceder-legalmente-mayo-2026" } },

      { "id": "AR-PSAV", "corridor": "AR", "title": "Ramps must be registered PSAVs",
        "effectiveFrom": null, "effectiveTo": null, "appliesTo": "stablecoin",
        "check": { "fn": "offrampTypeIn", "params": { "types": ["p2p_unregistered"] } },
        "outcome": "block", "message": "Argentine banks can't touch crypto. Ramps must be CNV-registered PSAVs.",
        "source": { "name": "Stablecoin Insider", "url": "https://stablecoininsider.org/stablecoin-regulation-in-latin-america/" } },

      { "id": "AR-FX-SPREAD", "corridor": "AR", "title": "Official vs. parallel FX gap",
        "effectiveFrom": null, "effectiveTo": null, "appliesTo": "any",
        "check": { "fn": "fxSpreadAbove", "params": { "pct": 5, "pair": "ARS" } },
        "outcome": "warn", "message": "Official and parallel ARS rates differ by more than 5%. Confirm the rate with the payee.",
        "source": { "name": "Eco: LatAm stablecoin payroll", "url": "https://eco.com/support/en/articles/15575500-stablecoin-payroll-in-latam-usdc-vs-usdt-for-contractor-payouts" } },

      { "id": "VE-OFAC", "corridor": "VE", "title": "Venezuela sanctions program",
        "effectiveFrom": null, "effectiveTo": null, "appliesTo": "any",
        "check": { "fn": "always", "params": {} },
        "outcome": "block", "message": "Hard stop: Venezuela sanctions. Requires a named OFAC general license and compliance sign-off.",
        "source": { "name": "OFAC Venezuela sanctions", "url": "https://ofac.treasury.gov/sanctions-programs-and-country-information/venezuela-related-sanctions" } }
    ]

⚠ **Verify before the pitch:** the BR rows against the BCB resolutions; the MX effective date (Banxico Circular 4/2019); and the date of the AR PSAV registry. Show the badge "Rules pack v1 · sourced · pending compliance review" in the UI.

**Check functions** (`checks.ts`): `always`, `offrampTypeIn(types)`, `amountUsdAbove(limit, offrampTypes?)`, `requireFields(fields)`, `fxSpreadAbove(pct, pair)`. Each is pure: `(ctx: { invoice, route, fx }) => boolean | { missing: string[] }`.

## 7. Demo data

**`data/offramps.json`** (fictional providers, labeled demo):

| id           | name          | country | type               | fee   | asset/network       | rail |
|--------------|---------------|---------|--------------------|-------|---------------------|------|
| br-pagafx    | PagaFX        | BR      | `efx`              | 0.55% | USDC/base           | pix  |
| br-ponte     | Ponte Digital | BR      | `vasp_pending`     | 0.70% | USDC/base           | pix  |
| br-sol       | Sol VASP      | BR      | `vasp_authorized`  | 0.85% | USDC/base, arbitrum | pix  |
| mx-puente    | Puente MX     | MX      | `nonbank_licensed` | 0.60% | USDC/base           | spei |
| mx-bancoazul | Banco Azul    | MX      | `bank`             | 0.40% | USDC/base           | spei |
| ar-pampa     | Pampa PSAV    | AR      | `psav_registered`  | 1.10% | USDT/tron           | cvu  |
| ar-cueva     | Cueva P2P     | AR      | `p2p_unregistered` | 0.50% | USDT/tron           | cvu  |

The design means the cheapest option is always non-compliant somewhere: - **BR:** before Oct 1, PagaFX wins. Oct 1–29, Ponte wins with a warning. From Oct 30, only Sol passes. That gives **three distinct routes** on the slider. - **MX:** Banco Azul is always blocked, so Puente is chosen. - **AR:** Cueva is blocked, so Pampa is chosen.

**`data/fx.json`** (demo rates, labeled): `{ "BRL": 5.40, "MXN": 18.50, "ARS_official": 1350, "ARS_parallel": 1460 }`. The wire route is always `{ feePct: 4.5, minutes: 2880 }`.

## 8. Local LLM (Ollama + Llama)

| Step                  | Code                 | LLM?                               | Output     |
|-----------------------|----------------------|------------------------------------|------------|
| PDF → text            | `llm/pdf.ts` (unpdf) | No                                 | plain text |
| Extract               | `llm/extract.ts`     | **Llama**, JSON-schema constrained | `Invoice`  |
| Screen · Quote · Plan | `corredor/*`         | **No (deterministic)**             | `Plan`     |
| Memo                  | `llm/memo.ts`        | **Llama**, JSON-schema constrained | `Memo`     |
| Vendor email (P1)     | `llm/memo.ts`        | Llama, when status = `needs_info`  | text       |

**Client** (`llm/ollama.ts`):

    import { z } from "zod";

    const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
    const LLM_MODEL = process.env.LLM_MODEL ?? "llama3.1:8b";

    export async function chatJSON<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: LLM_MODEL,
          stream: false,
          format: z.toJSONSchema(schema),          // structured output: model must emit this shape
          options: { temperature: 0, seed: 7 },    // repeatable output
          keep_alive: "30m",                       // keep the model warm for the demo
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = (await res.json()) as { message: { content: string } };
      return schema.parse(JSON.parse(data.message.content));   // validate; throw → caller falls back
    }

**Making an 8B model reliable:** - **Deterministic pre-pass:** regexes pull CLABE (18 digits), CNPJ (14 digits), CVU (22 digits) and Pix keys from the text before the LLM runs. Checksums validate them, and validated values override the model's output. - **Structured output:** Ollama's JSON-schema `format` plus `schema.parse` on the result. On a validation failure, retry once, then mark the fields `lowConfidence` for a human to fix. - **Cache:** extraction results keyed by the PDF's sha256 (table `extraction_cache`). The four demo invoices are pre-warmed. - **Memo guard:** reject any `citedRuleIds` entry that isn't in the Plan and retry once. If the model is down or slow, use a **template memo** built from the rule messages. The decision path never depends on the LLM.

**Setup:** `ollama pull llama3.1:8b` (about 5 GB; fine on an Apple Silicon laptop). If it's slow on the demo machine, set `LLM_MODEL=llama3.2:3b`.

## 9. API (Hono, `tic-api/src/routes`)

`app.use("*", cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:8080" }))`. Request bodies are validated with `zValidator`. Errors come back as `{ error: { code, message } }`.

| Method  | Route                               | Does                                                                       |
|---------|-------------------------------------|----------------------------------------------------------------------------|
| GET     | `/api/payouts` · `/api/payouts/:id` | `PayoutSummary[]` · `PayoutDetail`                                         |
| POST    | `/api/invoices`                     | multipart PDF → text → extract → create payout (`draft`) → plan            |
| PATCH   | `/api/payouts/:id`                  | edit invoice fields → re-plan                                              |
| POST    | `/api/payouts/:id/plan?asOf=`       | screen + quote + rules → `Plan`, then memo                                 |
| POST    | `/api/plan-all?asOf=`               | re-plan all open payouts → `{ payouts, reroutes }` (the slider calls this) |
| POST    | `/api/payouts/:id/approve`          | `{ approver }`; second approval if over the cap                            |
| POST    | `/api/payouts/:id/pay`              | `RailAdapter.send(recommended)`                                            |
| POST    | `/api/payouts/:id/reconcile`        | match → journal entry                                                      |
| GET     | `/api/ledger` · `/api/ledger.csv`   | journal entries · CSV export                                               |
| GET     | `/api/audit` · `/api/audit/verify`  | events · chain and signature check                                         |
| GET     | `/api/rules?asOf=`                  | active rules                                                               |
| GET/PUT | `/api/settings`                     | `{ asOf, railMode, policy }`                                               |
| GET     | `/api/health`                       | DB, Ollama and model status (for the demo checklist)                       |

## 10. Rules engine (`corredor/rules/engine.ts`)

    plan(invoice, asOf):
      routes   = quote(invoice)                          // wire + every stablecoin route for the corridor
      screening = screen(invoice.payeeName)
      for each route:
         results = rules.filter(r => r.corridor == country && active(r, asOf) && applies(r, route))
                        .map(r => evaluate(r.check, ctx))
         compliant = no result is "block"
      recommended = cheapest compliant stablecoin route, else the wire if compliant, else null
      status = screening hit/possible → "blocked"
             | recommended == null    → "blocked"
             | missing required fields → "needs_info"
             | amountUsd > policy.secondApproverAboveUsd → "awaiting_second_approver"
             | otherwise → "ready"

Pure function with no I/O. Rules, off-ramps and FX are loaded once at startup.

## 11. Data model (Drizzle, `src/db/schema.ts`)

Keep the example `users` table or remove it in the same migration. Then `bun run db:generate && bun run db:migrate` and commit `drizzle/`.

    payouts          (id text pk, invoice jsonb, status text, as_of date, plan jsonb, memo jsonb, created_at timestamptz)
    approvals        (id serial pk, payout_id text fk, approver text, created_at timestamptz)
    payments         (id serial pk, payout_id text fk, route jsonb, tx_hash text, offramp_ref text, rail_ref text,
                      rail_mode text, status text, created_at timestamptz)
    journal_entries  (id serial pk, payout_id text fk, lines jsonb, booking_rate numeric, settle_rate numeric, created_at timestamptz)
    audit_events     (seq bigserial pk, payout_id text, type text, payload jsonb, created_at timestamptz,
                      prev_mac text, mac text, key_id text)
    audit_checkpoints(seq bigint pk, head_mac text, signature text, public_key_id text, created_at timestamptz)
    extraction_cache (pdf_sha256 text pk, invoice jsonb, model text, created_at timestamptz)
    settings         (key text pk, value jsonb)          -- demo_as_of, policy, rail_mode

**Policy:** `{ "secondApproverAboveUsd": 50000, "dailyCapUsd": 150000 }`

## 12. Audit trail: keyed hash chain plus signatures

A plain SHA-256 chain isn't broken cryptographically. Its weakness is that **anyone with database write access can rewrite a row and recompute every hash after it**. So we make the chain keyed and signed:

1.  **HMAC-SHA-512 chain.** `mac_n = HMAC-SHA-512(AUDIT_HMAC_KEY, mac_{n-1} ‖ canonicalJSON(event_n))`. The 256-bit key lives only in the API's secrets, never in the DB. Without the key, nobody can produce a valid chain, even with full DB access.
2.  **Ed25519-signed checkpoints.** Every 10 events, and after each payout reaches `booked`, the API signs the head MAC with `AUDIT_SIGNING_KEY` (Ed25519) and stores it in `audit_checkpoints`. Anyone holding the **public key** can verify the checkpoints without any secret, which is what an auditor needs.
3.  **Canonical JSON:** sorted keys and no whitespace, so the same event always produces the same bytes.
4.  **`verify()`** recomputes every MAC and checks every checkpoint signature. It reports `{ ok, count, brokenAt?, lastSignedSeq }`. The UI shows "Chain verified · signed".
5.  **Key IDs** on each row allow rotation later.

<!-- -->

    import { createHmac, sign, verify } from "node:crypto";   // supported in Bun
    const mac = createHmac("sha512", HMAC_KEY).update(prevMac).update(canonical(event)).digest("hex");
    const sig = sign(null, Buffer.from(headMac, "hex"), SIGNING_PRIVATE_KEY);      // Ed25519
    const ok  = verify(null, Buffer.from(headMac, "hex"), SIGNING_PUBLIC_KEY, sig);

`scripts/keys.ts` generates both keys once. Keys go into `.env` locally and into BitQate secrets in deployment. **Test:** tampering with any row, or with a checkpoint, makes `verify()` fail (`test/audit.test.ts`).

> Pitch line: "Even our own database admin can't quietly rewrite the history. Auditors verify it with a public key."

## 13. Rails and reconciliation

    export interface RailAdapter {
      mode: "mock" | "bridge" | "blindpay";
      send(p: { payoutId: string; route: Route; amountUsd: number; payee: Invoice }):
        Promise<{ txHash: string; offrampRef: string; railRef: string; settledLocal: number; settleRate: number }>;
    }

-   `mock.ts` derives IDs deterministically from `payoutId`, applies a small simulated rate move so the FX line isn't zero, and the UI always shows the `rail_mode` badge.
-   **Reconciliation:** a payment is `matched` when invoice ↔ payment ↔ rail reference link 1:1 and amounts agree within the quoted fee. Otherwise it's an `exception` with a reason.
-   **Journal entry (example, BR):** debit AP – Estúdio Paulista 15,740.74 (R$85,000 at 5.40) · debit fees 133.80 · credit Cash – USDC (Base) 15,874.54 · FX gain/loss from the booking-vs-settle rate difference.

## 14. Testing (`bun test`)

-   `test/rules.test.ts`: golden tests for the four demo invoices at `2026-09-30`, `2026-10-01`, `2026-10-17` and `2026-10-30`:
-   BR goes PagaFX → Ponte → Ponte → Sol
-   MX is always Puente, `awaiting_second_approver`
-   AR is Pampa with an `AR-FX-SPREAD` warning
-   VE is `blocked`
-   **Determinism:** run `plan()` 100 times and get byte-identical JSON.
-   `test/audit.test.ts`: the chain verifies; editing one payload breaks it at that sequence number; a forged checkpoint signature fails.
-   `test/extract.test.ts` (optional, needs Ollama): the four demo PDFs extract to the expected fields.

## 15. Hosting on BitQate

BitQate runs Docker images or Git repos (rebuilt on each push), managed PostgreSQL, and full-root KVM VPSs.

| Service   | BitQate resource                                    | Notes                                                                                                                                   |
|-----------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| `tic-api` | Docker container from a Git repo                    | `Dockerfile` based on `oven/bun`: `bun install --frozen-lockfile` → `bun run db:migrate` (release step) → `bun run src/index.ts`        |
| Postgres  | **Managed PostgreSQL**                              | Set `DATABASE_URL` (add `?sslmode=require` if needed). Never `db:push` against it.                                                      |
| `tic-web` | Docker container from a Git repo                    | `bun --bun run build` → `bun run start` (srvx). Set `PUBLIC_API_URL` to the API's URL.                                                  |
| Ollama    | **KVM VPS** (or a container) running `ollama serve` | CPU-only is slow, so host `llama3.2:3b` there. **For the live demo, run Ollama on the presenting laptop** and point `OLLAMA_URL` at it. |

**Demo setup we recommend:** the public link (judges can click it) runs on BitQate with cached extractions and template-memo fallback. The live pitch runs the API and Ollama on the laptop for speed. Check `GET /api/health` before going on stage.

**Secrets:** `DATABASE_URL`, `AUDIT_HMAC_KEY`, `AUDIT_SIGNING_KEY`, `AUDIT_PUBLIC_KEY`, `OLLAMA_URL`, `LLM_MODEL`, `RAIL_MODE`, `WEB_ORIGIN`, plus `BRIDGE_API_KEY` if the sandbox is approved.

## 16. Notes and decisions

-   **Bundler:** `tic-web` was scaffolded with **rsbuild**, not Vite (`rsbuild.config.ts`). Both work with TanStack Start. Keep rsbuild unless someone has a reason to switch. Moving to Vite means replacing `rsbuild.config.ts` with `vite.config.ts` using the `tanstackStart()` Vite plugin and renaming env vars from `PUBLIC_` to `VITE_`.
-   **Ports:** web on **8080** (dev script), API on **3000** (Hono/Bun default). `rsbuild.config.ts` also says 3000, but the `--port 8080` flag wins. Delete that line to avoid confusion.
-   **Contracts sync:** `tic-api/src/contracts.ts` is the source of truth. Copy it into `tic-web/src/lib/contracts.ts` whenever it changes, and post in the team chat when you do.
-   **Archie** is out of the stack, which means **we don't compete for the separate Archie prize** ($2.5k / $1k / $500).

## 17. Demo-day runbook

-   `ollama pull llama3.1:8b`, then `ollama run llama3.1:8b "hi"` to warm it up.
-   `bun run db:reset && bun run scripts/seed.ts`, then pre-warm extraction for the four PDFs.
-   `GET /api/health` should report DB ok, Ollama ok and model loaded.
-   Leave the slider on **2026-10-17**. Rehearsed moves: **Sep 30 → Oct 1 → Oct 30 → today**.
-   **If the LLM is down:** cached extraction and the template memo still give every decision.
-   **If the network is down:** the backup video plays from the laptop.

## Sources

-   Brazil VASP / FX rules: https://fcm.law/brazil-vasp-license/ · https://eco.com/support/en/articles/15575501-brazil-stablecoin-regulation-2026-what-drex-s-pivot-means-for-usdc-and-usdt-inflows
-   LatAm regulation overview: https://stablecoininsider.org/stablecoin-regulation-in-latin-america/
-   Mexico banks and crypto: https://www.iproup.com/economia-digital/67728-bitcoin-bancos-mexicanos-sigue-prohibido-acceder-legalmente-mayo-2026
-   Costs and pain: https://stabled.co/resources/latam-report · https://eco.com/support/en/articles/14466065-stablecoin-settlement-reconciliation-in-2026-why-the-accounting-layer-is-the-real-bottleneck
-   Rails: https://docs.stripe.com/stablecoins/ecosystem/bridge · https://blindpay.com/resources/more/best-stablecoin-apis-cross-border-payments-2026
-   BitQate: https://www.producthunt.com/products/bitqate

Part 3

## Frontend and team plan

3 frontend + 3 backend. Frontend builds on fixtures from the start and switches to the live API one screen at a time.

Team: **3 frontend (FE1–FE3)** and **3 backend (BE1–BE3)**. Frontend builds against **fixtures** from minute one and switches to the real API one screen at a time. Nobody waits on anybody.

---
## 1. What the frontend must make obvious

Judges should get four things without anyone explaining:

1.  **Status at a glance.** Each payout reads as Ready, Needs info, Blocked, Awaiting 2nd approver, Paid or Booked.
2.  **Why.** Every decision shows the rule, the date it took effect and a source link.
3.  **The reroute moment.** Moving the date visibly changes the route, and the app says which rule caused it.
4.  **What's real vs. simulated.** Badges for "Rail: simulated" and "Rules pack v1 · pending compliance review".

## 2. Stack (repo: `tic-web`)

| Need            | Use                                                            | Notes                                                                                                                                                                             |
|-----------------|----------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| App framework   | **TanStack Start** (React 19)                                  | Already scaffolded. Bundler is rsbuild (ARCHITECTURE §16). Dev on **:8080**.                                                                                                      |
| Routing         | **TanStack Router** (file routes in `src/routes`)              | `index.tsx` inbox · `payouts.$id.tsx` detail · `ledger.tsx` · `audit.tsx`. Delete `about.tsx`.                                                                                    |
| As-of date      | Router **search param** `?asOf=2026-10-17`, validated with zod | Shareable URLs; the slider writes to it; every query keys on it.                                                                                                                  |
| Server data     | **TanStack Query**                                             | `lib/api.ts` exports `queryOptions` and mutations. A `USE_FIXTURES` switch decides whether each `queryFn` reads `fixtures/` or calls the API. Mutations invalidate `["payouts"]`. |
| Forms           | **TanStack Form** + zod                                        | Invoice fields form (validation for CLABE 18 digits, CNPJ 14, CVU 22), approver picker                                                                                            |
| Tables          | **TanStack Table**                                             | Payouts inbox, route comparison, ledger. Sorting and column helpers.                                                                                                              |
| Slider debounce | **TanStack Pacer** (optional)                                  | Debounce `plan-all` calls while dragging (\~150 ms)                                                                                                                               |
| Devtools        | TanStack Devtools (already installed)                          | Router and Query panels during development                                                                                                                                        |
| Styling         | Tailwind v4 (already set up) · Biome for lint/format           | `bun --bun run check` before pushing                                                                                                                                              |

-   **API URL:** `import.meta.env.PUBLIC_API_URL` (rsbuild exposes `PUBLIC_*` variables), defaulting to `http://localhost:3000`. If the team switches to Vite, rename it to `VITE_API_URL`.
-   **Types:** `src/lib/contracts.ts` is a copy of `tic-api/src/contracts.ts`. Don't edit it in tic-web.
-   **Formatting:** `Intl.NumberFormat` (`pt-BR` for BRL, `es-MX` for MXN, `es-AR` for ARS, `en-US` for USD). Dates show as "Oct 17, 2026".
-   **Data fetching:** client-side through TanStack Query. We don't need SSR loaders for the demo.

## 3. Screens

### 3.1 Payouts inbox (home): **FE1**

| Area     | Component                      | Data                                              | Behavior                                                                                                                                                                        |
|----------|--------------------------------|---------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Top bar  | `AsOfSlider`                   | Router search `?asOf=`                            | Slider plus jump buttons (Sep 30 · Oct 1 · Today · Oct 30). Writes the search param; a debounced (Pacer) mutation calls `POST /api/plan-all?asOf=` and updates the Query cache. |
| Top bar  | `RulesBadge`, `RailModeBadge`  | `GET /api/rules?asOf=` count, `railMode`          | Shows "Rules pack v1 · 9 rules · pending review" and "Rail: simulated"                                                                                                          |
| Intake   | `InvoiceDropzone`              | `POST /api/invoices` (multipart PDF)              | Drag a PDF or pick a seeded invoice. Show a skeleton row while extracting.                                                                                                      |
| List     | `PayoutTable` (TanStack Table) | `GET /api/payouts`                                | Columns: payee + flag · amount (local + USD) · route chip · status pill · warnings count · open                                                                                 |
| Feedback | `RerouteToast`                 | diff of `recommended.id` before and after re-plan | "Rerouted Estúdio Paulista → Sol VASP · BR-VASP-AUTH". The changed row flashes for about 1 s (skip the flash when `prefers-reduced-motion` is set).                             |

States: empty ("Drop an invoice or load the demo set"), loading skeletons, API error (inline banner with retry).

### 3.2 Payout detail (drawer or page): **FE2**

| Section    | Component                           | Data                               | Behavior                                                                                                                                                                             |
|------------|-------------------------------------|------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Header     | `PayoutHeader`                      | payout                             | Payee, country, amount, status pill, "View memo" anchor                                                                                                                              |
| Invoice    | `InvoiceFieldsForm` (TanStack Form) | `invoice`                          | Editable fields. Anything in `lowConfidence` gets an amber outline and a "check this" hint. Save with `PATCH /api/payouts/:id`, then re-plan.                                        |
| Screening  | `ScreeningCard`                     | `plan.screening`                   | Clear / Possible match (score and matched name) / Hit                                                                                                                                |
| Routes     | `RouteComparison` (TanStack Table)  | `plan.evaluations[]`               | One row per route: rail, coin and network, provider, fee % and $, time, status. The recommended row is highlighted and the wire is shown for contrast (for example "4.5% · 2 days"). |
| Rules      | `RulesChecklist`                    | `evaluations[recommended].results` | Each rule shows ✓ / ⚠ / ✕ / "fields needed", its title, message, effective date and source link. Blocked routes expand to show which rule blocked them.                              |
| Memo       | `MemoPanel`                         | `memo`                             | Summary, route rationale, warnings and checks for a human. Each cited rule ID is a chip that scrolls to the checklist.                                                               |
| Needs info | `VendorEmailDraft` (P1)             | `memo.vendorEmail`                 | Copyable draft asking the vendor for missing fields                                                                                                                                  |

### 3.3 Approve and pay: **FE3**

| Component         | Data                  | Behavior                                                                                                                                                         |
|-------------------|-----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ApprovalPanel`   | `approvals[]`, policy | Approve or Reject. Above $50k it shows "1 of 2 approvals" and needs a second, different approver (pick a name from a demo dropdown: Maria Lopez / Daniel Ortiz). |
| `PayButton`       | status `approved`     | `POST /api/payouts/:id/pay`, then shows the transaction hash, off-ramp reference and Pix/SPEI/CVU reference with copy buttons and a "simulated" tag              |
| `ReconcileButton` | status `paid`         | `POST /api/payouts/:id/reconcile` → status `booked`, linking to the ledger                                                                                       |

### 3.4 Ledger: **FE3**

`JournalTable` from `GET /api/ledger`: date · payee · debit/credit lines · FX gain/loss · match status (Matched / Exception with reason). An "Export CSV" link points to `GET /api/ledger.csv`.

### 3.5 Audit: **FE3**

`AuditTimeline` from `GET /api/audit`: events newest first (type icon, payout, short payload summary, hash prefix). `ChainBadge` from `GET /api/audit/verify` shows "Chain verified · signed · 42 events" in green, or "Chain broken at #17" in red.

## 4. Shared components (build first, \~30 min): **FE3**

| Component     | Spec                                                                                                                                                                                                        |
|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `StatusPill`  | `ready` green · `needs_info` amber · `blocked` red · `awaiting_second_approver` amber · `approved` / `paid` / `booked` neutral with a check icon. Color is never the only signal: always text plus an icon. |
| `CountryFlag` | BR 🇧🇷 MX 🇲🇽 AR 🇦🇷 VE 🇻🇪 CO 🇨🇴, with a text code next to the flag                                                                                                                                            |
| `Money`       | `<Money amount currency />` using Intl, plus a USD equivalent in muted text                                                                                                                                 |
| `RouteChip`   | "USDC · Base · Sol VASP · 0.85%"                                                                                                                                                                            |
| `RuleRef`     | Rule ID chip with a tooltip (title and source) that links to the source                                                                                                                                     |
| `SimBadge`    | "Simulated" / "Demo data" tag                                                                                                                                                                               |

## 5. API contract (frontend view)

Types come from `tic-api/src/contracts.ts` (ARCHITECTURE §5), copied to `tic-web/src/lib/contracts.ts`. **Contract freeze is 9:30.** After that, changes need both leads to agree.

| Method  | Route                              | Returns                                             | Used by        |
|---------|------------------------------------|-----------------------------------------------------|----------------|
| GET     | `/api/payouts`                     | `PayoutSummary[]`                                   | Inbox          |
| GET     | `/api/payouts/:id`                 | `PayoutDetail`                                      | Detail         |
| POST    | `/api/invoices`                    | `PayoutDetail` (status `draft`, then planned)       | Dropzone       |
| PATCH   | `/api/payouts/:id`                 | `PayoutDetail`                                      | Fields form    |
| POST    | `/api/payouts/:id/plan?asOf=`      | `PayoutDetail`                                      | Detail refresh |
| POST    | `/api/plan-all?asOf=`              | `{ payouts: PayoutSummary[], reroutes: Reroute[] }` | Slider         |
| POST    | `/api/payouts/:id/approve`         | `PayoutDetail`                                      | Approval panel |
| POST    | `/api/payouts/:id/pay`             | `PayoutDetail` (with `payment`)                     | Pay button     |
| POST    | `/api/payouts/:id/reconcile`       | `PayoutDetail` (with `journal`)                     | Reconcile      |
| GET     | `/api/ledger` · `/api/ledger.csv`  | `JournalEntry[]` · CSV                              | Ledger         |
| GET     | `/api/audit` · `/api/audit/verify` | `AuditEvent[]` · `{ ok, count, brokenAt? }`         | Audit          |
| GET     | `/api/rules?asOf=`                 | `Rule[]` (active)                                   | Rules badge    |
| GET/PUT | `/api/settings`                    | `{ asOf, railMode, policy }`                        | Top bar        |
| GET     | `/api/health`                      | `{ db, ollama, model }`                             | Pre-demo check |

    // additions to types.ts, frontend-facing
    type PayoutSummary = {
      id: string; payeeName: string; country: "BR"|"MX"|"AR"|"VE"|"CO";
      amountLocal: number; currency: string; amountUsd: number;
      status: PayoutStatus; warnings: number;
      recommended: { id: string; label: string; feePct: number; minutes: number } | null;
    };
    type PayoutDetail = PayoutSummary & {
      invoice: Invoice; plan: Plan; memo: Memo | null;
      approvals: { approver: string; at: string }[];
      payment?: { txHash: string; offrampRef: string; railRef: string; railMode: string };
      journal?: JournalEntry;
    };
    type Reroute = { payoutId: string; from: string | null; to: string | null; ruleId: string };
    type Memo = { summary: string; routeRationale: string; citedRuleIds: string[];
      warnings: string[]; humanChecks: string[]; vendorEmail?: string };

## 6. Fixtures (so frontend never waits)

**BE1 delivers by 11:00** (from `tic-api/scripts/fixtures.ts`): `tic-web/src/fixtures/` containing `payouts.json` (the four demo payouts) and `plan-all.<date>.json` for `2026-09-30`, `2026-10-01`, `2026-10-17` and `2026-10-30`. They're generated by the real rules engine, so frontend and backend agree by construction. Until 11:00, FE1 hand-writes a minimal `payouts.json` in the same shape.

Expected states (from PRD §10):

| Payout                    | Sep 30                | Oct 1           | Oct 17 (today)  | Oct 30           |
|---------------------------|-----------------------|-----------------|-----------------|------------------|
| Estúdio Paulista (BR)     | Ready · PagaFX        | Ready ⚠ · Ponte | Ready ⚠ · Ponte | Ready · Sol VASP |
| Autopartes del Norte (MX) | Awaiting 2nd · Puente | same            | same            | same             |
| Lucía Fernández (AR)      | Ready ⚠ · Pampa       | same            | same            | same             |
| Transportes Orinoco (VE)  | Blocked               | Blocked         | Blocked         | Blocked          |

## 7. Polish list (in priority order, after 3:30)

1.  The reroute toast and row flash work perfectly at Sep 30 → Oct 1 → Oct 30.
2.  The approval card looks great at 1280×720, the projector size.
3.  Loading states during extraction (skeleton plus "Reading invoice…").
4.  Every source link opens in a new tab.
5.  Dark mode doesn't matter. Contrast on the projector does.

## 8. Team assignments

### Frontend

| Who     | Owns                                                                                                                                                        | First 30 min                                                                                                |
|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| **FE1** | App shell, nav, inbox (TanStack Table), as-of slider (Router search param + Pacer), reroute toast, dropzone, `lib/api.ts` (TanStack Query, fixtures switch) | Routes `index`, `payouts.$id`, `ledger`, `audit`; QueryClientProvider in `__root.tsx`; hand-written fixture |
| **FE2** | Payout detail: invoice fields (TanStack Form), screening, route comparison (TanStack Table), rules checklist, memo                                          | Detail layout against the fixture                                                                           |
| **FE3** | Shared components (§4), approval and pay flow, ledger, audit                                                                                                | `StatusPill`, `Money`, `RouteChip`, `RuleRef`                                                               |

### Backend

| Who     | Owns                                                                                                                                                                                                                                                              | First 30 min                                                  |
|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **BE1** | Rules engine, `rules.json`, `offramps.json`, `fx.json`, quotes, golden tests (`bun test`), `/plan`, `/plan-all`, `/rules`, **fixtures by 11:00**                                                                                                                  | `src/contracts.ts` drafted and pushed for the contract freeze |
| **BE2** | Local LLM: Ollama client, PDF text (unpdf), extraction (regex pre-pass, sha256 cache), memo (cited-rule guard plus template fallback), vendor email. Routes `/invoices` and PATCH. Seed PDFs.                                                                     | `ollama pull llama3.1:8b`, first extraction from one PDF      |
| **BE3** | Drizzle schema and seed, policy and approvals, rail adapter (mock, sandbox if approved), reconciliation and journal, audit chain (HMAC-SHA-512 plus Ed25519 checkpoints), `/approve` `/pay` `/reconcile` `/ledger` `/audit` `/settings` `/health`, BitQate deploy | Request sandbox access, DB schema, seed script                |

**Pitch and video:** FE3 and BE3 from 4:30, since their areas finish first. Everyone rehearses at 5:00.

## 9. Integration timeline

| Time  | Frontend                                     | Backend                                | Together                         |
|-------|----------------------------------------------|----------------------------------------|----------------------------------|
| 9:30  | Shell and routes up                          | `types.ts` pushed                      | **Contract freeze**              |
| 10:30 | Inbox and detail on hand-written fixtures    | Rail decision; first extraction        |                                  |
| 11:00 | Swap to generated fixtures                   | **Fixtures delivered**                 |                                  |
| 12:30 | Inbox on the live `/payouts` and `/plan-all` | Plan endpoints live                    | First live slider test           |
| 2:00  | Detail, approve and pay on the live API      | Memo, approvals and pay live           | Full flow, one invoice           |
| 3:30  | Ledger and audit live                        | Reconcile, journal and audit live      | **All four invoices end to end** |
| 4:30  | Feature freeze → polish list                 | Feature freeze → hardening, seed reset | Record the backup video          |
| 5:30  |                                              |                                        | **Submit**                       |

**Integration rule:** if an endpoint isn't live when frontend needs it, frontend stays on fixtures. Never block on the backend.
