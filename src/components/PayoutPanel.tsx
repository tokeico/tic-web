// The payout detail panel: header, approval, routes, rules checklist, memo,
// sanctions screening and extracted fields. Ported from the design's <aside>.

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { payoutsQuery, replayPlan, rulesQuery, settingsQuery } from "#/lib/api";
import type {
	InvoicePatch,
	LocalRail,
	PayoutDetail,
	ReplayResult,
} from "#/lib/contracts";
import { useDemo } from "#/lib/demo-store";
import {
	formatDate,
	formatLocal,
	formatMinutes,
	formatTime,
	formatUsd,
	formatUsd0,
} from "#/lib/format";
import { st } from "#/lib/st";
import { useActions } from "#/lib/use-actions";
import {
	APPROVERS,
	approvalsNeeded,
	approvalsText,
	BANK_LABEL,
	blockerOf,
	byFee,
	CHECK_IC,
	CHECK_LABEL,
	COUNTRY_NAME,
	checklist,
	committedUsd,
	effectiveText,
	FIELD_DEFS,
	RAIL_NAME,
	recommendedEval,
	routeName,
	TYPE_SHORT,
	warnCount,
	wireEval,
} from "#/lib/view";
import {
	IcBad,
	IcChat,
	IcCheck,
	IcClose,
	IcDone,
	IcFields,
	IcNa,
	IcShieldCheck,
	IcWait,
	IcWarn,
} from "./icons";
import { Cc, StatusPill } from "./ui";

const NETWORK = { base: "Base", arbitrum: "Arbitrum", tron: "Tron" } as const;
const TAX_LABEL = {
	BR: "CNPJ",
	MX: "RFC",
	AR: "CUIT",
	VE: "RIF",
	CO: "NIT",
} as const;
const approvedAt = (iso: string) =>
	`${formatDate(iso.slice(0, 10))}, ${formatTime(iso)}`;

interface PanelProps {
	d: PayoutDetail;
	onClose: () => void;
	onAsk: (text: string) => void;
}

export function PayoutPanel({ d, onClose, onAsk }: PanelProps) {
	return (
		<aside
			aria-labelledby="detail-h"
			style={st(
				"flex:1 1 560px;min-width:0;max-width:660px;display:flex;flex-direction:column;gap:14px",
			)}
		>
			<HeaderCard d={d} onClose={onClose} onAsk={onAsk} />
			<ApprovalCard d={d} />
			<RoutesCard d={d} />
			<ChecklistCard d={d} />
			<MemoCard d={d} />
			<ScreeningCard d={d} />
			<FieldsCard d={d} />
		</aside>
	);
}

// ---- Header -------------------------------------------------------------------------

function HeaderCard({ d, onClose, onAsk }: PanelProps) {
	const locked =
		d.approvals.length > 0 ||
		["approved", "paid", "booked", "rejected"].includes(d.status);
	const showEmailAsk =
		d.status === "needs_info" || d.invoice.lowConfidence.length > 0;
	return (
		<div className="card" style={st("gap:10px")}>
			<div
				style={st(
					"display:flex;justify-content:space-between;align-items:flex-start;gap:12px",
				)}
			>
				<div
					style={st("display:flex;flex-direction:column;gap:4px;min-width:0")}
				>
					<div style={st("display:flex;align-items:center;gap:8px")}>
						<Cc country={d.country} />
						<span style={st("font-size:13px;color:#56655f")}>
							{COUNTRY_NAME[d.country]} · {d.invoice.invoiceNumber}
						</span>
					</div>
					<h2
						id="detail-h"
						style={st(
							"margin:0;font-family:'Archivo',sans-serif;font-weight:750;font-stretch:90%;font-size:23px;line-height:1.15",
						)}
					>
						{d.payeeName}
					</h2>
					<div
						style={st(
							"display:flex;align-items:baseline;gap:8px;flex-wrap:wrap",
						)}
					>
						<span
							style={st(
								"font:600 20px/1.2 'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums",
							)}
						>
							{formatLocal(d.amountLocal, d.currency)}
						</span>
						{d.currency !== "USD" && (
							<span
								style={st("color:#56655f;font-variant-numeric:tabular-nums")}
							>
								≈ {formatUsd(d.amountUsd)}
							</span>
						)}
					</div>
				</div>
				<button
					type="button"
					className="btn"
					style={st("min-height:36px;padding:0 10px")}
					onClick={onClose}
					aria-label="Close payout detail"
				>
					<IcClose />
				</button>
			</div>
			<div
				style={st("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}
			>
				<StatusPill status={d.status} />
				<a href="#memo" style={st("font-size:14px")}>
					View memo
				</a>
				{locked && d.plan && (
					<span style={st("font-size:13px;color:#56655f")}>
						Plan locked at approval ({formatDate(d.plan.asOf)})
					</span>
				)}
			</div>
			<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
				<button
					type="button"
					className="btn btn-sm"
					onClick={() => onAsk(`Explain the route for ${d.payeeName}`)}
				>
					<IcChat />
					Ask the agent about this payout
				</button>
				{showEmailAsk && (
					<button
						type="button"
						className="btn btn-sm"
						onClick={() => onAsk(`Draft a vendor email for ${d.payeeName}`)}
					>
						Draft a vendor email with the agent
					</button>
				)}
			</div>
		</div>
	);
}

// ---- Approval, pay, reconcile ------------------------------------------------------------

function ApprovalCard({ d }: { d: PayoutDetail }) {
	const actions = useActions();
	const all = useQuery(payoutsQuery).data ?? [];
	const policy = useQuery(settingsQuery).data?.policy;
	const requireAck = useDemo((s) => s.requireAck);
	const acked = useDemo((s) => !!s.acks[d.id]);
	const copied = useDemo((s) => s.copied);
	const [paying, setPaying] = useState(false);
	const [busy, setBusy] = useState(false);

	const threshold = policy?.secondApproverAboveUsd ?? 50_000;
	const cap = policy?.dailyCapUsd ?? 150_000;
	const need = approvalsNeeded(d.amountUsd, threshold);
	const rec = recommendedEval(d.plan);
	const warns = warnCount(rec);
	const canApprove =
		d.status === "ready" || d.status === "awaiting_second_approver";
	const needAck = canApprove && requireAck && warns > 0;
	const committed =
		committedUsd(all.filter((p) => p.id !== d.id)) +
		(d.approvals.length > 0 && d.status !== "rejected" ? d.amountUsd : 0);
	const overCap =
		canApprove &&
		committedUsd(all.filter((p) => p.id !== d.id)) + d.amountUsd > cap;
	const blockedish = d.status === "blocked" || d.status === "needs_info";

	const refs = d.payment
		? [
				{
					k: "tx",
					label: d.payment.txHash ? "Tx hash" : "Wire ref",
					value: d.payment.txHash ?? d.payment.railRef,
				},
				...(d.payment.offrampRef
					? [{ k: "off", label: "Off-ramp ref", value: d.payment.offrampRef }]
					: []),
				{
					k: "rail",
					label: `${RAIL_NAME[(rec?.route.rail ?? "swift") as LocalRail]} ref`,
					value: d.payment.railRef,
				},
			]
		: [];

	const act = async (fn: () => Promise<unknown>) => {
		setBusy(true);
		try {
			await fn();
		} finally {
			setBusy(false);
		}
	};

	const Approved = () => (
		<>
			{d.approvals.map((a) => (
				<div
					key={a.approver + a.at}
					style={st("display:flex;align-items:center;gap:8px;font-size:14px")}
				>
					<IcDone size={16} stroke="#0b5a4d" />
					Approved by {a.approver} · {approvedAt(a.at)}
				</div>
			))}
		</>
	);

	return (
		<div className="card">
			<div
				style={st(
					"display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap",
				)}
			>
				<h3 style={st("margin:0;font-size:16px")}>Approval</h3>
				<span style={st("font-size:13px;color:#56655f")}>
					Daily cap: {formatUsd0(committed)} of {formatUsd0(cap)}
				</span>
			</div>

			{canApprove && (
				<div style={st("display:flex;flex-direction:column;gap:10px")}>
					<div
						style={st(
							"display:flex;align-items:center;gap:10px;flex-wrap:wrap",
						)}
					>
						<span style={st("font-weight:600")}>
							{approvalsText(d.approvals.length, need)}
						</span>
						<span style={st("font-size:13px;color:#56655f")}>
							{need === 2
								? `Over ${formatUsd0(threshold)}: needs a second, different approver`
								: "One approval needed"}
						</span>
					</div>
					<Approved />
					{needAck && (
						<label className="ack">
							<input
								type="checkbox"
								checked={acked}
								onChange={(e) => actions.setAck(d.id, e.target.checked)}
							/>
							<span>
								I have read the {warns} rule warning{warns > 1 ? "s" : ""} for
								this route and accept {warns > 1 ? "them" : "it"}.
							</span>
						</label>
					)}
					<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
						{APPROVERS.map((who) => (
							<button
								key={who}
								type="button"
								className="btn btn-primary"
								disabled={
									busy ||
									overCap ||
									(needAck && !acked) ||
									d.approvals.some((a) => a.approver === who)
								}
								onClick={() => act(() => actions.approve(d, who))}
							>
								Approve as {who}
							</button>
						))}
						<button
							type="button"
							className="btn btn-danger"
							disabled={busy}
							onClick={() => act(() => actions.reject(d))}
						>
							Reject
						</button>
					</div>
					{overCap && (
						<p style={st("margin:0;color:#922b24;font-size:14px")}>
							Approving this would exceed the daily cap.
						</p>
					)}
				</div>
			)}

			{blockedish && (
				<p style={st("margin:0;color:#922b24;font-size:14px")}>
					Approval is unavailable:{" "}
					{d.status === "needs_info"
						? "required fields are missing. Edit the fields or ask the vendor."
						: "every route is blocked by the rules shown below."}
				</p>
			)}

			{d.status === "rejected" && (
				<p style={st("margin:0;color:#922b24;font-size:14px")}>
					Rejected. Nothing will be paid.
				</p>
			)}

			{d.status === "approved" && (
				<div style={st("display:flex;flex-direction:column;gap:8px")}>
					<Approved />
					<div
						style={st(
							"display:flex;gap:10px;align-items:center;flex-wrap:wrap",
						)}
					>
						<button
							type="button"
							className="btn btn-primary"
							disabled={paying}
							onClick={async () => {
								setPaying(true);
								try {
									await actions.pay(d);
								} finally {
									setPaying(false);
								}
							}}
						>
							{paying
								? "Sending…"
								: `Pay ${formatUsd(d.amountUsd)} via ${routeName(rec?.route)}`}
						</button>
						<span className="pill p-muted">Simulated rail</span>
					</div>
				</div>
			)}

			{(d.status === "paid" || d.status === "booked") && (
				<div style={st("display:flex;flex-direction:column;gap:8px")}>
					{refs.map((f) => (
						<div
							key={f.k}
							style={st(
								"display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:10px;align-items:center",
							)}
						>
							<span className="lab">{f.label}</span>
							<span
								className="mono"
								style={st("font-size:12.5px;overflow-wrap:anywhere")}
							>
								{f.value}
							</span>
							<button
								type="button"
								className="btn btn-sm"
								onClick={() => actions.copy(f.value, d.id + f.k)}
								aria-label={`Copy ${f.label}`}
							>
								{copied === d.id + f.k ? "Copied" : "Copy"}
							</button>
						</div>
					))}
					<div
						style={st(
							"display:flex;gap:10px;align-items:center;flex-wrap:wrap",
						)}
					>
						<span className="pill p-muted">
							Simulated ·{" "}
							{d.payment?.railMode === "mock"
								? "mock rail adapter"
								: `${d.payment?.railMode} sandbox`}
						</span>
						{d.status === "paid" && (
							<button
								type="button"
								className="btn btn-primary"
								disabled={busy}
								onClick={() => act(() => actions.reconcile(d))}
							>
								Reconcile and book
							</button>
						)}
						{d.status === "booked" && (
							<button
								type="button"
								className="btn"
								onClick={() => actions.go("/ledger")}
							>
								Booked · view in ledger
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// ---- Routes ---------------------------------------------------------------------------

function RoutesCard({ d }: { d: PayoutDetail }) {
	const settings = useQuery(settingsQuery).data;
	const [replay, setReplay] = useState<ReplayResult | null>(null);
	const plan = d.plan;
	if (!plan) return null;
	const objective = settings?.objective ?? "cheapest";
	const word = {
		cheapest: "cheapest",
		fastest: "fastest",
		safest: "lowest-warning",
	}[objective];
	return (
		<div className="card">
			<div
				style={st(
					"display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap",
				)}
			>
				<h3 style={st("margin:0;font-size:16px")}>
					Routes as of {formatDate(plan.asOf)}
				</h3>
				<span style={st("font-size:13px;color:#56655f")}>
					Picks the {word} compliant route
				</span>
			</div>
			<div style={st("overflow-x:auto")}>
				<div
					style={st(
						"display:flex;flex-direction:column;gap:6px;min-width:520px",
					)}
				>
					{byFee(plan).map((e) => {
						const r = e.route;
						const isRec = r.id === plan.recommended?.id;
						const block = blockerOf(e);
						const warns = warnCount(e);
						return (
							<div
								key={r.id}
								className={`route${isRec ? " route-rec" : ""}${!e.compliant ? " route-bad" : ""}`}
							>
								<div
									style={st("display:flex;flex-direction:column;min-width:0")}
								>
									<span style={st("font-weight:600;font-size:14px")}>
										{r.kind === "wire"
											? "SWIFT wire"
											: `${r.asset} · ${r.network ? NETWORK[r.network] : ""}`}
									</span>
									<span style={st("font-size:12.5px;color:#56655f")}>
										{r.kind === "wire"
											? "Correspondent bank · SWIFT"
											: `${r.offramp?.name} · ${r.offramp ? TYPE_SHORT[r.offramp.type] : ""} · ${RAIL_NAME[r.rail]}`}
									</span>
									{block && (
										<span
											className="clamp2"
											title={block.message}
											style={st("font-size:12.5px;color:#922b24")}
										>
											{block.message}
										</span>
									)}
								</div>
								<div
									className="mono"
									style={st(
										"display:flex;flex-direction:column;text-align:right",
									)}
								>
									<span style={st("font-size:13.5px")}>
										{r.feePct.toFixed(2)}%
									</span>
									<span style={st("font-size:12px;color:#56655f")}>
										{formatUsd(r.feeUsd)}
									</span>
								</div>
								<span
									className="mono"
									style={st("font-size:13px;text-align:right")}
								>
									{formatMinutes(r.minutes)}
								</span>
								<div
									style={st(
										"display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;align-items:center",
									)}
								>
									{block ? (
										<a
											className="ruleref"
											href={block.source.url}
											target="_blank"
											rel="noopener noreferrer"
											title={`${block.title} · ${block.source.name}`}
											style={st("background:#f8e3e1;color:#922b24")}
										>
											{block.ruleId}
										</a>
									) : (
										<span
											className={`pill ${isRec ? "p-ok" : warns ? "p-warn" : "p-muted"}`}
										>
											{isRec
												? "Recommended"
												: warns
													? "Compliant · warning"
													: "Compliant"}
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
			<div
				style={st(
					"display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-top:10px;border-top:1px solid #e1e8e5",
				)}
			>
				<span className="lab">Decision fingerprint</span>
				<span className="mono" style={st("font-size:12.5px")}>
					{d.fingerprint ?? "—"}
				</span>
				<button
					type="button"
					className="btn btn-sm"
					onClick={async () => {
						setReplay(null);
						setReplay(await replayPlan(d.id, 100));
					}}
				>
					Replay 100×
				</button>
				{replay && (
					<span
						className={`pill ${replay.identical === replay.n && replay.matchesStored ? "p-ok" : "p-bad"}`}
					>
						{replay.identical}/{replay.n} identical · {replay.ms.toFixed(1)} ms
					</span>
				)}
			</div>
		</div>
	);
}

// ---- Rules checklist ----------------------------------------------------------------------

const CHECK_ICON = {
	pass: <IcCheck size={18} />,
	warn: <IcWarn size={18} />,
	block: <IcBad size={18} />,
	fields: <IcFields size={18} />,
	na: <IcNa size={18} />,
	inactive: <IcWait size={18} />,
} as const;

function ChecklistCard({ d }: { d: PayoutDetail }) {
	const rules = useQuery(rulesQuery).data ?? [];
	const plan = d.plan;
	if (!plan) return null;
	const rec = recommendedEval(plan);
	const rows = checklist(d, rules);
	return (
		<div className="card" style={st("gap:4px")}>
			<div
				style={st(
					"display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-bottom:8px",
				)}
			>
				<h3 style={st("margin:0;font-size:16px")}>Rules checklist</h3>
				<span style={st("font-size:13px;color:#56655f")}>
					{rec
						? "For the recommended route"
						: "For the wire (no compliant route)"}
				</span>
			</div>
			{rows.map((r) => (
				<div key={r.id} className="check" id={`rule-${r.id}`}>
					<span className={CHECK_IC[r.kind]} style={st("padding-top:2px")}>
						{CHECK_ICON[r.kind]}
					</span>
					<div
						style={st("display:flex;flex-direction:column;gap:3px;min-width:0")}
					>
						<div
							style={st(
								"display:flex;align-items:center;gap:8px;flex-wrap:wrap",
							)}
						>
							<a
								className="ruleref"
								href={r.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								title={`${r.title} · ${r.sourceName}`}
							>
								{r.id}
							</a>
							<span style={st("font-weight:600;font-size:14px")}>
								{r.title}
							</span>
						</div>
						<span style={st("font-size:14px")}>
							<strong style={st("font-weight:600")}>
								{CHECK_LABEL[r.kind]}.
							</strong>{" "}
							{r.message}
						</span>
						<span style={st("font-size:12.5px;color:#56655f")}>
							Effective {effectiveText(r.from, r.to)} ·{" "}
							<a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">
								{r.sourceName}
							</a>
						</span>
					</div>
				</div>
			))}
		</div>
	);
}

// ---- Memo ------------------------------------------------------------------------------

function MemoCard({ d }: { d: PayoutDetail }) {
	const memo = d.memo;
	if (!memo || !d.plan) return null;
	const target = recommendedEval(d.plan) ?? wireEval(d.plan);
	const inPlan = memo.citedRuleIds.filter((id) =>
		target?.results.some((r) => r.ruleId === id),
	).length;
	const n = memo.citedRuleIds.length;
	return (
		<div className="card" id="memo" style={st("scroll-margin-top:16px")}>
			<div
				style={st(
					"display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap",
				)}
			>
				<h3 style={st("margin:0;font-size:16px")}>Memo</h3>
				<span className="pill p-muted">
					Template memo · the local model writes it live
				</span>
			</div>
			<p style={st("margin:0;font-weight:500")}>{memo.summary}</p>
			<p style={st("margin:0;font-size:14px")}>{memo.routeRationale}</p>
			{memo.warnings.length > 0 && (
				<div style={st("display:flex;flex-direction:column;gap:4px")}>
					<span className="lab">Warnings</span>
					{memo.warnings.map((w) => (
						<span key={w} style={st("font-size:14px;color:#8a4b00")}>
							{w}
						</span>
					))}
				</div>
			)}
			{memo.humanChecks.length > 0 && (
				<div style={st("display:flex;flex-direction:column;gap:4px")}>
					<span className="lab">For a human to check</span>
					{memo.humanChecks.map((h) => (
						<span key={h} style={st("font-size:14px")}>
							{h}
						</span>
					))}
				</div>
			)}
			<div style={st("display:flex;gap:6px;flex-wrap:wrap;align-items:center")}>
				<span className="lab" style={st("margin-right:4px")}>
					Cites
				</span>
				{memo.citedRuleIds.map((id) => (
					<a key={id} className="ruleref" href={`#rule-${id}`}>
						{id}
					</a>
				))}
			</div>
			<div
				style={st(
					"display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#0b5a4d;padding-top:8px;border-top:1px solid #e1e8e5",
				)}
			>
				<span style={{ flex: "none", marginTop: 1 }}>
					<IcShieldCheck size={16} />
				</span>
				<span>
					Citation guard: {n} cited rule{n === 1 ? "" : "s"}, {inPlan} found in
					the engine’s plan. The memo can’t add a rule or change the decision.
				</span>
			</div>
		</div>
	);
}

// ---- Sanctions -------------------------------------------------------------------------

function ScreeningCard({ d }: { d: PayoutDetail }) {
	const actions = useActions();
	const [note, setNote] = useState("");
	const scr = d.plan?.screening;
	if (!scr) return null;
	const review =
		scr.status !== "clear" &&
		d.approvals.length === 0 &&
		["blocked", "needs_info", "draft"].includes(d.status);
	return (
		<div className="card">
			<h3 style={st("margin:0;font-size:16px")}>Sanctions screening</h3>
			<div
				style={st("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}
			>
				<span
					className={`pill ${scr.status === "clear" ? "p-ok" : scr.status === "hit" ? "p-bad" : "p-warn"}`}
				>
					{scr.status === "clear"
						? "Clear"
						: scr.status === "hit"
							? "Hit"
							: "Possible match"}
				</span>
				<span style={st("font-size:14px;color:#3b4a44")}>
					{scr.status === "clear"
						? "No OFAC SDN match above the 0.88 threshold."
						: `OFAC SDN entry “${scr.match}”${scr.score !== undefined ? ` · score ${scr.score.toFixed(2)}` : ""}.`}
				</span>
			</div>
			{review && (
				<div style={st("display:flex;flex-direction:column;gap:8px")}>
					<label className="lab" htmlFor={`scr-${d.id}`}>
						Compliance review note
					</label>
					<input
						id={`scr-${d.id}`}
						className="inp"
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Why this is, or isn't, the same party"
					/>
					<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
						<button
							type="button"
							className="btn btn-sm"
							disabled={!note.trim()}
							onClick={() => actions.reviewScreening(d, "cleared", note.trim())}
						>
							Clear as Maria Lopez
						</button>
						<button
							type="button"
							className="btn btn-danger btn-sm"
							disabled={!note.trim()}
							onClick={() =>
								actions.reviewScreening(d, "confirmed_hit", note.trim())
							}
						>
							Confirm hit
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

// ---- Extracted fields -----------------------------------------------------------------------

type Draft = Record<(typeof FIELD_DEFS)[number]["key"], string>;

function FieldsCard({ d }: { d: PayoutDetail }) {
	const actions = useActions();
	const [draft, setDraft] = useState<Draft | null>(null);
	const [saving, setSaving] = useState(false);
	const inv = d.invoice;
	const editable =
		!draft &&
		d.approvals.length === 0 &&
		[
			"draft",
			"needs_info",
			"blocked",
			"awaiting_second_approver",
			"ready",
		].includes(d.status);
	const isLow = (k: (typeof FIELD_DEFS)[number]) =>
		!!k.low && inv.lowConfidence.includes(k.low);

	const show = (k: (typeof FIELD_DEFS)[number]["key"]): string => {
		switch (k) {
			case "invoiceNumber":
				return inv.invoiceNumber;
			case "payeeTaxId":
				return inv.payeeTaxId
					? `${TAX_LABEL[inv.payeeCountry]} ${inv.payeeTaxId}`
					: "—";
			case "bankId":
				return inv.bankId
					? `${BANK_LABEL[inv.bankId.type]} · ${inv.bankId.value}`
					: "—";
			case "dueDate":
				return inv.dueDate ? formatDate(inv.dueDate) : "—";
			case "purposeCode":
				return (
					inv.purposeCode ??
					(inv.payeeCountry === "BR" ? "Missing" : "Not required")
				);
			case "description":
				return inv.description;
		}
	};

	const start = () =>
		setDraft({
			invoiceNumber: inv.invoiceNumber,
			payeeTaxId: inv.payeeTaxId ?? "",
			bankId: inv.bankId?.value ?? "",
			dueDate: inv.dueDate ?? "",
			purposeCode: inv.purposeCode ?? "",
			description: inv.description,
		});

	const defaultRail: LocalRail =
		inv.payeeCountry === "BR"
			? "pix"
			: inv.payeeCountry === "MX"
				? "spei"
				: inv.payeeCountry === "AR"
					? "cvu"
					: "swift";

	const save = async () => {
		if (!draft) return;
		const v = (s: string) => s.trim();
		const patch: InvoicePatch = {
			invoiceNumber: v(draft.invoiceNumber),
			payeeTaxId: v(draft.payeeTaxId) || null,
			bankId: v(draft.bankId)
				? { type: inv.bankId?.type ?? defaultRail, value: v(draft.bankId) }
				: null,
			dueDate: v(draft.dueDate) || null,
			purposeCode: v(draft.purposeCode) || null,
			description: v(draft.description),
		};
		setSaving(true);
		try {
			await actions.edit(d, patch);
			setDraft(null);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="card">
			<div
				style={st(
					"display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap",
				)}
			>
				<h3 style={st("margin:0;font-size:16px")}>Extracted invoice fields</h3>
				{editable && (
					<button type="button" className="btn btn-sm" onClick={start}>
						Review and edit
					</button>
				)}
			</div>
			{!draft ? (
				<div
					style={st(
						"display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px",
					)}
				>
					{FIELD_DEFS.map((f) => (
						<div key={f.key} className={`field${isLow(f) ? " field-low" : ""}`}>
							<span className="lab">
								{f.label.replace(" (YYYY-MM-DD)", "")}
							</span>
							<span style={st("font-size:14px;overflow-wrap:anywhere")}>
								{show(f.key)}
							</span>
							{isLow(f) && (
								<span
									style={st("font-size:12.5px;color:#8a4b00;font-weight:500")}
								>
									Check this: low extraction confidence
								</span>
							)}
						</div>
					))}
				</div>
			) : (
				<>
					<div
						style={st(
							"display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px",
						)}
					>
						{FIELD_DEFS.map((f) => (
							<label
								key={f.key}
								className={`field${isLow(f) ? " field-low" : ""}`}
							>
								<span className="lab">{f.label}</span>
								<input
									className="inp"
									value={draft[f.key]}
									onChange={(e) =>
										setDraft({ ...draft, [f.key]: e.target.value })
									}
								/>
							</label>
						))}
					</div>
					<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							disabled={saving}
							onClick={save}
						>
							Save and re-plan
						</button>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => setDraft(null)}
						>
							Cancel
						</button>
					</div>
					<span style={st("font-size:12.5px;color:#56655f")}>
						Saving marks the fields as reviewed and re-runs the rules. Try
						clearing the Brazil purpose code: BR-521-FX then asks for it.
					</span>
				</>
			)}
		</div>
	);
}
