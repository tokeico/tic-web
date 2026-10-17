import { CardValue } from "../ui/Cards";

const VALUES = [
	{
		id: "confianza",
		word: "Confianza",
		line: "Every payment has a reason.",
		body: "The rule, the date it started and the source, written down for you and your accountant.",
	},
	{
		id: "cercania",
		word: "Cercanía",
		line: "Paid today, not next week.",
		body: "Minutes instead of days, so the studio in São Paulo treats you like a neighbor.",
	},
	{
		id: "calma",
		word: "Calma",
		line: "Nothing moves without you.",
		body: "We read and explain. The rules decide. You approve.",
	},
];

export default function Confianza() {
	return (
		<section id="confianza" className="page-wrap-wide pt-20 pb-10">
			<div className="flex flex-col items-start gap-4">
				<div className="flex flex-col items-start gap-3.5 pb-5">
					<p className="eyebrow m-0 text-[var(--brand-yellow)]">
						Business here runs on confianza
					</p>
					<h2 className="font-display-l m-0 max-w-[1192px] text-[var(--neutral-paper)]">
						Pay on time and you&apos;re family.
					</h2>
				</div>
				<div className="flex w-full flex-col gap-4 sm:flex-row">
					{VALUES.map((value) => (
						<CardValue
							key={value.id}
							word={value.word}
							line={value.line}
							body={value.body}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
