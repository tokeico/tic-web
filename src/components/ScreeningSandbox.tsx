import { useState } from "react";
import { screenDemoName } from "@/lib/api";
import type { DemoScreening } from "@/lib/contracts";
import { useStore } from "@/state/store";
import { Card } from "./ui";

const EXAMPLES = [
	"Demo Lumen Trading",
	"Demo Cobalt Cargo",
	"Estúdio Paulista Design Ltda",
];

export function ScreeningSandbox() {
	const { markScreeningDemo } = useStore();
	const [name, setName] = useState(EXAMPLES[0]);
	const [result, setResult] = useState<{
		name: string;
		screening: DemoScreening;
	} | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	const check = async () => {
		if (busy || !name.trim()) return;
		setBusy(true);
		setError("");
		setResult(null);
		try {
			const screening = await screenDemoName(name.trim());
			setResult({ name: name.trim(), screening });
			markScreeningDemo();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Could not run the check. Try again.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Card>
			<section
				id="screening-demo"
				aria-labelledby="screening-demo-title"
				className="flex flex-col gap-3"
			>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 id="screening-demo-title" className="m-0 text-lg font-semibold">
						Try a name check
					</h2>
					<span className="pill p-warn">
						Fictional list · presentation only
					</span>
				</div>
				<p className="m-0 max-w-[75ch] text-ash">
					Try an alias or type a supplier name. This sandbox uses the real
					matching algorithm with invented organizations, not the OFAC list. It
					cannot clear a payout.
				</p>
				<div
					className="flex flex-wrap gap-2"
					role="group"
					aria-label="Fictional screening examples"
				>
					{EXAMPLES.map((example) => (
						<button
							key={example}
							type="button"
							className="btn btn-sm"
							disabled={busy}
							onClick={() => {
								setName(example);
								setResult(null);
							}}
						>
							{example}
						</button>
					))}
				</div>
				<form
					className="flex flex-wrap items-end gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						void check();
					}}
				>
					<label className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
						<span className="text-sm font-semibold">Supplier or alias</span>
						<input
							className="inp"
							value={name}
							maxLength={200}
							disabled={busy}
							onChange={(event) => {
								setName(event.target.value);
								setResult(null);
							}}
						/>
					</label>
					<button
						type="submit"
						className="btn btn-primary"
						disabled={busy || !name.trim()}
					>
						{busy ? "Checking name..." : "Run fictional check"}
					</button>
				</form>
				{error && (
					<p className="m-0 text-coral" role="alert">
						{error}
					</p>
				)}
				<div role="status" aria-live="polite">
					{result && (
						<div className="flex flex-col gap-1 border-t border-edge pt-3">
							<strong
								className={
									result.screening.status === "clear"
										? "text-jade"
										: "text-amber"
								}
							>
								{result.screening.status === "clear"
									? "No match in the fictional list"
									: result.screening.status === "hit"
										? "Demo match — human review required"
										: "Possible demo match — human review required"}
							</strong>
							<span>
								{result.name}
								{result.screening.match ? ` → ${result.screening.match}` : ""}
							</span>
							{result.screening.score !== undefined && (
								<span className="text-sm text-ash">
									Similarity: {(result.screening.score * 100).toFixed(1)}%
								</span>
							)}
							<span className="text-sm text-ash">
								Simulated evidence only. Normal payout screening still uses the
								separate OFAC snapshot.
							</span>
						</div>
					)}
				</div>
			</section>
		</Card>
	);
}
