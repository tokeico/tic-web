import { type ReactNode, useEffect, useId, useRef } from "react";

export function HelpHint({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	const id = useId();
	const button = useRef<HTMLButtonElement>(null);
	const panel = useRef<HTMLSpanElement>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancel = () => {
		if (timer.current) clearTimeout(timer.current);
	};
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
	const show = () => {
		cancel();
		const anchor = button.current;
		const popup = panel.current;
		if (!anchor || !popup) return;
		const rect = anchor.getBoundingClientRect();
		const width = Math.min(420, window.innerWidth - 24);
		popup.style.width = `${width}px`;
		popup.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
		popup.showPopover();
		popup.style.top = `${Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - popup.getBoundingClientRect().height - 12))}px`;
	};
	const hideLater = () => {
		cancel();
		timer.current = setTimeout(() => {
			if (
				!panel.current?.matches(":hover") &&
				!panel.current?.contains(document.activeElement) &&
				document.activeElement !== button.current
			)
				panel.current?.hidePopover();
		}, 150);
	};

	return (
		<span className="ml-2 inline-flex align-middle">
			<button
				ref={button}
				type="button"
				popoverTarget={id}
				aria-label={label}
				aria-describedby={id}
				className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge-bright bg-transparent text-ash hover:border-volt hover:text-volt"
				onPointerEnter={(event) => {
					if (event.pointerType === "mouse") show();
				}}
				onPointerLeave={hideLater}
				onFocus={(event) => {
					if (event.currentTarget.matches(":focus-visible")) show();
				}}
				onBlur={hideLater}
				onClick={(event) => {
					event.preventDefault();
					show();
				}}
				onKeyDown={(event) => {
					if (
						!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(event.key)
					)
						return;
					event.preventDefault();
					const step = event.key.startsWith("Page") ? 240 : 40;
					panel.current?.scrollBy({
						top: event.key.endsWith("Down") ? step : -step,
					});
				}}
			>
				<svg
					width="15"
					height="15"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 11v6M12 7v1" />
				</svg>
			</button>
			<span
				ref={panel}
				id={id}
				popover="auto"
				role="tooltip"
				onPointerEnter={cancel}
				onPointerLeave={hideLater}
				onBlur={hideLater}
				className="fixed z-50 m-0 max-h-[min(420px,calc(100dvh-24px))] overflow-y-auto rounded-lg border border-edge-bright bg-raise p-4 font-sans text-sm leading-relaxed font-normal text-bone shadow-lg"
				style={{ inset: "auto", textAlign: "left" }}
			>
				{children}
			</span>
		</span>
	);
}
