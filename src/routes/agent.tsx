import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { IcTool } from "../components/icons";
import { H1, RuleRef } from "../components/ui";
import { SUGGESTIONS, useAgent } from "../lib/agent";
import { payoutsQuery, rulesQuery, settingsQuery } from "../lib/api";
import type { PayoutDetail, Rule } from "../lib/contracts";
import type { AgentAction, AgentMessage } from "../lib/demo-store";
import { setDemo, useDemo } from "../lib/demo-store";
import { st } from "../lib/st";
import { useActions } from "../lib/use-actions";
import {
	APPROVERS,
	approvalsNeeded,
	approvalsText,
	recommendedEval,
	warnCount,
} from "../lib/view";

export const Route = createFileRoute("/agent")({ component: Agent });

const AUTONOMY = {
	suggest: "Suggest only",
	prepare: "Prepare for approval",
	auto: "Auto-run low-risk",
} as const;

function Agent() {
	const actions = useActions();
	const agent = useAgent();
	const chat = useDemo((s) => s.chat);
	const busy = useDemo((s) => s.busy);
	const input = useDemo((s) => s.input);
	const queue = useDemo((s) => s.actions);
	const autonomy = useDemo((s) => s.autonomy);
	const rules = useQuery(rulesQuery).data ?? [];
	const details = useQuery(payoutsQuery).data ?? [];
	const pending = queue.filter((a) => a.status === "pending");
	const history = queue
		.filter((a) => a.status !== "pending")
		.slice(-6)
		.reverse();
	const scroller = useRef<HTMLDivElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll to the newest message when the transcript grows
	useEffect(() => {
		scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
	}, [chat.length, busy]);

	return (
		<main
			style={st(
				"max-width:1440px;margin:0 auto;padding:20px;display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start",
			)}
		>
			<section
				aria-labelledby="agent-h"
				style={st(
					"flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:12px",
				)}
			>
				<div
					style={st(
						"display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px",
					)}
				>
					<div style={st("display:flex;flex-direction:column;gap:2px")}>
						<H1 id="agent-h">Corredor agent</H1>
						<span style={st("font-size:13.5px;color:#56655f")}>
							Reads invoices and the engine’s results, explains with sources,
							prepares actions. It has no tool that moves money.
						</span>
					</div>
					<div
						style={st("display:flex;gap:8px;align-items:center;flex-wrap:wrap")}
					>
						<span className="pill p-neutral">
							Autonomy: {AUTONOMY[autonomy]}
						</span>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => actions.go("/trust")}
						>
							Agent permissions
						</button>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => actions.go("/customize")}
						>
							Change
						</button>
					</div>
				</div>

				<div
					style={st(
						"background:#ffffff;border:1px solid #d6dfdb;border-radius:8px;display:flex;flex-direction:column",
					)}
				>
					<div
						ref={scroller}
						style={st(
							"display:flex;flex-direction:column;max-height:560px;min-height:360px;overflow-y:auto",
						)}
					>
						<div
							aria-live="polite"
							style={st(
								"display:flex;flex-direction:column;gap:14px;padding:16px",
							)}
						>
							{chat.map((m, i) => (
								<Message
									// biome-ignore lint/suspicious/noArrayIndexKey: the transcript is append-only and messages have no id
									key={`${i}-${m.role}`}
									m={m}
									rules={rules}
									onCta={(cta) =>
										cta.kind === "open" && cta.payoutId
											? actions.openPayout(cta.payoutId)
											: actions.go(cta.kind === "trust" ? "/trust" : "/inbox")
									}
								/>
							))}
							{busy && (
								<div style={st("display:flex;gap:10px;align-items:center")}>
									<Avatar />
									<div style={st("display:flex;flex-direction:column;gap:6px")}>
										<span className="dots" role="img" aria-label="Working">
											<span />
											<span />
											<span />
										</span>
										<div style={st("display:flex;gap:6px;flex-wrap:wrap")}>
											{busy.tools.map((n) => (
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
					<div
						style={st(
							"border-top:1px solid #e1e8e5;padding:12px 16px;display:flex;flex-direction:column;gap:10px",
						)}
					>
						<div style={st("display:flex;gap:6px;flex-wrap:wrap")}>
							{SUGGESTIONS.map((label) => (
								<button
									key={label}
									type="button"
									className="sugg"
									disabled={!!busy}
									onClick={() => agent.ask(label)}
								>
									{label}
								</button>
							))}
						</div>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (input.trim()) agent.ask(input.trim());
							}}
							style={st("display:flex;gap:8px")}
						>
							<label htmlFor="chat-in" className="sr-only">
								Message the agent
							</label>
							<input
								id="chat-in"
								className="inp"
								value={input}
								onChange={(e) => agent.setInput(e.target.value)}
								placeholder="Ask about a payout, a rule, savings, or what to do next…"
								autoComplete="off"
							/>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={!!busy || !input.trim()}
							>
								Send
							</button>
						</form>
						<span style={st("font-size:12px;color:#56655f")}>
							Preview: scripted agent over live data. In the full build the
							local model answers with the same read-only tools plus a “propose
							action” tool that feeds this queue.
						</span>
					</div>
				</div>
			</section>

			<aside
				aria-labelledby="queue-h"
				style={st(
					"flex:1 1 380px;min-width:0;max-width:520px;display:flex;flex-direction:column;gap:12px",
				)}
			>
				<div
					style={st(
						"display:flex;align-items:baseline;justify-content:space-between;gap:8px",
					)}
				>
					<h2
						id="queue-h"
						style={st(
							"margin:0;font-family:'Archivo',sans-serif;font-weight:750;font-stretch:90%;font-size:21px",
						)}
					>
						Waiting for you
					</h2>
					<span style={st("font-size:13.5px;color:#56655f")}>
						{pending.length ? `${pending.length} to review` : "All clear"}
					</span>
				</div>
				{pending.length === 0 && (
					<div className="card">
						<p style={st("margin:0;color:#56655f;font-size:14px")}>
							Nothing waiting. When the agent prepares an action (approve, pay,
							email a vendor, reconcile), it lands here. Nothing happens until
							you confirm it.
						</p>
					</div>
				)}
				{pending.map((a) => (
					<QueueCard
						key={a.id}
						a={a}
						d={details.find((p) => p.id === a.payoutId)}
						rules={rules}
					/>
				))}
				{history.length > 0 && (
					<div className="card" style={st("gap:6px")}>
						<span className="lab">Recently handled</span>
						{history.map((h) => (
							<div
								key={h.id}
								style={st(
									"display:flex;justify-content:space-between;gap:10px;font-size:13.5px;padding:6px 0;border-top:1px solid #e1e8e5",
								)}
							>
								<span>{h.title}</span>
								<span style={st("color:#56655f;text-align:right")}>
									{h.result}
								</span>
							</div>
						))}
					</div>
				)}
			</aside>
		</main>
	);
}

const Avatar = () => (
	<span
		aria-hidden="true"
		style={st(
			"flex:none;width:30px;height:30px;border-radius:50%;background:#dcefe9;color:#0b5a4d;display:flex;align-items:center;justify-content:center;font:700 13px/1 'Archivo',sans-serif",
		)}
	>
		C
	</span>
);

const cite = (id: string, rules: Rule[]) => {
	const r = rules.find((x) => x.id === id);
	return {
		id,
		url: r?.source.url ?? "#",
		tip: r ? `${r.title} · ${r.source.name}` : id,
	};
};

function Message({
	m,
	rules,
	onCta,
}: {
	m: AgentMessage;
	rules: Rule[];
	onCta: (c: NonNullable<AgentMessage["cta"]>) => void;
}) {
	if (m.role === "user") {
		return (
			<div
				style={st(
					"align-self:flex-end;max-width:78%;background:#13201c;color:#ffffff;padding:10px 14px;border-radius:12px 12px 2px 12px;font-size:14.5px",
				)}
			>
				{m.text}
			</div>
		);
	}
	const cites = uniq(m.cites ?? []);
	return (
		<div
			style={st("display:flex;gap:10px;align-items:flex-start;max-width:92%")}
		>
			<Avatar />
			<div
				style={st(
					"display:flex;flex-direction:column;gap:8px;min-width:0;background:#f7f9f8;border:1px solid #e1e8e5;border-radius:2px 12px 12px 12px;padding:12px 14px",
				)}
			>
				{!!m.tools?.length && (
					<div style={st("display:flex;gap:6px;flex-wrap:wrap")}>
						{m.tools.map((n) => (
							<span key={n} className="tool">
								<IcTool />
								{n}
							</span>
						))}
					</div>
				)}
				{m.paras?.map((t) => (
					<p key={t} style={st("margin:0;font-size:14.5px")}>
						{t}
					</p>
				))}
				{!!m.bullets?.length && (
					<ul
						style={st(
							"margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px",
						)}
					>
						{m.bullets.map((t) => (
							<li key={t} style={st("font-size:14px;white-space:pre-line")}>
								{t}
							</li>
						))}
					</ul>
				)}
				{m.note && (
					<p
						style={st(
							"margin:0;font-size:13.5px;color:#0b5a4d;font-weight:500",
						)}
					>
						{m.note}
					</p>
				)}
				{cites.length > 0 && (
					<div
						style={st("display:flex;gap:6px;flex-wrap:wrap;align-items:center")}
					>
						<span className="lab">Sources</span>
						{cites.map((id) => {
							const c = cite(id, rules);
							return <RuleRef key={id} id={id} url={c.url} tip={c.tip} />;
						})}
					</div>
				)}
				{m.cta && (
					<div>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() => onCta(m.cta!)}
						>
							{m.cta.label}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

const uniq = <T,>(a: T[]) => a.filter((x, i) => a.indexOf(x) === i);

function QueueCard({
	a,
	d,
	rules,
}: {
	a: AgentAction;
	d: PayoutDetail | undefined;
	rules: Rule[];
}) {
	const agent = useAgent();
	const actions = useActions();
	const settings = useQuery(settingsQuery).data;
	const requireAck = useDemo((s) => s.requireAck);
	const acked = useDemo((s) => (d ? !!s.acks[d.id] : false));

	const status = d?.status;
	const invalid =
		(a.kind === "approve" &&
			!(status === "ready" || status === "awaiting_second_approver")) ||
		(a.kind === "pay" && status !== "approved") ||
		(a.kind === "reconcile" && status !== "paid") ||
		(a.kind === "asof" && a.asOf === actions.asOf);
	const need = d
		? approvalsNeeded(
				d.amountUsd,
				settings?.policy.secondApproverAboveUsd ?? 50_000,
			)
		: 1;
	const warns = warnCount(recommendedEval(d?.plan ?? null));
	const needAck = requireAck && warns > 0;

	return (
		<div className="card" style={st("gap:10px")}>
			<div
				style={st(
					"display:flex;justify-content:space-between;align-items:flex-start;gap:10px",
				)}
			>
				<span style={st("font-weight:600;font-size:15px")}>{a.title}</span>
				<span
					className={`pill ${a.risk === "High" ? "p-bad" : a.risk === "Medium" ? "p-warn" : "p-muted"}`}
				>
					{a.risk} risk
				</span>
			</div>
			<span style={st("font-size:14px;color:#3b4a44")}>{a.why}</span>
			{a.cites.length > 0 && (
				<div style={st("display:flex;gap:6px;flex-wrap:wrap")}>
					{uniq(a.cites).map((id) => {
						const c = cite(id, rules);
						return <RuleRef key={id} id={id} url={c.url} tip={c.tip} />;
					})}
				</div>
			)}
			{invalid && (
				<span style={st("font-size:14px;color:#922b24")}>
					No longer applicable: the payout’s status changed.
				</span>
			)}

			{a.kind === "approve" && !invalid && d && (
				<div style={st("display:flex;flex-direction:column;gap:8px")}>
					<span style={st("font-size:13.5px;font-weight:500")}>
						{approvalsText(d.approvals.length, need)}
						{d.approvals.length
							? ` · ${d.approvals.map((x) => x.approver).join(", ")}`
							: ""}
					</span>
					{needAck && (
						<label className="ack">
							<input
								type="checkbox"
								checked={acked}
								onChange={(e) => actions.setAck(d.id, e.target.checked)}
							/>
							<span>
								I have read the rule warning{warns > 1 ? "s" : ""} for this
								route and accept {warns > 1 ? "them" : "it"}.
							</span>
						</label>
					)}
					<div style={st("display:flex;gap:6px;flex-wrap:wrap")}>
						{APPROVERS.map((who) => (
							<button
								key={who}
								type="button"
								className="btn btn-primary btn-sm"
								disabled={
									(needAck && !acked) ||
									d.approvals.some((x) => x.approver === who)
								}
								onClick={() => agent.exec(a.id, who)}
							>
								Approve as {who}
							</button>
						))}
					</div>
				</div>
			)}

			{a.kind === "email" && (
				<div style={st("display:flex;flex-direction:column;gap:8px")}>
					<label className="lab" htmlFor={`body-${a.id}`}>
						Email draft · edit before sending
					</label>
					<textarea
						id={`body-${a.id}`}
						className="inp"
						rows={9}
						value={a.body ?? ""}
						onChange={(e) =>
							setDemo((s) => ({
								actions: s.actions.map((x) =>
									x.id === a.id ? { ...x, body: e.target.value } : x,
								),
							}))
						}
						style={st("resize:vertical;font-size:13.5px;line-height:1.45")}
					/>
					<div>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={() => agent.exec(a.id, "Maria Lopez")}
						>
							Send as Maria Lopez (simulated)
						</button>
					</div>
				</div>
			)}

			{(a.kind === "pay" || a.kind === "reconcile" || a.kind === "asof") &&
				!invalid && (
					<div>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={() => agent.exec(a.id, "Maria Lopez")}
						>
							{a.kind === "pay"
								? "Confirm payment as Maria Lopez"
								: a.kind === "reconcile"
									? "Confirm and book"
									: "Apply"}
						</button>
					</div>
				)}

			<div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
				{a.payoutId && (
					<button
						type="button"
						className="btn btn-sm"
						onClick={() => actions.openPayout(a.payoutId!)}
					>
						Open payout
					</button>
				)}
				<button
					type="button"
					className="btn btn-sm"
					onClick={() => agent.dismiss(a.id)}
				>
					Dismiss
				</button>
			</div>
		</div>
	);
}
