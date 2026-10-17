export default function WeKeepWatch() {
	return (
		<section className="page-wrap-wide py-18">
			<div className="flex flex-col items-center gap-8 rounded-[var(--radius-2xl)] border border-solid border-[var(--brand-yellow)] p-8 sm:p-12 lg:flex-row">
				<div className="flex min-w-0 flex-1 flex-col items-start gap-3.5">
					<p className="eyebrow m-0 text-[var(--brand-yellow)]">
						We keep watch
					</p>
					<h2 className="font-display-l m-0 text-[var(--neutral-paper)]">
						Rules change. Your payments keep flowing.
					</h2>
					<p className="font-body-l m-0 text-[var(--neutral-mist)]">
						When a country updates its rules, you hear it from us first, with
						the new route already found and waiting for your yes.
					</p>
				</div>
				<div className="flex w-full shrink-0 flex-col items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--neutral-graphite)] p-6 lg:w-[440px]">
					<p className="eyebrow m-0 text-[var(--brand-yellow)]">
						A heads-up for Oct 30
					</p>
					<p className="m-0 w-full text-xl leading-[1.35] font-semibold text-[var(--neutral-paper)]">
						Brazil&apos;s provider rules update on Oct 30. 3 of your payouts
						already have a new route ready.
					</p>
					<p className="font-body-s m-0 w-full text-[var(--neutral-stone)]">
						Nothing changes until you approve.
					</p>
				</div>
			</div>
		</section>
	);
}
