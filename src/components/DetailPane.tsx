import { useMemo, useState } from "react";
import { OFFRAMP_TYPE_LABEL, RULES } from "@/domain/data";
import { approvedUsd, eff, fingerprint, need, rname } from "@/domain/engine";
import { fmtDate, local, mins, objWord, usd, usd0 } from "@/domain/format";
import { memoFor } from "@/domain/memo";
import type { Invoice, PayoutView, RouteEval } from "@/domain/types";
import { ACTOR, APPROVERS, useStore } from "@/state/store";
import { Chat, CheckCircle, Close, ShieldCheck } from "./icons";
import {
	Card,
	Cc,
	Disclosure,
	Lab,
	OUTCOME_CLS,
	OUTCOME_LABEL,
	OutcomeIcon,
	RuleRef,
	SEC_CLS,
	SecurityIcon,
	StatusPill,
} from "./ui";

const FIELD_DEFS: [keyof Invoice, string][] = [
	["number", "Invoice no."],
	["taxId", "Payee tax ID"],
	["bank", "Bank identifier"],
	["due", "Due date (YYYY-MM-DD)"],
	["purposeCode", "Purpose code"],
	["desc", "Description"],
];

/**
 * The payout detail: security, approval, routes, the rules checklist, the memo,
 * screening and the extracted fields. Every compliance claim on this pane
 * carries a rule id, an effective date and a source link.
 */
export function DetailPane({ v }: { v: PayoutView }) {
	const store = useStore();
	const { state: s, closeDetail, ask } = store;
	const { p, m, plan, status } = v;
	const pe = eff(p, m);
	const locked = !!(m.final || m.lockedIso);
	const st = m.lockedSettings || s.settings;
	const hold = status === "security_hold";
	const showEmailAsk =
		!p.security &&
		(status === "needs_info" || (p.low.length > 0 && !m.reviewed));

	return (
		<aside
			aria-labelledby="detail-h"
			className="flex min-w-0 max-w-[680px] flex-[2_1_460px] flex-col gap-3.5"
		>
			{/* header ---------------------------------------------------------- */}
			<Card style={{ gap: 10 }}>
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 flex-col gap-1">
						<div className="flex items-center gap-2">
							<Cc code={p.c} />
							<span className="text-ash-dim" style={{ fontSize: 13 }}>
								{p.city} · {pe.inv.number}
							</span>
						</div>
						<h2
							id="detail-h"
							className="display m-0"
							style={{
								fontSize: 23,
								lineHeight: 1.15,
							}}
						>
							{p.payee}
						</h2>
						<div className="flex flex-wrap items-baseline gap-2">
							<span
								className="mono"
								style={{
									fontWeight: 600,
									fontSize: 20,
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{local(p)}
							</span>
							{p.cur !== "USD" && (
								<span
									className="text-ash-dim"
									style={{ fontVariantNumeric: "tabular-nums" }}
								>
									{`≈ ${usd(p.usd)}`}
								</span>
							)}
						</div>
					</div>
					<button
						type="button"
						className="btn"
						style={{ minHeight: 36, padding: "0 10px" }}
						onClick={closeDetail}
						aria-label="Close payout detail"
					>
						<Close />
					</button>
				</div>

				<div className="flex flex-wrap items-center gap-2.5">
					<StatusPill status={status} />
					<a href="#memo" style={{ fontSize: 14 }}>
						View memo
					</a>
					{m.lockedIso && (
						<span className="text-ash-dim" style={{ fontSize: 13 }}>
							{`Plan locked at approval (${fmtDate(m.lockedIso)})`}
						</span>
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						className="btn btn-sm"
						onClick={() =>
							ask(
								p.security
									? "Why is the second Estúdio invoice on hold?"
									: `Explain the route for ${p.payee}`,
								true,
							)
						}
					>
						<Chat />
						Ask the agent about this payout
					</button>
					{showEmailAsk && (
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => ask(`Draft a vendor email for ${p.payee}`, true)}
						>
							Draft a vendor email with the agent
						</button>
					)}
				</div>
			</Card>

			{/* The decision first: a hold that gates approval stays visible; the
			    machinery that earned the answer folds behind two bars that carry
			    their answer in the summary, so nothing is more than one click away. */}
			{hold && <SecurityCard v={v} hold={hold} />}
			<SanctionsCard v={v} />
			<ApprovalCard v={v} />
			<MemoCard v={v} />

			<Disclosure
				summary={`Why ${rname(plan.rec)} · ${plan.evals.length} routes · every rule cited`}
			>
				<RoutesCard v={v} locked={locked} objective={st.objective} />
				<RulesChecklistCard v={v} />
			</Disclosure>

			<Disclosure
				summary={`Invoice ${pe.inv.number} · fields & security checks`}
			>
				{!hold && <SecurityCard v={v} hold={hold} />}
				<FieldsCard v={v} locked={locked} />
			</Disclosure>
		</aside>
	);
}

/* ----------------------------------------------------------------- sanctions */

/**
 * Name screening plus the sanctions policy hold (VE-OFAC): the block is
 * lifted only by a compliance sign-off that names the OFAC general license
 * (or rests on "nobody blocked is involved") and what was checked. The agent
 * can't do this; the sign-off is recorded through the API and audited.
 */
function SanctionsCard({ v }: { v: PayoutView }) {
	const { releaseSanctions } = useStore();
	const { p, m, plan } = v;
	const [license, setLicense] = useState("");
	const [note, setNote] = useState("");
	const liftable = useMemo(
		() =>
			new Set(
				RULES.filter((r) => r.liftedBy === "sanctions_signoff").map(
					(r) => r.id,
				),
			),
		[],
	);
	const holdIds = [
		...new Set(
			plan.evals.flatMap((e) =>
				e.results
					.filter((r) => r.o === "block" && liftable.has(r.rule.id))
					.map((r) => r.rule.id),
			),
		),
	];
	const onHold = holdIds.length > 0;
	return (
		<Card>
			<h3 className="m-0" style={{ fontSize: 16 }}>
				Sanctions screening
			</h3>
			<div className="flex flex-wrap items-center gap-2.5">
				<span className={`pill ${onHold ? "p-bad" : "p-ok"}`}>
					{onHold ? "Policy hold" : "Clear"}
				</span>
				<span className="text-ash" style={{ fontSize: 14 }}>
					{onHold
						? holdIds.join(", ") +
							" blocks every route until compliance signs off: company policy, not a country-wide ban."
						: "No OFAC SDN match above the 0.88 threshold."}
				</span>
			</div>
			{m.license && (
				<span style={{ fontSize: 14 }}>
					{"OFAC general license " +
						m.license.number +
						" recorded, signed off by " +
						m.license.by +
						". The hold became a warning that names the sign-off."}
				</span>
			)}
			{onHold && !lockedByHuman(m) && (
				<div
					className="flex flex-col gap-2.5 rounded-md p-3"
					style={{
						border:
							"1px solid color-mix(in oklab, var(--color-coral) 30%, transparent)",
						background:
							"color-mix(in oklab, var(--color-coral) 8%, transparent)",
					}}
				>
					<label htmlFor={`glc-${p.id}`} className="lab">
						OFAC general license relied on (optional, e.g. GL 57)
					</label>
					<input
						id={`glc-${p.id}`}
						className="inp"
						value={license}
						onChange={(e) => setLicense(e.target.value)}
						placeholder="Leave empty if nobody blocked is involved"
					/>
					<label htmlFor={`sanc-${p.id}`} className="lab">
						Compliance sign-off note (what you checked)
					</label>
					<textarea
						id={`sanc-${p.id}`}
						className="inp"
						rows={3}
						style={{ resize: "vertical", fontSize: 13.5, lineHeight: 1.45 }}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Checked the payee, its owners and the receiving bank against the SDN list and the 50% rule."
					/>
					<div>
						<button
							type="button"
							className="btn btn-sm"
							disabled={note.trim().length < 5}
							onClick={() => {
								releaseSanctions(p.id, license.trim(), note.trim());
								setLicense("");
								setNote("");
							}}
						>
							Release hold as Daniel Ortiz · Compliance
						</button>
					</div>
				</div>
			)}
		</Card>
	);
}

const lockedByHuman = (m: PayoutView["m"]) =>
	!!(m.final || m.approvals.length > 0);

/* ------------------------------------------------------------------ security */

function SecurityCard({ v, hold }: { v: PayoutView; hold: boolean }) {
	const { state: s, setSecDraft, clearSecurityHold, rejectFraud } = useStore();
	const { p, m } = v;
	if (!p.security)
		return (
			<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
				Injection scan, bank details and duplicates — all passed.
			</p>
		);
	const checks: { kind: "ok" | "warn" | "bad"; text: string }[] = p.security
		? p.security.findings
			? // Live invoices: exactly what the server's injection scanner found, quoted verbatim.
				[
					...p.security.findings.map((f) => ({
						kind: "bad" as const,
						text: `${f.pattern}: “${f.quote}”`,
					})),
					{
						kind: "warn" as const,
						text: "The invoice text is data: nothing above was followed.",
					},
				]
			: [
					{
						kind: "bad",
						text:
							"Injected instructions found in the PDF (“" +
							p.security.quote +
							"”). Treated as data, not followed.",
					},
					{
						kind: "bad",
						text:
							"Bank details changed: invoice Pix key " +
							p.security.onInvoice +
							", vendor master " +
							p.security.onFile +
							".",
					},
					{
						kind: "warn",
						text:
							"Possible duplicate of " +
							p.security.dupOf +
							": same payee, amount within 0.4%, five days apart.",
					},
				]
		: [
				{
					kind: "ok",
					text: "Injection scan: no instruction-like text in the invoice.",
				},
				{
					kind: "ok",
					text:
						"Bank details match the vendor master" +
						(p.low.includes("bank") && !m.reviewed
							? " (extraction confidence low; confirm before paying)."
							: "."),
				},
				{
					kind: "ok",
					text: "No duplicate invoices for this payee in the last 30 days.",
				},
			];

	const sd =
		s.secDraft && s.secDraft.pid === p.id
			? s.secDraft
			: { pid: p.id, cb: false, note: "" };
	const pillText = hold
		? "Hold · approval frozen"
		: p.security && m.secCleared
			? "Cleared by a person"
			: p.security
				? "Resolved"
				: "All checks passed";

	return (
		<Card>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="m-0" style={{ fontSize: 16 }}>
					Security checks
				</h3>
				<span
					className={`pill ${hold ? "p-bad" : p.security ? "p-warn" : "p-ok"}`}
				>
					{pillText}
				</span>
			</div>

			{checks.map((c) => (
				<div key={c.text} className="secrow">
					<span className={SEC_CLS[c.kind]}>
						<SecurityIcon kind={c.kind} />
					</span>
					<span>{c.text}</span>
				</div>
			))}

			{hold && p.security?.status === "confirmed_suspicious" && (
				<span
					className="font-semibold"
					style={{ fontSize: 14, color: "var(--color-coral)" }}
				>
					Kept on hold as suspicious by a person. Nothing will be paid.
				</span>
			)}

			{hold && p.security?.status !== "confirmed_suspicious" && (
				<div
					className="flex flex-col gap-2.5 rounded-md p-3"
					style={{
						border:
							"1px solid color-mix(in oklab, var(--color-coral) 30%, transparent)",
						background:
							"color-mix(in oklab, var(--color-coral) 8%, transparent)",
					}}
				>
					<span className="font-semibold" style={{ fontSize: 14 }}>
						Approval is frozen until a person resolves this.
					</span>
					<div>
						<button
							type="button"
							className="btn btn-dangerfill btn-sm"
							onClick={() => rejectFraud(p.id)}
						>
							Reject as suspected fraud
						</button>
					</div>
					<Lab>Or verify by callback</Lab>
					<label className="ack">
						<input
							type="checkbox"
							checked={sd.cb}
							onChange={(e) => setSecDraft(p.id, { cb: e.target.checked })}
						/>
						<span>
							I called the vendor on the number in our vendor master, not one on
							this invoice, and they confirmed the new bank details.
						</span>
					</label>
					<label htmlFor="cbnote" className="sr-only">
						Callback note
					</label>
					<input
						id="cbnote"
						className="inp"
						value={sd.note}
						onChange={(e) => setSecDraft(p.id, { note: e.target.value })}
						placeholder="Who confirmed, and when"
					/>
					<div>
						<button
							type="button"
							className="btn btn-sm"
							disabled={!(sd.cb && sd.note.trim().length >= 5)}
							onClick={() => clearSecurityHold(p.id)}
						>
							{`Clear the hold as ${ACTOR}`}
						</button>
					</div>
				</div>
			)}

			{p.security && m.secCleared && (
				<span style={{ fontSize: 14, color: "var(--color-volt)" }}>
					{"Hold cleared by " +
						m.secCleared.by +
						" after a callback: “" +
						m.secCleared.note +
						"”."}
				</span>
			)}
		</Card>
	);
}

/* ----------------------------------------------------------------- approval */

function ApprovalCard({ v }: { v: PayoutView }) {
	const {
		state: s,
		approve,
		reject,
		setAck,
		pay,
		reconcile,
		copy,
		go,
	} = useStore();
	const { p, m, plan, status } = v;
	const rec = plan.rec;
	const n = need(p, s);
	const used = approvedUsd(s);
	const overCap = !m.final && used + p.usd > s.settings.cap;
	const canApprove =
		status === "ready" || status === "awaiting_second_approver";
	const needAck = canApprove && s.settings.requireAck && !!rec && rec.warns > 0;
	const hold = status === "security_hold";
	const isBlockedish = status === "blocked" || status === "needs_info" || hold;

	const refs = m.payment
		? [
				{
					k: "tx",
					label:
						m.payment.txHash.indexOf("UETR") === 0 ? "Wire ref" : "Tx hash",
					value: m.payment.txHash,
				},
				{ k: "off", label: "Off-ramp ref", value: m.payment.offrampRef },
				{
					k: "rail",
					label: `${m.payment.railName} ref`,
					value: m.payment.railRef,
				},
			]
		: [];

	const approvedRow = (a: { who: string; at: string }, i: number) => (
		<div key={i} className="flex items-center gap-2" style={{ fontSize: 14 }}>
			<CheckCircle size={16} color="var(--color-volt)" />
			{`Approved by ${a.who} · ${a.at}`}
		</div>
	);

	return (
		<Card>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="m-0" style={{ fontSize: 16 }}>
					Approval
				</h3>
				<span className="text-ash-dim" style={{ fontSize: 13 }}>
					{`Daily cap: ${usd0(used)} of ${usd0(s.settings.cap)}`}
				</span>
			</div>

			{canApprove && (
				<div className="flex flex-col gap-2.5">
					<div className="flex flex-wrap items-center gap-2.5">
						<span className="font-semibold">
							{m.approvals.length +
								" of " +
								n +
								(n === 1 ? " approval" : " approvals")}
						</span>
						<span className="text-ash-dim" style={{ fontSize: 13 }}>
							{n === 2
								? "Over " +
									usd0(s.settings.threshold) +
									": needs a second, different approver"
								: "One approval needed"}
						</span>
					</div>

					{m.approvals.map(approvedRow)}

					{needAck && (
						<label className="ack">
							<input
								type="checkbox"
								checked={!!m.ack}
								onChange={(e) => setAck(p.id, e.target.checked)}
							/>
							<span>
								{"I have read the " +
									(rec ? rec.warns : 0) +
									" rule warning" +
									(rec && rec.warns > 1 ? "s" : "") +
									" for this route and accept them."}
							</span>
						</label>
					)}

					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className="btn btn-primary"
							disabled={
								overCap ||
								(needAck && !m.ack) ||
								APPROVERS.every((who) => m.approvals.some((a) => a.who === who))
							}
							onClick={() => {
								const who = APPROVERS.find(
									(person) => !m.approvals.some((a) => a.who === person),
								);
								if (who) approve(p.id, who);
							}}
						>
							Approve
						</button>
						<button
							type="button"
							className="btn btn-danger"
							onClick={() => reject(p.id)}
						>
							Reject
						</button>
					</div>

					{overCap && (
						<p
							className="m-0"
							style={{ color: "var(--color-coral)", fontSize: 14 }}
						>
							Approving this would exceed the daily cap.
						</p>
					)}
				</div>
			)}

			{isBlockedish && (
				<p
					className="m-0"
					style={{ color: "var(--color-coral)", fontSize: 14 }}
				>
					{"Approval is unavailable: " +
						(hold
							? "the invoice is on security hold. Resolve it in Security checks above."
							: status === "needs_info"
								? "required fields are missing. Edit the fields or ask the vendor."
								: "every route is blocked by the rules shown below.")}
				</p>
			)}

			{status === "rejected" && (
				<p
					className="m-0"
					style={{ color: "var(--color-coral)", fontSize: 14 }}
				>
					{`${m.rejectReason || "Rejected"}. Nothing will be paid.`}
				</p>
			)}

			{status === "approved" && (
				<div className="flex flex-col gap-2">
					{m.approvals.map(approvedRow)}
					<div className="flex flex-wrap items-center gap-2.5">
						<button
							type="button"
							className="btn btn-primary"
							disabled={s.paying === p.id}
							onClick={() => pay(p.id)}
						>
							{s.paying === p.id
								? "Sending…"
								: `Pay ${usd(p.usd)} via ${rname(rec)}`}
						</button>
						<span className="pill p-muted">Simulated rail</span>
					</div>
				</div>
			)}

			{(status === "paid" || status === "booked") && (
				<div className="flex flex-col gap-2">
					{refs.map((f) => (
						<div
							key={f.k}
							className="grid items-center gap-2.5"
							style={{ gridTemplateColumns: "120px minmax(0,1fr) auto" }}
						>
							<Lab>{f.label}</Lab>
							<span
								className="mono"
								style={{ fontSize: 12.5, overflowWrap: "anywhere" }}
							>
								{f.value}
							</span>
							<button
								type="button"
								className="btn btn-sm"
								onClick={() => copy(f.value, p.id + f.k)}
								aria-label={`Copy ${f.label}`}
							>
								{s.copied === p.id + f.k ? "Copied" : "Copy"}
							</button>
						</div>
					))}
					<div className="flex flex-wrap items-center gap-2.5">
						<span className="pill p-muted">Simulated · mock rail adapter</span>
						{status === "paid" && (
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => reconcile(p.id)}
							>
								Reconcile and book
							</button>
						)}
						{status === "booked" && (
							<button
								type="button"
								className="btn"
								onClick={() => go("ledger")}
							>
								Booked · view in ledger
							</button>
						)}
					</div>
				</div>
			)}
		</Card>
	);
}

/* ------------------------------------------------------------------- routes */

function RoutesCard({
	v,
	locked,
	objective,
}: {
	v: PayoutView;
	locked: boolean;
	objective: "cheapest" | "fastest" | "safest";
}) {
	const {
		state: s,
		startOverride,
		setOverrideText,
		confirmOverride,
		cancelOverride,
		clearOverride,
		replay,
	} = useStore();
	const { p, m, plan, status } = v;
	const rec = plan.rec;
	const fp = fingerprint(plan);
	const od =
		s.overrideDraft && s.overrideDraft.pid === p.id ? s.overrideDraft : null;
	const hasReplay = !!(s.replay && s.replay.pid === p.id && s.replay.fp === fp);

	const routeRow = (e: RouteEval) => {
		const isRec = !!rec && e.route.id === rec.route.id;
		const block = e.results.find((x) => x.o === "block" || x.o === "fields");
		const isOv = isRec && plan.overridden;
		const canUse =
			e.compliant &&
			!isRec &&
			!locked &&
			status !== "rejected" &&
			status !== "security_hold";
		return (
			<div
				key={e.route.id}
				className={
					"route" +
					(isRec ? " route-rec" : "") +
					(!e.compliant ? " route-bad" : "") +
					(isRec && s.flashId === p.id ? " flash" : "")
				}
			>
				<div className="flex min-w-0 flex-col">
					<span className="font-semibold" style={{ fontSize: 14 }}>
						{e.route.kind === "wire"
							? "SWIFT wire"
							: `${e.route.off!.asset} · ${e.route.off!.net}`}
					</span>
					<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
						{e.route.kind === "wire"
							? "Correspondent bank · SWIFT"
							: e.route.off!.name +
								" · " +
								OFFRAMP_TYPE_LABEL[e.route.off!.type] +
								" · " +
								e.route.off!.rail}
					</span>
					{block && (
						<span style={{ fontSize: 12.5, color: "var(--color-coral)" }}>
							{block.msg}
						</span>
					)}
				</div>

				<div className="mono flex flex-col text-right">
					<span style={{ fontSize: 13.5 }}>{`${e.route.fee.toFixed(2)}%`}</span>
					<span className="text-ash-dim" style={{ fontSize: 12 }}>
						{usd((p.usd * e.route.fee) / 100)}
					</span>
				</div>
				<span className="mono text-right" style={{ fontSize: 13 }}>
					{mins(e.route.min)}
				</span>

				<div className="flex flex-wrap items-center justify-end gap-1.5">
					{block ? (
						<a
							className="ruleref"
							href={block.rule.src.url}
							target="_blank"
							rel="noopener"
							title={`${block.rule.title} · ${block.rule.src.name}`}
							style={{
								background:
									"color-mix(in oklab, var(--color-coral) 14%, transparent)",
								color: "var(--color-coral)",
							}}
						>
							{block.rule.id}
						</a>
					) : (
						<span
							className={
								"pill " +
								(isOv
									? "p-warn"
									: isRec
										? "p-ok"
										: e.warns
											? "p-warn"
											: "p-muted")
							}
						>
							{isOv
								? "Human override"
								: isRec
									? "Recommended"
									: e.warns
										? "Compliant · warning"
										: "Compliant"}
						</span>
					)}
					{canUse && (
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => startOverride(p.id, e.route.id, e.route.label)}
						>
							Use this route
						</button>
					)}
				</div>
			</div>
		);
	};

	return (
		<Card>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="m-0" style={{ fontSize: 16 }}>
					{`Routes as of ${fmtDate(plan.iso)}`}
				</h3>
				<span className="text-ash-dim" style={{ fontSize: 13 }}>
					{`Picks the ${objWord(objective)} compliant route`}
				</span>
			</div>

			{plan.overrideLost && !locked && (
				<p
					className="m-0"
					style={{ fontSize: 14, color: "var(--color-amber)" }}
				>
					Your override is no longer compliant on this date, so the engine’s
					pick is shown.
				</p>
			)}

			<div className="overflow-x-auto">
				<div className="flex flex-col gap-1.5" style={{ minWidth: 460 }}>
					{plan.evals.map(routeRow)}
				</div>
			</div>

			{od && (
				<div
					className="flex flex-col gap-2 rounded-md p-3"
					style={{
						border:
							"1px solid color-mix(in oklab, var(--color-amber) 30%, transparent)",
						background:
							"color-mix(in oklab, var(--color-amber) 8%, transparent)",
					}}
				>
					<label
						htmlFor="ovr"
						className="font-semibold"
						style={{ fontSize: 14 }}
					>
						{`Why use ${od.label} instead of the engine’s pick?`}
					</label>
					<input
						id="ovr"
						className="inp"
						value={od.text}
						onChange={(e) => setOverrideText(e.target.value)}
						placeholder="At least 10 characters, saved to the audit log"
					/>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className="btn btn-primary btn-sm"
							disabled={od.text.trim().length < 10}
							onClick={confirmOverride}
						>
							Confirm override
						</button>
						<button
							type="button"
							className="btn btn-sm"
							onClick={cancelOverride}
						>
							Cancel
						</button>
					</div>
					<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
						You can pick any compliant route. Blocked routes stay blocked: code
						decides compliance.
					</span>
				</div>
			)}

			{plan.overridden && !locked && m.override && (
				<div
					className="flex flex-wrap items-center gap-2.5"
					style={{ fontSize: 14 }}
				>
					<span style={{ color: "var(--color-amber)" }}>
						{`Override by ${m.override.by}: “${m.override.reason}”`}
					</span>
					<button
						type="button"
						className="btn btn-sm"
						onClick={() => clearOverride(p.id)}
					>
						Revert to engine pick
					</button>
				</div>
			)}

			<div className="flex flex-wrap items-center gap-2.5 border-t border-edge-soft pt-2.5">
				<Lab>Decision fingerprint</Lab>
				<span className="mono" style={{ fontSize: 12.5 }}>
					{fp}
				</span>
				<button
					type="button"
					className="btn btn-sm"
					onClick={() => replay(p.id)}
				>
					Replay 100×
				</button>
				{hasReplay && <span className="pill p-ok">{s.replay!.text}</span>}
			</div>
		</Card>
	);
}

/* ---------------------------------------------------------- rules checklist */

function RulesChecklistCard({ v }: { v: PayoutView }) {
	const { state: s } = useStore();
	const { plan } = v;
	const rec = plan.rec;
	const target = rec || plan.evals.find((e) => e.route.kind === "wire")!;

	return (
		<Card style={{ gap: 4 }}>
			<div className="flex flex-wrap items-center justify-between gap-2 pb-2">
				<h3 className="m-0" style={{ fontSize: 16 }}>
					Rules checklist
				</h3>
				<span className="text-ash-dim" style={{ fontSize: 13 }}>
					{target === rec
						? plan.overridden
							? "For the route you chose"
							: "For the recommended route"
						: "For the wire (no compliant route)"}
				</span>
			</div>

			{target.results.map((x) => (
				<div key={x.rule.id} className="check" id={`rule-${x.rule.id}`}>
					<span className={OUTCOME_CLS[x.o]} style={{ paddingTop: 2 }}>
						<OutcomeIcon o={x.o} />
					</span>
					<div className="flex min-w-0 flex-col gap-[3px]">
						<div className="flex flex-wrap items-center gap-2">
							<RuleRef
								id={x.rule.id}
								url={x.rule.src.url}
								tip={`${x.rule.title} · ${x.rule.src.name}`}
							/>
							<span className="font-semibold" style={{ fontSize: 14 }}>
								{x.rule.title}
							</span>
						</div>
						<span style={{ fontSize: 14 }}>
							<strong className="font-semibold">{OUTCOME_LABEL[x.o]}.</strong>{" "}
							{x.msg}
						</span>
						<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
							{"Effective " +
								(x.rule.from ? fmtDate(x.rule.from) : "date not set") +
								(x.rule.to ? ` → ${fmtDate(x.rule.to)}` : "") +
								(x.rule.verify
									? s.verified[x.rule.id]
										? " · source reviewed by Daniel Ortiz"
										: " · verify"
									: "") +
								" · "}
							<a href={x.rule.src.url} target="_blank" rel="noopener">
								{x.rule.src.name}
							</a>
						</span>
					</div>
				</div>
			))}
		</Card>
	);
}

/* --------------------------------------------------------------------- memo */

function MemoCard({ v }: { v: PayoutView }) {
	const { state: s } = useStore();
	const memo = memoFor(v, s);

	return (
		<Card id="memo" style={{ scrollMarginTop: 16 }}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="m-0" style={{ fontSize: 16 }}>
					Memo
				</h3>
				<span className="pill p-muted">
					Template memo · the local model writes the live one
				</span>
			</div>
			<p className="m-0 font-medium">{memo.summary}</p>

			<Disclosure summary="Read the full memo — rationale, warnings, human checks">
				<p className="m-0" style={{ fontSize: 14 }}>
					{memo.rationale}
				</p>

				{memo.warnings.length > 0 && (
					<div className="flex flex-col gap-1">
						<Lab>Warnings</Lab>
						{memo.warnings.map((w) => (
							<span
								key={w}
								style={{ fontSize: 14, color: "var(--color-amber)" }}
							>
								{w}
							</span>
						))}
					</div>
				)}

				<div className="flex flex-col gap-1">
					<Lab>For a human to check</Lab>
					{memo.checks.map((h) => (
						<span key={h} style={{ fontSize: 14 }}>
							{h}
						</span>
					))}
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					<Lab className="mr-1">Cites</Lab>
					{memo.cited.map((ci) => (
						<a key={ci.id} className="ruleref" href={ci.href}>
							{ci.id}
						</a>
					))}
				</div>
			</Disclosure>

			<div
				className="flex items-start gap-2 border-t border-edge-soft pt-2"
				style={{ fontSize: 13, color: "var(--color-volt)" }}
			>
				<ShieldCheck size={16} style={{ flex: "none", marginTop: 1 }} />
				<span>{memo.guard}</span>
			</div>
		</Card>
	);
}

/* ------------------------------------------------------------------- fields */

function FieldsCard({ v, locked }: { v: PayoutView; locked: boolean }) {
	const {
		state: s,
		startEdit,
		setEditField,
		saveEdit,
		cancelEdit,
	} = useStore();
	const { p, m, status } = v;
	const pe = eff(p, m);
	const ed = s.editDraft && s.editDraft.pid === p.id ? s.editDraft : null;
	const lowNow = (k: string) => !m.reviewed && p.low.includes(k);
	const canEdit = !ed && !locked && status !== "rejected" && !p.security;

	return (
		<Card>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="m-0" style={{ fontSize: 16 }}>
					Extracted invoice fields
				</h3>
				{canEdit && (
					<button
						type="button"
						className="btn btn-sm"
						onClick={() => startEdit(p.id, { ...pe.inv })}
					>
						Review and edit
					</button>
				)}
				{!!m.reviewed && !ed && (
					<span className="pill p-ok">Reviewed by a person</span>
				)}
			</div>

			{!ed && (
				<div
					className="grid gap-2"
					style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
				>
					{FIELD_DEFS.map(([k, lbl]) => {
						let val = pe.inv[k] as string | null;
						if (k === "due" && val) val = fmtDate(val);
						if (k === "purposeCode" && !val)
							val = p.c === "BR" ? "Missing" : "Not required";
						return (
							<div key={k} className={`field${lowNow(k) ? " field-low" : ""}`}>
								<Lab>{lbl.replace(" (YYYY-MM-DD)", "")}</Lab>
								<span style={{ fontSize: 14, overflowWrap: "anywhere" }}>
									{val}
								</span>
								{lowNow(k) && (
									<span
										className="font-medium"
										style={{ fontSize: 12.5, color: "var(--color-amber)" }}
									>
										{p.security && k === "bank"
											? "Differs from the vendor master"
											: "Check this: low extraction confidence"}
									</span>
								)}
							</div>
						);
					})}
				</div>
			)}

			{ed && (
				<>
					<div
						className="grid gap-2"
						style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
					>
						{FIELD_DEFS.map(([k, lbl]) => (
							<label
								key={k}
								className={`field${lowNow(k) ? " field-low" : ""}`}
							>
								<Lab>{lbl}</Lab>
								<input
									className="inp"
									value={ed.values[k] == null ? "" : (ed.values[k] as string)}
									onChange={(e) => setEditField(k, e.target.value)}
								/>
							</label>
						))}
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={() => saveEdit(p.id)}
						>
							Save and re-plan
						</button>
						<button type="button" className="btn btn-sm" onClick={cancelEdit}>
							Cancel
						</button>
					</div>
					<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
						Saving marks the fields as reviewed and re-runs the rules. Try
						clearing the Brazil purpose code: BR-521-FX then asks for it.
					</span>
				</>
			)}
		</Card>
	);
}
