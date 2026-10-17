import { type ReactNode, useMemo } from "react";
import { ToolArrow } from "@/components/icons";
import { Card, Lab, RuleRef } from "@/components/ui";
import { SUGGESTIONS } from "@/domain/agent";
import { cite } from "@/domain/data";
import { approvedUsd, need, views } from "@/domain/engine";
import { uniq } from "@/domain/format";
import type { AgentAction, AgentMessage, PayoutView } from "@/domain/types";
import { hasMemberApproved } from "@/lib/auth";
import { useStore } from "@/state/store";

const AUTONOMY_LABEL = {
	suggest: "Suggest only",
	prepare: "Prepare for approval",
	auto: "Auto-run low-risk",
};

/**
 * The agent view. Everything the agent wants done lands in the queue on the
 * right, where a person confirms it — the agent has no tool that moves money.
 */
export function AgentPage() {
	const { state: s, go, setInput, ask, startTour, loadDemo } = useStore();
	const pending = s.actions.filter((a) => a.status === "pending");
	const history = s.actions
		.filter((a) => a.status !== "pending")
		.slice(-6)
		.reverse();
	const vs = views(s);

	return (
		<main className="page grid grid-cols-1 items-start gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_var(--rail)]">
			<section
				aria-labelledby="agent-h"
				className="flex min-w-0 flex-col gap-3"
			>
				<div className="flex flex-wrap items-center justify-between gap-2.5">
					<div className="flex flex-col gap-0.5">
						<h1
							id="agent-h"
							className="display m-0"
							style={{
								fontSize: 26,
							}}
						>
							Corredor agent
						</h1>
						<span className="text-ash-dim" style={{ fontSize: 13.5 }}>
							Reads invoices and the engine’s results, explains with sources,
							prepares actions. It has no tool that moves money.
						</span>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{!s.loaded && (
							<button
								type="button"
								className="btn btn-primary btn-sm"
								disabled={s.loading}
								onClick={loadDemo}
							>
								{s.loading ? "Loading invoices..." : "Load demo invoices"}
							</button>
						)}
						<button type="button" className="btn btn-sm" onClick={startTour}>
							Start guided demo
						</button>
						<span className="pill p-neutral">
							{`Autonomy: ${AUTONOMY_LABEL[s.settings.autonomy]}`}
						</span>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => go("trust")}
						>
							Agent permissions
						</button>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => go("customize")}
						>
							Change
						</button>
					</div>
				</div>

				<div className="flex flex-col rounded-lg border border-edge bg-panel">
					<div
						className="flex flex-col-reverse overflow-y-auto"
						// the transcript grows with the viewport instead of a fixed 560px box
						style={{
							maxHeight: "max(360px, calc(100dvh - 420px))",
							minHeight: 320,
						}}
					>
						<div aria-live="polite" className="flex flex-col gap-3.5 p-4">
							{s.chat.map((m) =>
								m.role === "user" ? (
									<div
										key={`user:${m.text}`}
										className="bg-raise text-bone self-end"
										style={{
											maxWidth: "min(78%, 62ch)",
											padding: "10px 14px",
											borderRadius: "12px 12px 2px 12px",
											fontSize: 14.5,
										}}
									>
										{m.text}
									</div>
								) : (
									<AgentBubble
										key={`agent:${m.paras.join("·").slice(0, 80)}`}
										m={m}
									/>
								),
							)}

							{s.busy && (
								<div className="flex items-center gap-2.5">
									<Avatar />
									<div className="flex flex-col gap-1.5">
										<span className="dots" role="status" aria-label="Working">
											<span />
											<span />
											<span />
										</span>
										<div className="flex flex-wrap gap-1.5">
											{s.busy.tools.map((n) => (
												<span key={n} className="tool">
													{n}
												</span>
											))}
										</div>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-2.5 border-t border-edge-soft px-4 py-3">
						{/* phones: one sideways-scrolling row of chips instead of a ten-line stack */}
						<div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
							{SUGGESTIONS.map((label) => (
								<button
									key={label}
									type="button"
									className="sugg whitespace-nowrap sm:whitespace-normal"
									disabled={!!s.busy}
									onClick={() => ask(label)}
								>
									{label}
								</button>
							))}
						</div>
						<form
							className="flex gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								const t = (s.input || "").trim();
								if (t) ask(t);
							}}
						>
							<label htmlFor="chat-in" className="sr-only">
								Message the agent
							</label>
							<input
								id="chat-in"
								className="inp"
								value={s.input}
								onChange={(e) => setInput(e.target.value)}
								placeholder="Ask about a payout, a rule, savings, or what to do next…"
								autoComplete="off"
							/>
							<button
								type="submit"
								className="btn btn-primary flex-none"
								disabled={!!s.busy || !s.input.trim()}
							>
								Send
							</button>
						</form>
						<span className="text-ash-dim" style={{ fontSize: 12 }}>
							Preview: scripted agent over the demo data. In the build this
							calls Claude with read-only tools plus a “propose action” tool
							that feeds the queue.
						</span>
					</div>
				</div>
			</section>

			<aside aria-labelledby="queue-h" className="flex min-w-0 flex-col gap-3">
				<div className="flex items-baseline justify-between gap-2">
					<h2
						id="queue-h"
						className="display m-0"
						style={{
							fontSize: 21,
						}}
					>
						Waiting for you
					</h2>
					<span className="text-ash-dim" style={{ fontSize: 13.5 }}>
						{pending.length ? `${pending.length} to review` : "All clear"}
					</span>
				</div>

				{pending.length === 0 && (
					<Card>
						<p className="m-0 text-ash-dim" style={{ fontSize: 14 }}>
							Nothing waiting. When the agent prepares an action (approve, pay,
							email a vendor, reject a fraud attempt, record a license), it
							lands here. Nothing happens until you confirm it.
						</p>
					</Card>
				)}

				{pending.map((a) => (
					<QueueCard key={a.id} a={a} vs={vs} />
				))}

				{history.length > 0 && (
					<Card style={{ gap: 6 }}>
						<Lab>Recently handled</Lab>
						{history.map((h) => (
							<div
								key={h.id}
								className="flex justify-between gap-2.5 border-t border-edge-soft py-1.5"
								style={{ fontSize: 13.5 }}
							>
								<span className="min-w-0">{h.title}</span>
								<span className="max-w-[55%] text-ash-dim text-right">
									{h.result}
								</span>
							</div>
						))}
					</Card>
				)}
			</aside>
		</main>
	);
}

const Avatar = () => (
	<span
		aria-hidden="true"
		style={{
			flex: "none",
			width: 30,
			height: 30,
			borderRadius: "50%",
			background: "color-mix(in oklab, var(--color-volt) 14%, transparent)",
			color: "var(--color-volt)",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			font: "600 13px/1 var(--font-display)",
		}}
	>
		C
	</span>
);

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SETTLED = ["paid", "booked"];

/**
 * Finds the payouts a reply mentions: invoice numbers (also masked ones such
 * as EP-••••0412) and payee names. A name opens that payee's open payout, or
 * its latest when everything is settled.
 */
function usePayoutLinks(vs: PayoutView[]) {
	return useMemo(() => {
		const byTerm = new Map<string, string>();
		const masked = new Map<string, string>();
		const pick = new Map<string, PayoutView>();
		for (const v of vs) {
			if (v.p.hidden) continue;
			const num = v.p.inv.number;
			byTerm.set(num, v.p.id);
			const [prefix] = num.split("-");
			masked.set(`${prefix}|${num.slice(-4)}`, v.p.id);
			// a payee's open payout wins; among settled ones, the last listed
			const held = pick.get(v.p.payee);
			if (!held || SETTLED.includes(held.status)) pick.set(v.p.payee, v);
		}
		for (const [payee, v] of pick) byTerm.set(payee, v.p.id);
		const terms = [...byTerm.keys()].sort((a, b) => b.length - a.length);
		const re = terms.length
			? new RegExp(
					`(\\b[A-Z]{2,4}-[•*·]+\\d{4}\\b|${terms.map(escapeRe).join("|")})`,
					"g",
				)
			: null;
		const find = (hit: string) => {
			const m = /^([A-Z]{2,4})-[•*·]+(\d{4})$/.exec(hit);
			return m ? masked.get(`${m[1]}|${m[2]}`) : byTerm.get(hit);
		};
		return { re, find };
	}, [vs]);
}

function Linked({
	text,
	links,
}: {
	text: string;
	links: ReturnType<typeof usePayoutLinks>;
}) {
	const { open } = useStore();
	if (!links.re) return <>{text}</>;
	const out: ReactNode[] = [];
	let last = 0;
	for (const hit of text.matchAll(links.re)) {
		const pid = links.find(hit[0]);
		if (!pid || hit.index == null) continue;
		if (hit.index > last) out.push(text.slice(last, hit.index));
		out.push(
			<button
				key={`${hit.index}:${hit[0]}`}
				type="button"
				className="agent-ref"
				title="Open this payout"
				onClick={() => open(pid)}
			>
				{hit[0]}
			</button>,
		);
		last = hit.index + hit[0].length;
	}
	if (last < text.length) out.push(text.slice(last));
	return <>{out}</>;
}

/** Models often inline a list as "… * one. * two." — lift it into real rows. */
function inlineList(t: string) {
	const parts = t.split(/(?:^|\s)\*\s+/);
	if (parts.length < 3) return { lead: t, items: [] as string[] };
	return { lead: parts[0].trim(), items: parts.slice(1).map((x) => x.trim()) };
}

function AgentBubble({ m }: { m: AgentMessage }) {
	const store = useStore();
	const { open, go } = store;
	const cites = uniq(m.cites).map(cite);
	const links = usePayoutLinks(views(store.state));

	return (
		<div
			className="flex items-start gap-2.5"
			style={{ maxWidth: "min(92%, 80ch)" }}
		>
			<Avatar />
			<div
				className="flex min-w-0 flex-col gap-2 border border-edge-soft"
				style={{
					background: "var(--color-head)",
					borderRadius: "2px 12px 12px 12px",
					padding: "12px 14px",
				}}
			>
				{m.tools.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{m.tools.map((n) => (
							<span key={n} className="tool">
								<ToolArrow />
								{n}
							</span>
						))}
					</div>
				)}

				{m.paras.map((t, i) => {
					const { lead, items } = inlineList(t);
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: model paragraphs can repeat
						<div key={i} className="flex flex-col gap-1.5">
							{lead && (
								<p className="m-0" style={{ fontSize: 14.5 }}>
									<Linked text={lead} links={links} />
								</p>
							)}
							{items.length > 0 && (
								<ul
									className="m-0 flex list-disc flex-col gap-1"
									style={{ paddingLeft: 18 }}
								>
									{items.map((x, n) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: positional rows
										<li key={n} style={{ fontSize: 14 }}>
											<Linked text={x} links={links} />
										</li>
									))}
								</ul>
							)}
						</div>
					);
				})}

				{m.bullets.length > 0 && (
					<ul
						className="m-0 flex list-disc flex-col gap-1"
						style={{ paddingLeft: 18 }}
					>
						{m.bullets.map((t, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: positional rows in an append-only list
							<li key={i} style={{ fontSize: 14, whiteSpace: "pre-line" }}>
								<Linked text={t} links={links} />
							</li>
						))}
					</ul>
				)}

				{m.note && (
					<p
						className="m-0 font-medium"
						style={{ fontSize: 13.5, color: "var(--color-volt)" }}
					>
						{m.note}
					</p>
				)}

				{cites.length > 0 && (
					<div className="flex flex-wrap items-center gap-1.5">
						<Lab>Sources</Lab>
						{cites.map((c) => (
							<RuleRef key={c.id} id={c.id} url={c.url} tip={c.tip} />
						))}
					</div>
				)}

				{m.cta && (
					<div>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => {
								if (!m.cta) return;
								if (m.cta.kind === "open" && m.cta.pid) open(m.cta.pid);
								else if (m.cta.kind === "trust") go("trust");
								else go("inbox");
							}}
						>
							{m.cta.label}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

/** One prepared action. Nothing here happens without a person clicking. */
function QueueCard({ a, vs }: { a: AgentAction; vs: PayoutView[] }) {
	const {
		user,
		state: s,
		execAction,
		dismissAction,
		updAction,
		setAck,
		open,
	} = useStore();
	const ACTOR = user.name;
	const COMPLIANCE = user.name;
	const isApprover = ["controller", "approver"].includes(user.role);
	const v = a.pid ? vs.find((x) => x.p.id === a.pid) : undefined;

	let invalid = false;
	if (a.kind === "approve" && v)
		invalid = !(
			v.status === "ready" || v.status === "awaiting_second_approver"
		);
	if (a.kind === "pay" && v) invalid = v.status !== "approved";
	if (a.kind === "reconcile" && v) invalid = v.status !== "paid";
	if (a.kind === "license" && v) invalid = !!v.m.license;
	if (a.kind === "fraud" && v) invalid = !!(v.m.final || v.m.secCleared);
	if (a.kind === "asof") invalid = s.day === 35;

	const cites = uniq(a.cites || []).map(cite);
	const confirmLabel: Record<string, string> = {
		pay: `Confirm payment as ${ACTOR}`,
		reconcile: "Confirm and book",
		asof: "Apply",
		fraud: `Reject as fraud · ${ACTOR}`,
	};
	const isSimple =
		["pay", "reconcile", "asof", "fraud"].includes(a.kind) && !invalid;

	const n = v ? need(v.p, s) : 1;
	const needAck = !!(
		s.settings.requireAck &&
		v?.plan.rec &&
		v.plan.rec.warns > 0
	);
	const overCapNow = !!(
		v &&
		!v.m.final &&
		approvedUsd(s) + v.p.usd > s.settings.cap
	);

	return (
		<Card style={{ gap: 10 }}>
			<div className="flex items-start justify-between gap-2.5">
				<span className="font-semibold" style={{ fontSize: 15 }}>
					{a.title}
				</span>
				<span
					className={
						"pill " +
						(a.risk === "High"
							? "p-bad"
							: a.risk === "Medium"
								? "p-warn"
								: "p-muted")
					}
				>
					{`${a.risk} risk`}
				</span>
			</div>

			<span className="text-ash" style={{ fontSize: 14 }}>
				{a.why}
			</span>

			{cites.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{cites.map((c) => (
						<RuleRef key={c.id} id={c.id} url={c.url} tip={c.tip} />
					))}
				</div>
			)}

			{invalid && (
				<span style={{ fontSize: 14, color: "var(--color-coral)" }}>
					No longer applicable: the payout’s status changed.
				</span>
			)}

			{a.kind === "approve" && !invalid && v && (
				<div className="flex flex-col gap-2">
					<span className="font-medium" style={{ fontSize: 13.5 }}>
						{v.m.approvals.length +
							" of " +
							n +
							" approvals" +
							(v.m.approvals.length
								? ` · ${v.m.approvals.map((x) => x.who).join(", ")}`
								: "")}
					</span>
					{needAck && (
						<label className="ack">
							<input
								type="checkbox"
								checked={!!v.m.ack}
								onChange={(e) => setAck(v.p.id, e.target.checked)}
							/>
							<span>
								{"I have read the rule warning" +
									(v.plan.rec && v.plan.rec.warns > 1 ? "s" : "") +
									" for this route and accept " +
									(v.plan.rec && v.plan.rec.warns > 1 ? "them" : "it") +
									"."}
							</span>
						</label>
					)}
					<div className="flex flex-wrap gap-1.5">
						<button
							type="button"
							className="btn btn-primary btn-sm"
							disabled={
								overCapNow ||
								(needAck && !v.m.ack) ||
								!isApprover ||
								hasMemberApproved(v.m.approvals, user)
							}
							onClick={() => execAction(a.id, user.name)}
						>
							Approve
						</button>
					</div>
				</div>
			)}

			{a.kind === "email" && (
				<div className="flex flex-col gap-2">
					<label className="lab" htmlFor={`body-${a.id}`}>
						Email draft · edit before sending
					</label>
					<textarea
						id={`body-${a.id}`}
						className="inp"
						rows={9}
						value={a.body || ""}
						onChange={(e) => updAction(a.id, { body: e.target.value })}
						style={{ resize: "vertical", fontSize: 13.5, lineHeight: 1.45 }}
					/>
					<div>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={() => execAction(a.id, ACTOR)}
						>
							{`Send as ${ACTOR} (simulated)`}
						</button>
					</div>
				</div>
			)}

			{a.kind === "license" && !invalid && (
				<div className="flex flex-col gap-2">
					<label className="lab" htmlFor={`lic-${a.id}`}>
						OFAC general license number
					</label>
					<input
						id={`lic-${a.id}`}
						className="inp"
						value={a.license || ""}
						onChange={(e) => updAction(a.id, { license: e.target.value })}
						placeholder="From counsel, e.g. GL 57"
					/>
					<label className="lab" htmlFor={`licnote-${a.id}`}>
						What compliance checked
					</label>
					<textarea
						id={`licnote-${a.id}`}
						className="inp"
						rows={2}
						style={{ resize: "vertical", fontSize: 13.5, lineHeight: 1.45 }}
						value={a.note || ""}
						onChange={(e) => updAction(a.id, { note: e.target.value })}
						placeholder="Payee, owners and receiving bank are not blocked persons"
					/>
					<div>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							disabled={
								!(a.license || "").trim() || (a.note || "").trim().length < 5
							}
							onClick={() => execAction(a.id, COMPLIANCE)}
						>
							{`Sign off as ${COMPLIANCE} · Compliance`}
						</button>
					</div>
				</div>
			)}

			{isSimple && (
				<div>
					<button
						type="button"
						className={
							a.kind === "fraud"
								? "btn btn-dangerfill btn-sm"
								: "btn btn-primary btn-sm"
						}
						onClick={() => execAction(a.id, ACTOR)}
					>
						{confirmLabel[a.kind] || "Confirm"}
					</button>
				</div>
			)}

			<div className="flex flex-wrap gap-2">
				{a.pid && (
					<button
						type="button"
						className="btn btn-sm"
						onClick={() => open(a.pid!)}
					>
						Open payout
					</button>
				)}
				<button
					type="button"
					className="btn btn-sm"
					onClick={() => dismissAction(a.id)}
				>
					Dismiss
				</button>
			</div>
		</Card>
	);
}
