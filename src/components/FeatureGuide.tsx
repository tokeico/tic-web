import { PAGE_GUIDES } from "@/domain/demo-guide";

export function FeatureGuide({ pathname }: { pathname: string }) {
	const guide = PAGE_GUIDES[pathname === "/audit" ? "/ledger" : pathname];
	if (!guide) return null;

	return (
		<section
			aria-labelledby="feature-guide-title"
			className={`mx-auto flex ${["/trust", "/ledger", "/audit", "/customize"].includes(pathname) ? "max-w-[1200px]" : "max-w-[1440px]"} flex-col gap-2 px-5 pt-5`}
		>
			<h2 id="feature-guide-title" className="m-0 text-lg font-semibold">
				{guide.title}
			</h2>
			<p className="m-0 max-w-[85ch] text-ash">{guide.what}</p>
			<details
				className="max-w-[85ch] border-b border-edge pb-3"
				open={pathname === "/app"}
			>
				<summary className="cursor-pointer text-sm text-volt">
					Why it matters and what to try
				</summary>
				<p className="mb-2 text-sm text-ash">{guide.why}</p>
				<p className="text-sm text-bone">{guide.tryIt}</p>
				<dl className="m-0 grid gap-2 text-sm">
					{guide.terms.map(([term, meaning]) => (
						<div key={term}>
							<dt className="font-semibold">{term}</dt>
							<dd className="m-0 text-ash">{meaning}</dd>
						</div>
					))}
				</dl>
			</details>
		</section>
	);
}
