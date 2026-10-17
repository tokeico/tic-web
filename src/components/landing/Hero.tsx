import { Button } from "../ui/Button";

export default function Hero() {
	return (
		<section className="relative overflow-clip">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute top-[-260px] left-1/2 w-[1100px] max-w-none -translate-x-1/2"
			>
				<img src="/assets/spotlight.svg" alt="" className="block w-full" />
			</div>

			<div className="page-wrap-wide relative flex flex-col items-center gap-7 pt-16 pb-18 sm:pt-24 sm:pb-18">
				{/* Status · featuring USDT — logo inside the green pill */}
				<div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--status-ready)] py-2 pr-4 pl-3">
					<img
						src="/assets/usdt-logo.svg"
						alt=""
						aria-hidden="true"
						width={18}
						height={18}
						className="h-[18px] w-[18px] shrink-0"
					/>
					<p className="m-0 text-sm leading-[1.3] font-medium text-[var(--status-ready-on)] whitespace-nowrap">
						FEATURING USDT
					</p>
				</div>

				<h1 className="font-display-xl m-0 max-w-[900px] text-center text-[var(--neutral-paper)]">
					Pay Latin America like it&apos;s next door.
				</h1>

				<p className="font-body-l m-0 max-w-[640px] text-center text-[var(--neutral-mist)]">
					Your suppliers get paid in minutes. Every route follows that
					country&apos;s rules as of today, with the reason written down. You
					just approve.
				</p>

				<div className="flex flex-wrap items-center justify-center gap-3">
					<Button label="Come in" href="#route-card" />
					<Button label="How it works" variant="ghost" href="#how-it-works" />
				</div>
			</div>
		</section>
	);
}
