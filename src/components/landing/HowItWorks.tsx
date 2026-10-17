import { CardStep } from "../ui/Cards";

const STEPS = [
	{
		id: "drop",
		number: "01",
		title: "Drop an invoice",
		body: "It reads the payee, amount and bank details.",
	},
	{
		id: "rules",
		number: "02",
		title: "It checks today's rules",
		body: "Country by country, plus sanctions, then picks the safe route.",
	},
	{
		id: "approve",
		number: "03",
		title: "You say yes",
		body: "One card: who, how much, the route, the cost and why.",
	},
	{
		id: "book",
		number: "04",
		title: "Paid and booked",
		body: "Matched to the invoice, ready for QuickBooks or NetSuite.",
	},
];

export default function HowItWorks() {
	return (
		<section id="how-it-works" className="page-wrap-wide pt-10 pb-18">
			<div className="flex flex-col items-start gap-8">
				<h2 className="font-display-l m-0 text-[var(--neutral-paper)]">
					How it works
				</h2>
				<div className="flex w-full flex-col gap-4 sm:flex-row">
					{STEPS.map((step) => (
						<CardStep
							key={step.id}
							number={step.number}
							title={step.title}
							body={step.body}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
