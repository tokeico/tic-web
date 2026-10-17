// The CEO dashboard's story for the demo admin: twelve months of fictional
// history, the agent fleet and the live activity it streams. Made up for the
// pitch — shown only to the demo admin.
// Every derived number (totals, savings, the briefing) is computed from these
// rows so the screen never contradicts itself.

import { WIRE_FEE_PCT } from "./data";
import { usd0 } from "./format";

export type Corridor = "MX" | "BR" | "CO" | "AR" | "VE";
export type AgentKind = "AI" | "Code" | "AI + Code";

export interface MonthRow {
	label: string;
	/** USD paid out this month. October is month-to-date (through Oct 17). */
	volume: number;
	payouts: number;
	/** Share of volume the router sent over stablecoin rails. */
	stable: number;
	/** USD stopped by Sentinel (fraud, bank swaps, duplicates). */
	stopped: number;
	partial?: boolean;
}

/** Average all-in fee on stablecoin routes, in percent. */
export const DEMO_STABLE_FEE = 0.84;
/** Median minutes from release to settlement on stablecoin routes. */
export const DEMO_SETTLE_MIN = 14;

export const DEMO_MONTHS: MonthRow[] = [
	{ label: "Nov", volume: 612_000, payouts: 51, stable: 0.31, stopped: 0 },
	{ label: "Dec", volume: 548_000, payouts: 44, stable: 0.35, stopped: 8_200 },
	{ label: "Jan", volume: 705_000, payouts: 57, stable: 0.42, stopped: 0 },
	{ label: "Feb", volume: 792_000, payouts: 63, stable: 0.48, stopped: 15_400 },
	{ label: "Mar", volume: 918_000, payouts: 71, stable: 0.55, stopped: 0 },
	{
		label: "Apr",
		volume: 1_043_000,
		payouts: 80,
		stable: 0.61,
		stopped: 22_100,
	},
	{
		label: "May",
		volume: 1_181_000,
		payouts: 89,
		stable: 0.66,
		stopped: 9_600,
	},
	{ label: "Jun", volume: 1_266_000, payouts: 94, stable: 0.7, stopped: 0 },
	{
		label: "Jul",
		volume: 1_412_000,
		payouts: 103,
		stable: 0.74,
		stopped: 31_800,
	},
	{
		label: "Aug",
		volume: 1_524_000,
		payouts: 111,
		stable: 0.77,
		stopped: 12_400,
	},
	{
		label: "Sep",
		volume: 1_731_000,
		payouts: 124,
		stable: 0.8,
		stopped: 64_900,
	},
	{
		label: "Oct",
		volume: 1_062_000,
		payouts: 76,
		stable: 0.82,
		stopped: 15_685,
		partial: true,
	},
];

/** October is month-to-date: the demo clock reads Oct 17 of 31 days. */
export const paceOf = (m: MonthRow) =>
	m.partial ? (m.volume * 31) / 17 : m.volume;

/** USD saved versus sending the same volume by SWIFT wire. */
export const savedOf = (m: MonthRow) =>
	(m.volume * m.stable * (WIRE_FEE_PCT - DEMO_STABLE_FEE)) / 100;

const sum = (f: (m: MonthRow) => number) =>
	DEMO_MONTHS.reduce((t, m) => t + f(m), 0);

export const DEMO_TOTALS = {
	volume: sum((m) => m.volume),
	payouts: sum((m) => m.payouts),
	saved: sum(savedOf),
	stopped: sum((m) => m.stopped),
	threats: 27,
	screenings: 3_412,
	sanctionsHits: 1,
	invoicesRead: 1_184,
	autoAccepted: 0.991,
	autoMatched: 0.986,
	/** Payouts that went intake → booked with no person touching a field. */
	straightThrough: 0.88,
	hoursSaved: 1_430,
	committed7: 412_300,
	committed30: 1_286_000,
	auditEvents: 9_847,
};

export const DEMO_CORRIDORS: {
	c: Corridor;
	name: string;
	share: number;
	blocked?: number;
}[] = [
	{ c: "MX", name: "Mexico", share: 0.39 },
	{ c: "BR", name: "Brazil", share: 0.31 },
	{ c: "CO", name: "Colombia", share: 0.16 },
	{ c: "AR", name: "Argentina", share: 0.14 },
	{ c: "VE", name: "Venezuela", share: 0, blocked: 186_400 },
];

export interface FleetAgent {
	id: string;
	name: string;
	kind: AgentKind;
	job: string;
	stat: string;
	sub: string;
	/** What the agent is doing right now; the card cycles through these. */
	now: string[];
}

export const DEMO_FLEET: FleetAgent[] = [
	{
		id: "intake",
		name: "Intake",
		kind: "AI",
		job: "Reads invoice PDFs into typed fields",
		stat: "1,184 invoices read",
		sub: "99.1% of fields auto-accepted",
		now: [
			"Reading INV-2026-0418 · Autopartes del Norte",
			"Extracting tax ID and CLABE from a scanned PDF",
			"Cross-checking amount against the purchase order",
		],
	},
	{
		id: "sentinel",
		name: "Sentinel",
		kind: "AI + Code",
		job: "Hunts injected instructions, bank swaps and duplicates",
		stat: "27 threats stopped",
		sub: `${usd0(DEMO_TOTALS.stopped)} protected`,
		now: [
			"Comparing bank details with the vendor master",
			"Scanning invoice text for hidden instructions",
			"Checking for duplicate invoice numbers across vendors",
		],
	},
	{
		id: "sanctions",
		name: "Sanctions",
		kind: "Code",
		job: "OFAC SDN fuzzy match on every payee",
		stat: "3,412 screenings",
		sub: "1 confirmed hit · blocked",
		now: [
			"Screening Ponte Digital Ltda against OFAC SDN",
			"Re-screening all payees on today's SDN update",
			"Fuzzy-matching transliterated names",
		],
	},
	{
		id: "router",
		name: "Router",
		kind: "Code",
		job: "Rules engine picks the cheapest compliant rail",
		stat: "1,129 routes planned",
		sub: "0.84% average fee",
		now: [
			"Pricing 7 off-ramps for a BRL 85,000 payout",
			"Applying Banxico Circular 4/2019 to an MXN route",
			"Re-planning 12 payouts for today's FX snapshot",
		],
	},
	{
		id: "radar",
		name: "Radar",
		kind: "AI",
		job: "Watches regulators for rule changes",
		stat: "5 regulators watched",
		sub: "1 update awaiting sign-off",
		now: [
			"Reading the BCB circulars published overnight",
			"Diffing Banxico's VASP registry",
			"Drafting a memo on BCB Res. 561",
		],
	},
	{
		id: "reconciler",
		name: "Reconciler",
		kind: "Code",
		job: "Matches rail references and books the journal",
		stat: "98.6% auto-matched",
		sub: "14 entries booked today",
		now: [
			"Matching tx 0x9f3a…c21e to a payout",
			"Booking a journal entry for Puente MX",
			"Closing out yesterday's settlement batch",
		],
	},
];

export type StreamTone = "ok" | "warn" | "bad" | "human";
export interface StreamTemplate {
	agent: string;
	kind: AgentKind | "Human";
	tone: StreamTone;
	text: string;
}

/** The live feed loops through these, so the dashboard never sits still. */
export const DEMO_STREAM: StreamTemplate[] = [
	{
		agent: "Intake",
		kind: "AI",
		tone: "ok",
		text: "Read INV-2026-0418 from Autopartes del Norte · 11 fields · 0 low-confidence",
	},
	{
		agent: "Sanctions",
		kind: "Code",
		tone: "ok",
		text: "Screened Autopartes del Norte S.A. de C.V. against OFAC SDN · no match",
	},
	{
		agent: "Router",
		kind: "Code",
		tone: "ok",
		text: "Routed $64,865 to MX via Puente MX · 0.70% · 12 min · saved $2,465",
	},
	{
		agent: "Sentinel",
		kind: "AI + Code",
		tone: "bad",
		text: "Held Estúdio Paulista INV-0098: invoice asks to change the payout account",
	},
	{
		agent: "Daniel Ortiz",
		kind: "Human",
		tone: "human",
		text: "Approved Lucía Fernández · $4,000 · second approver not required",
	},
	{
		agent: "Reconciler",
		kind: "Code",
		tone: "ok",
		text: "Matched rail ref PNT-88213 → journal entry booked to 2100 AP",
	},
	{
		agent: "Radar",
		kind: "AI",
		tone: "warn",
		text: "BCB Res. 561 takes effect Oct 1 · registry update drafted for compliance",
	},
	{
		agent: "Intake",
		kind: "AI",
		tone: "ok",
		text: "Read 3 invoices from Ponte Digital Ltda · all fields auto-accepted",
	},
	{
		agent: "Router",
		kind: "Code",
		tone: "ok",
		text: "Re-planned 12 payouts on the new FX snapshot · 2 cheaper routes found",
	},
	{
		agent: "Sanctions",
		kind: "Code",
		tone: "bad",
		text: "Blocked Transportes Orinoco · OFAC Venezuela program · never released",
	},
	{
		agent: "Sentinel",
		kind: "AI + Code",
		tone: "ok",
		text: "Cleared Cafetal Andino SAS · bank details match the vendor master",
	},
	{
		agent: "Priya Shah",
		kind: "Human",
		tone: "human",
		text: "Verified the audit chain · 9,847 events · unbroken",
	},
	{
		agent: "Router",
		kind: "Code",
		tone: "ok",
		text: "Routed BRL 85,000 via Sol VASP · 0.90% · 15 min · saved $567",
	},
	{
		agent: "Reconciler",
		kind: "Code",
		tone: "ok",
		text: "Closed yesterday's batch · 41 of 41 payouts matched",
	},
];

/** Decisions agents can't make: they wait for a person (count + where). */
export const DEMO_ESCALATIONS = [
	{
		tag: "Approval",
		text: "Autopartes del Norte · $64,865 needs a second approver (over $50,000)",
		view: "inbox" as const,
	},
	{
		tag: "Compliance",
		text: "Radar's BCB Res. 561 registry update awaits sign-off",
		view: "trust" as const,
	},
];
