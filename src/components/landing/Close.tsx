import { Button } from "../ui/Button";

export default function Close() {
	return (
		<section className="page-wrap-wide flex flex-col items-center gap-7 pt-18 pb-16">
			<div className="font-display-xl m-0 w-full text-center text-[var(--neutral-paper)]">
				<p className="m-0">Stablecoins fix</p>
				<p className="m-0">the money.</p>
				<p className="m-0">Corredor fixes</p>
				<p className="m-0">everything else.</p>
			</div>
			<Button label="Come in" href="#route-card" />
		</section>
	);
}
