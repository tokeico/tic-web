export const PAGE_GUIDES: Record<
	string,
	{
		title: string;
		what: string;
		why: string;
		tryIt: string;
		terms: [string, string][];
	}
> = {
	"/dashboard": {
		title: "The CEO view: what the agents did and what it was worth.",
		what: "Dashboard rolls the whole payment operation into a few numbers: volume paid, savings versus an unnegotiated bank wire, money protected, and where it goes. Agents write the briefing and stream what they are doing.",
		why: "A CEO needs the outcome, not the queue. The day-to-day work (approving, paying, triaging) stays on Inbox and Agent, one click away.",
		tryIt:
			"Ask your agents a question under the briefing, then hover the volume chart to see a month's numbers.",
		terms: [
			[
				"Saved vs bank wire",
				"The fees avoided by routing over stablecoin rails instead of an unnegotiated bank wire (~2.5%), measured against each payout's own wire quote.",
			],
			[
				"Straight-through",
				"Payouts that went from intake to booked without a person editing a field.",
			],
		],
	},
	"/overview": {
		title: "See what needs attention across the payment workflow.",
		what: "Overview summarizes open payouts, approvals and recorded activity. Agent is the main starting point; Inbox holds the individual payments.",
		why: "Teams need to see where a payment is waiting without losing the evidence behind each decision.",
		tryIt:
			"Open a payout that needs review, or start the guided demo. No real money moves.",
		terms: [
			[
				"Payout",
				"An invoice’s payment workflow, from checking its details to approval, simulated payment and bookkeeping.",
			],
		],
	},
	"/app": {
		title: "Fast payments still need careful decisions.",
		what: "Corredor helps teams paying suppliers in Latin America decide how a payment can travel, which rules apply, and who must review it. AI explains; dated rules decide eligibility; a person approves.",
		why: "A fast payment rail does not check every provider’s eligibility, explain a rule change, or close the books. Corredor connects those checks and keeps the evidence behind each recommendation.",
		tryIt:
			"Start the guided demo, or open Inbox and choose the Brazil invoice. Change the date to see why the recommended provider changes. Every provider and payment in this demo is fictional or simulated.",
		terms: [
			[
				"Stablecoin",
				"A digital token designed to track a currency such as the US dollar. It can move on a blockchain, but still needs a way to reach the supplier’s local bank account.",
			],
			[
				"As-of date",
				"The date used to decide which rules apply. It is a demo clock, not the date a payment actually happened.",
			],
		],
	},
	"/inbox": {
		title: "Understand the recommendation before approving.",
		what: "An invoice becomes a proposed payout. Corredor compares ways to send it, checks the rules on the selected date, and shows warnings or blocks with their sources.",
		why: "The cheapest provider is not useful if it is ineligible for the payment. A dated explanation helps a compliance reviewer understand why a route was chosen rather than trusting a black-box answer.",
		tryIt:
			"Open Estúdio Paulista, expand the route comparison, and try Sep 30, Oct 1 and Oct 31. A warning calls for review; a block prevents approval. Approve only after exploring the checks.",
		terms: [
			[
				"Route",
				"The combination of token, blockchain network, conversion provider and local payment method used to reach the supplier.",
			],
			[
				"Off-ramp / VASP",
				"The provider that converts digital assets into local money. VASP means virtual asset service provider; the applicable requirements depend on its activities and country.",
			],
			["Ready", "Ready for a person to review—not already approved or paid."],
		],
	},
	"/agent": {
		title: "Ask why a decision was made.",
		what: "The assistant reads payout data and the rules engine’s results. It can explain a route, show relevant rule IDs, and prepare proposals for a person to confirm.",
		why: "A recommendation is easier to review when someone can ask follow-up questions. The model explains the decision; it cannot approve or send money with a chat command.",
		tryIt:
			"Ask “Explain the route for Estúdio Paulista Design Ltda.” Open the cited rule and compare the answer with the payout panel. Live answers require the local model to be available.",
		terms: [
			[
				"Citation",
				"A rule ID linked to the rule’s source. Check the source and effective date rather than treating the model’s wording as legal advice.",
			],
			[
				"Proposal",
				"An action waiting for human confirmation. Preparing a proposal does not execute it.",
			],
		],
	},
	"/trust": {
		title: "Catch problems before a payment is approved.",
		what: "Try fictional name screening, inspect the simulated regulatory radar, and see which decisions stay with people.",
		why: "A provider can become ineligible when rules change, and an invoice can contain misleading instructions. These checks bring issues to a reviewer instead of silently allowing the payment.",
		tryIt:
			"Run Demo Lumen Trading through the name check, then try Estúdio Paulista. Review the radar’s impact and approve or reject its simulated update. All sandbox names are fictional; it does not clear real payouts.",
		terms: [
			[
				"Name screening",
				"Comparing a payee with listed names and aliases. A possible match needs review; it is not proof that two organizations are the same.",
			],
			[
				"Regulatory radar",
				"A proposed rule or provider-registry update and its estimated effect. Detection is staged here; applying an approved registry update uses the API.",
			],
			[
				"Security hold",
				"A pause on approval while a person investigates a flagged invoice. Text inside an invoice is data, not permission to pay.",
			],
		],
	},
	"/ledger": {
		title: "Connect the payment to the books—and prove what happened.",
		what: "Books brings payment receipts, matched journal entries and the audit trail together. Simulated transaction IDs are demo references, not evidence of a real blockchain transfer.",
		why: "Sending money is not the end of the finance workflow. Teams still need to match the receipt to the invoice, account for fees and exchange rates, and reconstruct who decided what.",
		tryIt:
			"After approving and paying Brazil, reconcile it. Inspect the balanced journal entry, search its receipt, then simulate audit tampering and see verification fail. Undoing the simulation restores the original check.",
		terms: [
			[
				"Reconciliation",
				"Matching the invoice, payment and local delivery references so the same payment is not booked twice.",
			],
			[
				"Ledger / journal entry",
				"The accounting record: what was owed, fees, cash paid and any exchange-rate difference. Debits and credits must balance.",
			],
			[
				"Audit chain",
				"Events linked cryptographically so changing recorded history can be detected. Verification is evidence of consistency, not a guarantee that an input was truthful.",
			],
		],
	},
	"/customize": {
		title: "Set the boundaries before choosing a route.",
		what: "Choose routing preferences, review providers, and inspect the approval threshold and daily cap. These settings guide the deterministic engine.",
		why: "A preference for speed or price must not bypass eligibility checks or approval controls. Keeping policy separate from AI makes those boundaries explicit and testable.",
		tryIt:
			"Compare cheapest, fastest and lowest-warning routing. Disable a provider and inspect the new recommendation. The demo needs two distinct approvals above $50,000 and limits approvals to $150,000 per day.",
		terms: [
			[
				"Approval threshold",
				"The payment size above which a second, different approver is required.",
			],
			[
				"Daily cap",
				"The maximum dollar value that can be approved on the selected day.",
			],
			[
				"Autonomy",
				"How the assistant prepares proposals. It never grants the model a tool that approves or pays.",
			],
		],
	},
};

export const TOUR_WHY: Record<string, string> = {
	"Load four invoices from four countries":
		"The same payment workflow faces different country rules and review needs. These four fictional invoices make those differences visible.",
	"Open the Brazil payout":
		"A reviewer needs more than a green badge: the recommendation should show alternatives, effective dates and the source behind the decision.",
	"Rewind to Sep 30":
		"The correct recommendation depends on when a rule applies. Rewinding lets you inspect the earlier decision rather than judge it using today’s rules.",
	"Oct 1: BR-561-EFX takes effect":
		"A provider that was eligible yesterday may not be eligible today. Corredor rechecks open payouts and names the rule behind the change.",
	"Oct 31: providers that didn’t file drop out":
		"A filing deadline is not an authorization deadline. The demo distinguishes the two and applies Corredor’s non-filer cutoff from Oct 31, not Oct 30.",
	"Back to today, ask the agent":
		"People need understandable reasons, not just machine verdicts. The assistant explains the same data without being allowed to move money.",
	"Try a fictional screening check":
		"Organizations can use aliases. A name check can surface a possible connection for a person to review; it is not an automatic finding of wrongdoing.",
	"Catch an invoice-fraud attempt":
		"A changed bank account plus hidden payment instructions should not become an automatic payment. The staged example shows why invoice text must stay untrusted data.",
	"Regulatory radar":
		"Changes should arrive with an impact analysis, not silently rewrite policy. A person reviews a proposed registry update before it changes routing.",
	"Prove it: the audit chain":
		"An explanation is more useful when the team can reconstruct the sequence of checks, proposals and human decisions.",
	"Try tampering with the evidence":
		"Linking events cryptographically lets a reviewer detect changed history. This simulation tests verification without editing stored events.",
	"Approve Brazil":
		"Review comes before consent. Acknowledging a warning does not remove it, and the assistant cannot approve on your behalf.",
	"Approve Mexico":
		"A larger payment needs a second decision from a different signed-in approver. Invite a colleague from your account page; one account cannot approve twice.",
	"Pay on the simulated rail":
		"Approval and execution are separate steps. This mock payment lets you inspect the receipt without sending real money.",
	"Reconcile and show the matched journal entry":
		"A completed payment still needs an accounting record. Matching references and balancing the journal connects execution to month-end evidence.",
};
