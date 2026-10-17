export type Corridor = "BR" | "MX" | "AR" | "VE" | "CO";

export type RuleKind = "block" | "warn" | "fields";

/** A rule's verdict for one route on one as-of date. */
export type Outcome = "pass" | "warn" | "block" | "fields" | "na" | "inactive";

export type OfframpType =
	| "efx"
	| "vasp_authorized"
	| "vasp_pending"
	| "vasp_unfiled"
	| "nonbank_licensed"
	| "bank"
	| "psav_registered"
	| "p2p_unregistered";

export type Objective = "cheapest" | "fastest" | "safest";

export type Autonomy = "suggest" | "prepare" | "auto";

export type Status =
	| "draft"
	| "needs_info"
	| "blocked"
	| "awaiting_second_approver"
	| "ready"
	| "approved"
	| "paid"
	| "booked"
	| "rejected"
	| "security_hold";

export interface Source {
	/** Full citation shown under a rule. */
	name: string;
	/** Short label for the radar chips. */
	short: string;
	url: string;
}

export interface Invoice {
	number: string;
	taxId: string;
	bank: string;
	due: string;
	purposeCode: string | null;
	desc: string;
}

export interface SecurityFlags {
	quote: string;
	onFile: string;
	onInvoice: string;
	dupOf: string;
	/** From the API (uploaded invoices): the exact lines the server scanner found. */
	findings?: SecurityFinding[];
	/** From the API: where the hold stands; cleared keeps the findings visible. */
	status?: "active" | "cleared" | "confirmed_suspicious";
}

/** One instruction-like line the API's injection scanner flagged, quoted verbatim. */
export interface SecurityFinding {
	pattern: string;
	quote: string;
}

export interface Payout {
	id: string;
	payee: string;
	city: string;
	c: Corridor;
	country: string;
	amount: number;
	cur: string;
	locale: string;
	/** Booking rate, local currency per USD. */
	rate: number;
	/** Settlement rate, for the FX line. */
	settle: number;
	file: string;
	/** Field keys whose extraction confidence was low. */
	low: string[];
	inv: Invoice;
	usd: number;
	hidden?: boolean;
	security?: SecurityFlags;
}

/** A payout with human edits and a recorded license folded in. */
export interface EffectivePayout extends Payout {
	license: { number: string; by: string } | null;
}

export interface Offramp {
	id: string;
	name: string;
	c: Corridor;
	type: OfframpType;
	/** Provider fee, in percent. */
	fee: number;
	asset: string;
	net: string;
	rail: string;
	/** Settlement time, in minutes. */
	min: number;
}

export interface Route {
	id: string;
	kind: "stablecoin" | "wire";
	off: Offramp | null;
	fee: number;
	min: number;
	label: string;
}

export interface Rule {
	id: string;
	c: Corridor;
	from: string | null;
	to: string | null;
	kind: RuleKind;
	title: string;
	src: Source;
	/** Effective date still needs a human to confirm it against the source. */
	verify?: boolean;
	/** Rules pack flag: this block is a policy hold a compliance person can lift
	 *  with a recorded sign-off (VE-OFAC). Only rules from the API carry it. */
	liftedBy?: "sanctions_signoff";
	ev: (p: EffectivePayout, r: Route) => [Outcome, string];
}

export interface RuleResult {
	rule: Rule;
	o: Outcome;
	msg: string;
}

export interface RouteEval {
	route: Route;
	results: RuleResult[];
	compliant: boolean;
	warns: number;
}

export interface Plan {
	iso: string;
	evals: RouteEval[];
	/** The route to use: the engine's pick, or a human override. */
	rec: RouteEval | null;
	engine: RouteEval | null;
	overridden: boolean;
	overrideLost: boolean;
	status: "ready" | "needs_info" | "blocked";
}

export interface Approval {
	who: string;
	actorId?: string;
	at: string;
}

export interface Payment {
	txHash: string;
	offrampRef: string;
	railRef: string;
	railName: string;
	railMode?: "mock" | "bridge" | "blindpay";
}

export interface JournalLine {
	acct: string;
	dr: number | null;
	cr: number | null;
}

export interface Journal {
	id: string;
	lines: JournalLine[];
	route: string;
}

/** Everything a person or the agent changed about one payout. */
export interface Mut {
	approvals: Approval[];
	final?: Status;
	/** As-of date frozen at approval, so an approved plan stops moving. */
	lockedIso?: string;
	lockedSettings?: Settings;
	ack?: boolean;
	edits?: Partial<Invoice>;
	reviewed?: boolean;
	override?: { routeId: string; reason: string; by: string };
	payment?: Payment;
	journal?: Journal;
	license?: { number: string; by: string };
	secCleared?: { by: string; note: string };
	rejectedBy?: string;
	rejectReason?: string;
}

export interface Settings {
	threshold: number;
	cap: number;
	objective: Objective;
	disabled: Record<string, boolean>;
	autonomy: Autonomy;
	requireAck: boolean;
}

export interface AuditEvent {
	seq: number;
	type: string;
	pid: string | null;
	payee: string;
	summary: string;
	time: string;
	payload: string;
	prev: string;
	hash: string;
}

export interface AuditDraft {
	type: string;
	pid?: string | null;
	payee?: string;
	summary: string;
}

export interface ChatCta {
	label: string;
	kind: "open" | "trust" | "inbox";
	pid?: string;
}

export interface AgentMessage {
	role: "agent";
	tools: string[];
	paras: string[];
	bullets: string[];
	cites: string[];
	note: string;
	cta: ChatCta | null;
}

export interface UserMessage {
	role: "user";
	text: string;
}

export type ChatMessage = AgentMessage | UserMessage;

export type ActionKind =
	| "approve"
	| "pay"
	| "reconcile"
	| "email"
	| "fraud"
	| "license"
	| "asof";

export interface AgentAction {
	id: string;
	status: "pending" | "done" | "dismissed";
	kind: ActionKind;
	pid: string | null;
	risk: "Low" | "Medium" | "High";
	title: string;
	why: string;
	cites: string[];
	body?: string;
	license?: string;
	/** For kind 'license': what the compliance person checked, sent with the sign-off. */
	note?: string;
	result?: string;
}

export interface ToastLine {
	head: string;
	body: string;
}

export interface Toast {
	lines: ToastLine[];
	key: number;
}

/** One payout resolved against the current state: data, edits, plan, status. */
export interface PayoutView {
	p: Payout;
	m: Mut;
	plan: Plan;
	status: Status;
}

export interface AppState {
	loaded: boolean;
	loading: boolean;
	day: number;
	selected: string | null;
	mut: Record<string, Mut>;
	events: AuditEvent[];
	toast: Toast | null;
	flashId: string | null;
	tamperSeq: number | null;
	paying: string | null;
	copied: string | null;
	/** File names currently being read by the API (upload skeleton rows). */
	uploading: string[];
	settings: Settings;
	chat: ChatMessage[];
	input: string;
	busy: { tools: string[] } | null;
	actions: AgentAction[];
	actionSeq: number;
	overrideDraft: {
		pid: string;
		routeId: string;
		label: string;
		text: string;
	} | null;
	editDraft: { pid: string; values: Invoice } | null;
	secDraft: { pid: string; cb: boolean; note: string } | null;
	sus: boolean;
	registry: { ponte?: boolean };
	radar: "pending" | "approved" | "rejected";
	verified: Record<string, boolean>;
	replay: { pid: string; fp: string; text: string } | null;
	tour: number | null;
	screeningDemo: boolean;
	reroutes: number;
	autoRuns: number;
}
