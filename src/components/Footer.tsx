export default function Footer() {
	return (
		<footer className="site-footer px-4">
			<div className="page-wrap-wide flex flex-col items-start justify-between gap-4 pt-7 pb-10 sm:flex-row sm:items-center">
				<p className="font-body-s m-0 text-[var(--neutral-stone)]">
					Corredor by TOKEISO · made in Miami at the eMerge AI Hackathon
				</p>
				<p className="mono-caption m-0 text-[var(--neutral-stone)]">
					Demo build · rails simulated · rules pack pending compliance review ·
					not legal advice
				</p>
			</div>
		</footer>
	);
}
