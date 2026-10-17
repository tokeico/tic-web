import { LogoMark } from "../ui/Logo";

export default function WhyCorredor() {
	return (
		<section
			id="why-corredor"
			className="page-wrap-wide flex flex-col gap-12 border-t border-solid border-[var(--neutral-line)] py-18 lg:flex-row lg:items-center"
		>
			<div className="flex flex-1 justify-center">
				<LogoMark size={280} />
			</div>
			<div className="flex w-full shrink-0 flex-col items-start gap-4.5 lg:w-[640px]">
				<p className="eyebrow m-0 text-[var(--brand-yellow)]">Why Corredor</p>
				<h2 className="font-display-l m-0 text-[var(--neutral-paper)]">
					Built to run.
				</h2>
				<p className="font-body-l m-0 text-[var(--neutral-mist)]">
					Paying across borders should feel like sending a text. Whether
					you&apos;re a CFO, a small business owner or a payroll company,
					Corredor makes every payment simple and secure from end to end. We
					connect the US with Latin America first, then the rest of the world.
					To run, you need a form that&apos;s secure and built to last, and you
					need to get there first, in the most efficient way.
				</p>
			</div>
		</section>
	);
}
