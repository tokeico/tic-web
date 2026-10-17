import type { Objective, Payout } from "./types";

export const usd = (n: number) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
		n,
	);

export const usd0 = (n: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(n);

export const num = (n: number) =>
	new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(n);

export const local = (p: Payout) =>
	new Intl.NumberFormat(p.locale, {
		style: "currency",
		currency: p.cur,
	}).format(p.amount) + (p.cur === "USD" ? "" : ` ${p.cur}`);

/** Day 0 of the demo clock is Sep 25, 2026; the slider runs to day 41 (Nov 5). */
export const iso = (day: number) =>
	new Date(Date.UTC(2026, 8, 25 + day)).toISOString().slice(0, 10);

export const fmtDate = (isoDate: string) =>
	new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});

export const mins = (m: number) =>
	m >= 1440 ? `${m / 1440} days` : `${m} min`;

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** FNV-1a, so the demo's hashes and fingerprints are stable without a crypto dep. */
export function h32(s: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return `0000000${h.toString(16)}`.slice(-8);
}

export function h64(s: string): string {
	let o = "";
	for (let i = 0; i < 8; i++) o += h32(`${i}:${s}`);
	return o;
}

export const objWord = (o: Objective) =>
	({ cheapest: "cheapest", fastest: "fastest", safest: "lowest-warning" })[o];

/** Bank identifiers are masked to the last four digits everywhere they are quoted. */
export const last4 = (s: string) => String(s).replace(/\D/g, "").slice(-4);

export const uniq = <T>(a: T[]) => a.filter((x, i) => a.indexOf(x) === i);
