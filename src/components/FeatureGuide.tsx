import { PAGE_GUIDES } from "@/domain/demo-guide";
import { PAGE_MAX_W } from "./ui";
import { HelpHint } from "./HelpHint";

export function FeatureGuide({ pathname }: { pathname: string }) {
	const guide = PAGE_GUIDES[pathname === "/audit" ? "/ledger" : pathname];
	if (!guide) return null;
	return (
		<HelpHint label="Explain this screen">
			<strong className="mb-2 block font-semibold">{guide.title}</strong>
			<span className="mb-3 block text-ash">{guide.what}</span>
			<span className="mb-3 block">
				<strong className="font-semibold">Why it matters. </strong>
				{guide.why}
			</span>
			<span className="mb-3 block">
				<strong className="font-semibold">Try it. </strong>
				{guide.tryIt}
			</span>
			{guide.terms.map(([term, meaning]) => (
				<span key={term} className="mb-2 block text-ash">
					<strong className="font-semibold text-bone">{term}: </strong>
					{meaning}
				</span>
			))}
		</HelpHint>
	);
}
