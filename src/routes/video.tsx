import { createFileRoute } from "@tanstack/react-router";

/**
 * The 40 s launch film (built in video/corredor-launch). One player, centred
 * on black, with the lockup above it.
 */
export const Route = createFileRoute("/video")({
	head: () => ({
		meta: [
			{ title: "Corredor · Launch film" },
			{
				name: "description",
				content:
					"Corredor checks each payout route against Latin America's payment rules as of a date, explains why with sources, and a human approves.",
			},
			{ property: "og:video", content: "/media/corredor-launch.mp4" },
			{ property: "og:image", content: "/media/corredor-launch-poster.jpg" },
		],
	}),
	component: VideoPage,
});

function VideoPage() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-black px-4 py-10">
			<a href="/" className="flex items-center gap-3 text-bone no-underline">
				<span className="corredor-mark" aria-hidden="true" />
				<span className="display text-2xl leading-none">Corredor</span>
			</a>
			<video
				className="aspect-video w-full max-w-[1280px] rounded-xl border border-edge bg-black"
				src="/media/corredor-launch.mp4"
				poster="/media/corredor-launch-poster.jpg"
				controls
				playsInline
				preload="metadata"
			>
				<track kind="captions" />
			</video>
			<p className="font-mono text-xs text-ash-dim">
				Demo · simulated rail · fictional payees · rules pending compliance
				review
			</p>
		</main>
	);
}
