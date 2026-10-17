// Number and date formatting, as in the design: the local amount in its own
// locale with the ISO code after it ("R$ 85.000,00 BRL", "$1,200,000.00 MXN"),
// so pesos can never be mistaken for dollars. Dates read "Oct 17, 2026".

const LOCALE: Record<string, string> = {
	BRL: "pt-BR",
	MXN: "es-MX",
	ARS: "es-AR",
	USD: "en-US",
};

export function formatLocal(amount: number, currency: string): string {
	const n = new Intl.NumberFormat(LOCALE[currency] ?? "en-US", {
		style: "currency",
		currency,
	}).format(amount);
	return currency === "USD" ? n : `${n} ${currency}`;
}

const usd = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});
const usd0 = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export const formatUsd = (n: number) => usd.format(n);
export const formatUsd0 = (n: number) => usd0.format(n);
export const formatNum = (n: number) => num.format(n);

/** "2026-10-17" → "Oct 17, 2026" (UTC, so the viewer's timezone can't shift the day). */
export function formatDate(iso: string): string {
	return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}

/** "09:42" in the viewer's timezone. */
export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export const formatMinutes = (m: number) =>
	m >= 1440 ? `${m / 1440} days` : `${m} min`;
