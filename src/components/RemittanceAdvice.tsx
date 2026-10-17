import { useState } from "react";
import type { PayoutView } from "@/domain/types";
import {
	getRemittance,
	type RemittanceAdvice,
	type RemittanceLanguage,
} from "@/lib/api";
import { useStore } from "@/state/store";
import { Lab } from "./ui";

const LANGS: [RemittanceLanguage, string][] = [
	["pt", "Português"],
	["es", "Español"],
	["en", "English"],
];

/**
 * The remittance advice for a paid payout, in the supplier's language. The API
 * drafts it; nothing is emailed (there is no email provider), so the person
 * copies it into their own email.
 */
export function RemittanceAdvicePanel({ v }: { v: PayoutView }) {
	const { state: s, copy } = useStore();
	const { p } = v;
	const [lang, setLang] = useState<RemittanceLanguage>(
		p.c === "BR" ? "pt" : "es",
	);
	const [advice, setAdvice] = useState<RemittanceAdvice | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = async (next: RemittanceLanguage) => {
		setLang(next);
		setLoading(true);
		setError(null);
		try {
			setAdvice(await getRemittance(p.id, next));
		} catch (e) {
			setAdvice(null);
			setError(e instanceof Error ? e.message : "Couldn’t prepare it.");
		} finally {
			setLoading(false);
		}
	};
	const copyKey = `${p.id}remit`;

	return (
		<div className="flex flex-col gap-2 border-t border-edge-soft pt-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Lab>Remittance advice</Lab>
				<div
					role="group"
					aria-label="Remittance advice language"
					className="flex flex-wrap gap-1.5"
				>
					{LANGS.map(([code, name]) => (
						<button
							key={code}
							type="button"
							className={`jump${lang === code ? " jump-on" : ""}`}
							aria-pressed={lang === code}
							disabled={loading}
							onClick={() => (advice ? load(code) : setLang(code))}
						>
							{name}
						</button>
					))}
				</div>
			</div>
			{!advice && !loading && (
				<div className="flex flex-wrap items-center gap-2.5">
					<button
						type="button"
						className="btn btn-sm"
						onClick={() => load(lang)}
					>
						Prepare remittance advice
					</button>
					<span className="text-ash-dim" style={{ fontSize: 13 }}>
						A payment notice for {p.payee}. Corredor drafts it; you send it.
					</span>
				</div>
			)}
			{loading && (
				<span className="text-ash-dim" style={{ fontSize: 13 }}>
					Preparing…
				</span>
			)}
			{error && (
				<span style={{ fontSize: 13, color: "var(--color-coral)" }}>
					{error}
				</span>
			)}
			{advice && !loading && (
				<div className="flex flex-col gap-2">
					<span className="pill p-warn self-start whitespace-normal rounded-[10px]">
						Prepared for sending · not sent. No email provider is connected.
					</span>
					<div className="field">
						<Lab>Subject</Lab>
						<span style={{ fontSize: 14, overflowWrap: "anywhere" }}>
							{advice.subject}
						</span>
					</div>
					<div className="field">
						<Lab>Message</Lab>
						<span
							style={{
								fontSize: 14,
								whiteSpace: "pre-wrap",
								overflowWrap: "anywhere",
							}}
						>
							{advice.body}
						</span>
					</div>
					<span className="text-ash-dim" style={{ fontSize: 12.5 }}>
						Reference <span className="mono">{advice.reference}</span>
					</span>
					<div>
						<button
							type="button"
							className="btn btn-sm"
							onClick={() =>
								copy(`${advice.subject}\n\n${advice.body}`, copyKey)
							}
						>
							{s.copied === copyKey ? "Copied" : "Copy subject and message"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
