import { ArrowRightIcon, CheckIcon } from "../ui/Icons";
import { RouteStop } from "../ui/RouteStop";

const CHECKS = [
	{ id: "purpose", label: "Purpose code filled" },
	{ id: "sanctions", label: "Sanctions screen clear" },
	{ id: "sources", label: "Reason written, 3 sources" },
];

export default function RouteCard() {
	return (
		<section id="route-card" className="page-wrap-wide pt-14">
			<div className="flex flex-col gap-6 rounded-[var(--radius-2xl)] border border-solid border-[var(--neutral-line)] bg-[var(--neutral-ink)] p-6 sm:p-8">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="mono-data m-0 text-[var(--neutral-stone)] whitespace-nowrap">
						PAYOUT · ESTÚDIO PAULISTA DESIGN · R$ 85,000
					</p>
					<div className="rounded-[var(--radius-chip)] bg-[var(--brand-yellow)] px-2.5 py-1.5">
						<p className="mono-caption m-0 text-[var(--brand-black)] whitespace-nowrap">
							NEW ROUTE · BCB RES. 561 SINCE OCT 1
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3.5">
					<RouteStop
						className="min-w-[150px] basis-40"
						label="From"
						value="Miami"
					/>
					<ArrowRightIcon className="h-[22px] w-[22px] shrink-0" />
					<RouteStop
						className="min-w-[150px] basis-40"
						label="Coin"
						value="USDC · Base"
					/>
					<ArrowRightIcon className="h-[22px] w-[22px] shrink-0" />
					<RouteStop
						className="min-w-[150px] basis-40"
						label="Provider · updated for you"
						value="Licensed VASP"
						was="eFX provider"
						state="updated"
					/>
					<ArrowRightIcon className="h-[22px] w-[22px] shrink-0" />
					<RouteStop
						className="min-w-[150px] basis-40"
						label="To"
						value="São Paulo · Pix"
					/>
				</div>

				<div className="flex flex-wrap items-center gap-7">
					{CHECKS.map((check) => (
						<div
							key={check.id}
							className="flex items-center gap-2 overflow-clip"
						>
							<CheckIcon className="h-[18px] w-[18px] shrink-0" />
							<p className="font-body-m m-0 text-[var(--neutral-mist)] whitespace-nowrap">
								{check.label}
							</p>
						</div>
					))}
					<p className="font-body-m m-0 text-[var(--neutral-stone)] whitespace-nowrap">
						Ready for your yes
					</p>
				</div>
			</div>
		</section>
	);
}
