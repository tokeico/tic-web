import { AlertIcon, CheckIcon, CloseIcon } from "./Icons";

export type StatusValue = "ready" | "needs-info" | "blocked";

type StatusProps = {
	status?: StatusValue;
	label?: string;
	className?: string;
};

/**
 * Status (Figma 20:93). Status only — always an icon plus text.
 * Yellow is never a status.
 */
export function Status({
	status = "ready",
	label = "Ready",
	className,
}: StatusProps) {
	if (status === "needs-info") {
		return (
			<div
				className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--status-needs-info)] py-2 pr-4 pl-3 ${className ?? ""}`}
			>
				<AlertIcon className="h-4 w-4 shrink-0" />
				<p className="m-0 text-sm leading-[1.3] font-medium text-[var(--status-needs-info-on)] whitespace-nowrap">
					{label}
				</p>
			</div>
		);
	}
	if (status === "blocked") {
		return (
			<div
				className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--status-blocked)] py-2 pr-4 pl-3 ${className ?? ""}`}
			>
				<CloseIcon className="h-4 w-4 shrink-0" />
				<p className="m-0 text-sm leading-[1.3] font-medium text-[var(--status-blocked-on)] whitespace-nowrap">
					{label}
				</p>
			</div>
		);
	}
	return (
		<div
			className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--status-ready)] py-2 pr-4 pl-3 ${className ?? ""}`}
		>
			<CheckIcon className="h-4 w-4 shrink-0" />
			<p className="m-0 text-sm leading-[1.3] font-medium text-[var(--status-ready-on)] whitespace-nowrap">
				{label}
			</p>
		</div>
	);
}
