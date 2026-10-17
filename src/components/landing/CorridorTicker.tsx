import { SwapIcon } from "../ui/Icons";

type Corridor = {
	id: string;
	city: string;
};

const CORRIDORS: Corridor[] = [
	{ id: "sp-1", city: "SÃO PAULO" },
	{ id: "mty-1", city: "MONTERREY" },
	{ id: "ba-1", city: "BUENOS AIRES" },
	{ id: "bog-1", city: "BOGOTÁ" },
	{ id: "sp-2", city: "SÃO PAULO" },
	{ id: "mty-2", city: "MONTERREY" },
];

// Duplicated once so the marquee can loop seamlessly.
const LOOP = [
	...CORRIDORS,
	...CORRIDORS.map((c) => ({ ...c, id: `${c.id}-loop` })),
];

function CorridorPair({ city }: { city: string }) {
	return (
		<div className="flex shrink-0 items-center gap-3">
			<p className="font-ticker m-0 text-[var(--brand-black)]">MIAMI</p>
			<SwapIcon className="h-[22px] w-[22px] shrink-0" />
			<p className="font-ticker m-0 text-[var(--brand-black)]">{city}</p>
		</div>
	);
}

export default function CorridorTicker() {
	return (
		<section
			aria-label="Corridors we serve"
			className="ticker bg-[var(--brand-yellow)]"
		>
			<div className="ticker-track">
				{LOOP.map((corridor) => (
					<CorridorPair key={corridor.id} city={corridor.city} />
				))}
			</div>
		</section>
	);
}
