import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { IcBad, IcShieldCheck } from "../components/icons";
import { Act, H1 } from "../components/ui";
import {
	auditQuery,
	offrampsQuery,
	payoutsQuery,
	verifyQuery,
} from "../lib/api";
import { actorOf, describeEvent, eventSubject } from "../lib/audit-view";
import { formatTime } from "../lib/format";
import { st } from "../lib/st";

export const Route = createFileRoute("/audit")({ component: Audit });

function Audit() {
	const events = useQuery(auditQuery).data ?? [];
	const payouts = useQuery(payoutsQuery).data ?? [];
	const offramps = useQuery(offrampsQuery).data ?? [];
	// "Simulate tampering" asks the server to edit one event IN MEMORY and verify (the log itself can't be edited).
	const tamperTarget = Math.min(3, events.length);
	const [tamper, setTamper] = useState<number | undefined>();
	const chk = useQuery(verifyQuery(tamper)).data;
	const ok = chk ? chk.ok : true;
	const cols = "44px 64px 170px minmax(0,1fr) 120px 60px";

	return (
		<main
			style={st(
				"max-width:1440px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:14px",
			)}
		>
			<div
				style={st(
					"display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px",
				)}
			>
				<div
					style={st("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}
				>
					<H1>Audit log</H1>
					<span className={`pill ${ok ? "p-ok" : "p-bad"}`}>
						{ok ? <IcShieldCheck /> : <IcBad />}
						{ok
							? `Chain verified · ${chk?.count ?? events.length} events${chk?.lastSignedSeq ? " · signed" : ""}`
							: `Chain broken at #${chk?.brokenAt}`}
					</span>
				</div>
				<button
					type="button"
					className="btn"
					disabled={events.length === 0}
					onClick={() => setTamper(tamper ? undefined : tamperTarget || 3)}
				>
					{tamper
						? "Undo tamper"
						: `Simulate tampering with #${tamperTarget || 3}`}
				</button>
			</div>
			<p style={st("margin:0;color:#56655f;font-size:14px")}>
				Append-only and hash-chained. Each event’s MAC covers the previous MAC
				plus its payload, so editing any past event breaks verification from
				that point on. Checkpoints are signed with a key an auditor can verify
				with the public half alone. Agent steps, engine steps and human
				decisions are tagged separately.
			</p>
			{events.length === 0 && (
				<div className="card">
					<p style={st("margin:0;color:#56655f")}>
						No events yet. Load the demo invoices to start the chain.
					</p>
				</div>
			)}
			{events.length > 0 && (
				<div
					style={st(
						"background:#ffffff;border:1px solid #d6dfdb;border-radius:8px;overflow-x:auto",
					)}
				>
					<div
						role="table"
						aria-label="Audit events"
						style={st("min-width:880px")}
					>
						<div
							role="row"
							className="ev"
							style={{ ...st("background:#f7f9f8"), gridTemplateColumns: cols }}
						>
							{["#", "Actor", "Event", "Detail", "Hash", "Time"].map((h) => (
								<span key={h} role="columnheader" className="lab">
									{h}
								</span>
							))}
						</div>
						{events.map((e) => (
							<div
								key={e.seq}
								role="row"
								className="ev"
								style={{ gridTemplateColumns: cols }}
							>
								<span role="cell" className="mono" style={st("color:#56655f")}>
									{e.seq}
								</span>
								<span role="cell">
									<Act actor={actorOf(e.type)} />
								</span>
								<span role="cell">
									<span className="chip">{e.type}</span>
								</span>
								<span role="cell" style={st("min-width:0")}>
									<strong style={st("font-weight:600")}>
										{eventSubject(e, payouts)}
									</strong>{" "}
									· {describeEvent(e, offramps)}
								</span>
								<span
									role="cell"
									className="mono"
									style={st("font-size:12.5px;color:#3b4a44")}
								>
									{e.mac.slice(0, 12)}…
								</span>
								<span
									role="cell"
									className="mono"
									style={st("font-size:12.5px;color:#56655f")}
								>
									{formatTime(e.createdAt)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</main>
	);
}
