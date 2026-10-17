import { CardStat } from "../ui/Cards";

const STATS = [
	{
		id: "smb",
		figure: "57%",
		body: "of US small businesses bought from overseas suppliers in 2025.",
		source: "PYMNTS Intelligence × Mastercard, 2026",
	},
	{
		id: "mx-trade",
		figure: "$872.8B",
		body: "in US–Mexico trade in 2025, a record. Mexico is the largest US trading partner.",
		source: "FreightWaves",
	},
	{
		id: "miami",
		figure: "$144B",
		body: "in trade through the Miami Customs District in 2024. Brazil is its top partner.",
		source: "Global Miami Magazine",
	},
	{
		id: "wires",
		figure: "1–5 days",
		body: "for a Mexico–US business wire, at 3.2–6.8% all-in.",
		source: "Stabled 2026 LatAm report",
	},
];

export default function WhyNow() {
	return (
		<section id="why-now" className="page-wrap-wide pt-10 pb-18">
			<div className="flex flex-col items-start gap-8">
				<h2 className="font-display-l m-0 max-w-[820px] text-[var(--neutral-paper)]">
					The Americas already do business together.
				</h2>
				<div className="flex w-full flex-col gap-4 sm:flex-row">
					{STATS.map((stat) => (
						<CardStat
							key={stat.id}
							figure={stat.figure}
							body={stat.body}
							source={stat.source}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
