import { z } from "zod";

/** The demo clock the slider starts on (PRD §10). */
export const DEMO_TODAY = "2026-10-17";

/** Slider range: Sep 25 → Nov 5, 2026 (the design's 42 stops). */
export const SLIDER_START = Date.UTC(2026, 8, 25);
export const SLIDER_DAYS = 42;

/** The rehearsed rule-change moments. Oct 31, not Oct 30: Oct 30 is still a valid BCB filing day (DECISIONS D22). */
export const JUMP_DATES = [
	{ label: "Sep 30", value: "2026-09-30" },
	{ label: "Oct 1 · Res. 561", value: "2026-10-01" },
	{ label: "Today", value: DEMO_TODAY },
	{ label: "Oct 31 · VASP cutoff", value: "2026-10-31" },
] as const;

/** `?asOf=2026-10-17` on every page: shareable, validated, falls back to the demo date. */
export const rootSearch = z.object({
	asOf: z.iso.date().default(DEMO_TODAY).catch(DEMO_TODAY),
});

/** The inbox also remembers which payout's panel is open. */
export const inboxSearch = rootSearch.extend({
	payout: z.string().optional().catch(undefined),
});

export const dayToIso = (day: number) =>
	new Date(SLIDER_START + day * 86_400_000).toISOString().slice(0, 10);
export const isoToDay = (iso: string) =>
	Math.round((Date.parse(`${iso}T00:00:00Z`) - SLIDER_START) / 86_400_000);
