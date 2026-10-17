// The frame around every page: header with tabs, the as-of date bar, the
// guided-demo bar and the toast. Ported from the design's header block.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { payoutsQuery, planAll, rulesQuery, settingsQuery } from "#/lib/api";
import { setDemo, useDemo } from "#/lib/demo-store";
import { formatDate } from "#/lib/format";
import { announceReroutes } from "#/lib/reroutes";
import {
	DEMO_TODAY,
	dayToIso,
	isoToDay,
	JUMP_DATES,
	SLIDER_DAYS,
} from "#/lib/search";
import { st } from "#/lib/st";
import { useActions } from "#/lib/use-actions";
import { IcClose, IcSwap } from "./icons";
import { TourBar } from "./TourBar";

const TABS = [
	{ to: "/app", label: "Overview" },
	{ to: "/app/inbox", label: "Inbox" },
	{ to: "/app/agent", label: "Agent" },
	{ to: "/app/trust", label: "Trust & compliance" },
	{ to: "/app/ledger", label: "Ledger" },
	{ to: "/app/audit", label: "Audit" },
	{ to: "/app/customize", label: "Customize" },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
	const { asOf = DEMO_TODAY } = useSearch({ strict: false }) as {
		asOf?: string;
	};
	const actions = useActions();
	const queryClient = useQueryClient();
	const payouts = useQuery(payoutsQuery);
	const settings = useQuery(settingsQuery);
	const rules = useQuery(rulesQuery);
	const pending = useDemo(
		(s) => s.actions.filter((a) => a.status === "pending").length,
	);
	const toast = useDemo((s) => s.toast);

	// Rules in force on the as-of date, for the badge.
	const total = rules.data?.length ?? 0;
	const active = (rules.data ?? []).filter(
		(r) =>
			!(r.effectiveFrom && asOf < r.effectiveFrom) &&
			!(r.effectiveTo && asOf > r.effectiveTo),
	).length;
	const registryV2 = Object.keys(settings.data?.registry ?? {}).length > 0;

	// The slider writes ?asOf=; ~150 ms after it stops, the API re-plans every open payout on that date.
	// Only once the demo invoices are loaded (before that the slider just moves), and only when the
	// server's clock isn't already there.
	const loaded =
		!!payouts.data &&
		payouts.data.length > 0 &&
		payouts.data.every((p) => p.status !== "draft");
	const serverAsOf = settings.data?.asOf;
	const latest = useRef(asOf);
	latest.current = asOf;
	useEffect(() => {
		if (!loaded || !serverAsOf || serverAsOf === asOf) return;
		const t = setTimeout(async () => {
			const before = queryClient.getQueryData(payoutsQuery.queryKey);
			try {
				const res = await planAll(asOf);
				if (latest.current !== asOf) return; // a newer move is already on its way
				announceReroutes(res.reroutes, before);
			} finally {
				await actions.refresh();
			}
		}, 150);
		return () => clearTimeout(t);
	}, [asOf, loaded, serverAsOf, queryClient, actions]);

	const day = Math.min(Math.max(isoToDay(asOf), 0), SLIDER_DAYS - 1);

	return (
		<div
			style={st(
				"min-height:100vh;background:#f3f6f5;color:#13201c;font-family:'IBM Plex Sans',-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.45",
			)}
		>
			<header style={st("background:#ffffff;border-bottom:1px solid #d6dfdb")}>
				<div
					style={st(
						"max-width:1440px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:16px;justify-content:space-between",
					)}
				>
					<div
						style={st(
							"display:flex;align-items:center;gap:18px;flex-wrap:wrap",
						)}
					>
						<div style={st("display:flex;align-items:baseline;gap:10px")}>
							<a
								href="/"
								style={st(
									"font-family:'Archivo',sans-serif;font-weight:800;font-stretch:86%;font-size:26px;letter-spacing:-.01em;color:inherit;text-decoration:none",
								)}
							>
								Corredor
							</a>
							<span className="lab">Payouts · LatAm</span>
						</div>
						<nav
							aria-label="Main"
							style={st("display:flex;gap:2px;flex-wrap:wrap")}
						>
							{TABS.map((t) => (
								<Link
									key={t.to}
									to={t.to}
									search={
										((p: { asOf?: string }) => ({ asOf: p.asOf })) as never
									}
									className="tab"
									activeProps={{ className: "tab tab-on" }}
									activeOptions={{ exact: true }}
									style={{
										display: "inline-flex",
										alignItems: "center",
										textDecoration: "none",
									}}
								>
									{t.to === "/app/agent" && pending > 0
										? `Agent · ${pending}`
										: t.label}
								</Link>
							))}
						</nav>
					</div>
					<div
						style={st("display:flex;gap:8px;flex-wrap:wrap;align-items:center")}
					>
						<span style={st("font-size:13px;color:#3b4a44")}>
							Acting as{" "}
							<strong style={st("font-weight:600")}>Maria Lopez</strong> ·
							Controller
						</span>
						<span className="pill p-neutral">
							{total
								? `Rules pack v1 · ${active} of ${total} active${registryV2 ? " · registry v2" : ""}`
								: "Rules pack v1"}
						</span>
						<span className="pill p-warn">Pending compliance review</span>
						<span className="pill p-muted">
							{settings.data && settings.data.railMode !== "mock"
								? `Rail: ${settings.data.railMode} sandbox`
								: "Rail: simulated"}
						</span>
					</div>
				</div>

				<div style={st("border-top:1px solid #e1e8e5;background:#fbfcfc")}>
					<div
						style={st(
							"max-width:1440px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px",
						)}
					>
						<div
							style={st(
								"display:flex;flex-direction:column;gap:2px;min-width:170px",
							)}
						>
							<label htmlFor="asof" className="lab">
								As-of date
							</label>
							<span
								style={st(
									"font:600 20px/1.1 'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums",
								)}
							>
								{formatDate(asOf)}
							</span>
						</div>
						<div
							style={st(
								"flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:4px",
							)}
						>
							<input
								id="asof"
								type="range"
								min={0}
								max={SLIDER_DAYS - 1}
								step={1}
								value={day}
								onChange={(e) =>
									actions.setAsOf(dayToIso(Number(e.target.value)))
								}
								style={st("width:100%;accent-color:#0e6b5c;height:28px")}
								aria-valuetext={formatDate(asOf)}
							/>
							<div
								style={st(
									"display:flex;justify-content:space-between;font:400 12px/1 'IBM Plex Mono',monospace;color:#56655f",
								)}
							>
								<span>Sep 25</span>
								<span>Nov 5</span>
							</div>
						</div>
						<div
							role="group"
							aria-label="Jump to date"
							style={st("display:flex;gap:6px;flex-wrap:wrap")}
						>
							{JUMP_DATES.map((j) => (
								<button
									key={j.value}
									type="button"
									className={`jump${asOf === j.value ? " jump-on" : ""}`}
									aria-pressed={asOf === j.value}
									onClick={() => actions.setAsOf(j.value)}
								>
									{j.label}
								</button>
							))}
						</div>
					</div>
				</div>
			</header>

			<TourBar />
			{children}

			<div
				aria-live="polite"
				style={st(
					"position:fixed;right:20px;bottom:20px;max-width:440px;z-index:20",
				)}
			>
				{toast && (
					<div
						style={st(
							"background:#13201c;color:#ffffff;border-radius:8px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;box-shadow:0 8px 24px rgba(19,32,28,.25)",
						)}
					>
						<span style={{ flex: "none", marginTop: 2 }}>
							<IcSwap />
						</span>
						<div
							style={st(
								"display:flex;flex-direction:column;gap:4px;min-width:0",
							)}
						>
							{toast.lines.map((l) => (
								<span key={l.head + l.body} style={st("font-size:14px")}>
									<strong style={st("font-weight:600")}>{l.head}</strong>{" "}
									{l.body}
								</span>
							))}
						</div>
						<button
							type="button"
							onClick={() => setDemo({ toast: null })}
							aria-label="Dismiss"
							style={st(
								"border:0;background:transparent;color:#ffffff;padding:2px;min-width:28px;min-height:28px",
							)}
						>
							<IcClose />
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
