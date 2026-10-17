import { useState } from "react";
import type { ManualInvoice } from "@/lib/api";
import type { Country, LocalRail } from "@/lib/contracts";
import { useStore } from "@/state/store";
import { Card, Lab } from "./ui";

const COUNTRIES: [Country, string][] = [
	["BR", "Brazil"],
	["MX", "Mexico"],
	["AR", "Argentina"],
	["CO", "Colombia"],
	["VE", "Venezuela"],
];
const CURRENCIES = ["BRL", "MXN", "ARS", "USD"];
const RAILS: [LocalRail, string][] = [
	["pix", "Pix key"],
	["spei", "CLABE (SPEI)"],
	["cvu", "CVU / CBU"],
	["pse", "PSE account"],
	["swift", "SWIFT / IBAN"],
];
const DEFAULTS: Record<Country, { currency: string; rail: LocalRail }> = {
	BR: { currency: "BRL", rail: "pix" },
	MX: { currency: "MXN", rail: "spei" },
	AR: { currency: "ARS", rail: "cvu" },
	CO: { currency: "USD", rail: "pse" },
	VE: { currency: "USD", rail: "swift" },
};
const TAX_ID: Record<Country, string> = {
	BR: "CNPJ",
	MX: "RFC",
	AR: "CUIT",
	CO: "NIT",
	VE: "RIF",
};

/** "85.000,00", "85,000.00" and "85000" all read as 85000: a separator followed by
 *  one or two digits is the decimal point, any other separator groups thousands. */
function parseAmount(raw: string): number {
	const t = raw.replace(/[^\d.,]/g, "");
	if (!t) return Number.NaN;
	const sep = Math.max(t.lastIndexOf("."), t.lastIndexOf(","));
	const decimals = sep === -1 ? 0 : t.length - sep - 1;
	if (sep !== -1 && decimals >= 1 && decimals <= 2)
		return Number(
			`${t.slice(0, sep).replace(/[.,]/g, "")}.${t.slice(sep + 1)}`,
		);
	return Number(t.replace(/[.,]/g, ""));
}

interface Draft {
	invoiceNumber: string;
	payeeName: string;
	payeeCountry: Country;
	payeeTaxId: string;
	amount: string;
	currency: string;
	dueDate: string;
	bankType: LocalRail;
	bankValue: string;
	description: string;
	purposeCode: string;
}

const EMPTY: Draft = {
	invoiceNumber: "",
	payeeName: "",
	payeeCountry: "BR",
	payeeTaxId: "",
	amount: "",
	currency: "BRL",
	dueDate: "",
	bankType: "pix",
	bankValue: "",
	description: "",
	purposeCode: "",
};

/**
 * Typed-in invoice entry, for when the PDF reader (the local model) is down
 * or there is no PDF. The API plans it exactly like an uploaded invoice, but
 * no injection scan or duplicate-PDF check runs, and the payout says so.
 */
export function ManualInvoiceForm() {
	const { state: s, closeManual, submitManual } = useStore();
	const [d, setD] = useState<Draft>(EMPTY);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const reason = s.manualEntry?.reason ?? null;
	const set = <K extends keyof Draft>(k: K, val: Draft[K]) =>
		setD((cur) => ({ ...cur, [k]: val }));
	const setCountry = (c: Country) =>
		setD((cur) => ({
			...cur,
			payeeCountry: c,
			currency: DEFAULTS[c].currency,
			bankType: DEFAULTS[c].rail,
		}));

	const amount = parseAmount(d.amount);
	const missing = [
		!d.invoiceNumber.trim() && "invoice number",
		!d.payeeName.trim() && "supplier name",
		!(amount > 0) && "amount",
	].filter(Boolean) as string[];

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (missing.length || busy) return;
		setBusy(true);
		setError(null);
		const body: ManualInvoice = {
			invoiceNumber: d.invoiceNumber.trim(),
			payeeName: d.payeeName.trim(),
			payeeCountry: d.payeeCountry,
			payeeTaxId: d.payeeTaxId.trim() || null,
			amount,
			currency: d.currency,
			dueDate: d.dueDate || null,
			bankId: d.bankValue.trim()
				? { type: d.bankType, value: d.bankValue.trim() }
				: null,
			description: d.description.trim(),
			purposeCode: d.purposeCode.trim() || null,
		};
		const err = await submitManual(body);
		setBusy(false);
		if (err) setError(err);
		else setD(EMPTY);
	};

	const field = (
		id: keyof Draft,
		label: string,
		input: React.ReactNode,
		wide = false,
	) => (
		<label
			htmlFor={`man-${id}`}
			className={`flex flex-col gap-1${wide ? " sm:col-span-2" : ""}`}
		>
			<Lab>{label}</Lab>
			{input}
		</label>
	);

	return (
		<Card>
			<form className="flex flex-col gap-3" onSubmit={submit}>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="m-0" style={{ fontSize: 17 }}>
						Enter invoice by hand
					</h2>
					<button type="button" className="btn btn-sm" onClick={closeManual}>
						Cancel
					</button>
				</div>
				{reason && (
					<p
						className="m-0"
						style={{ fontSize: 14, color: "var(--color-amber)" }}
					>
						{reason}
					</p>
				)}
				<p className="m-0 text-ash-dim" style={{ fontSize: 13.5 }}>
					Type the fields from the invoice. Corredor screens the supplier and
					runs the same rules as for an uploaded PDF. With no PDF there is no
					injection scan or duplicate-file check, and the payout will say so.
				</p>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{field(
						"payeeName",
						"Supplier name",
						<input
							id="man-payeeName"
							className="inp"
							required
							value={d.payeeName}
							onChange={(e) => set("payeeName", e.target.value)}
						/>,
					)}
					{field(
						"payeeCountry",
						"Supplier country",
						<select
							id="man-payeeCountry"
							className="inp"
							value={d.payeeCountry}
							onChange={(e) => setCountry(e.target.value as Country)}
						>
							{COUNTRIES.map(([c, name]) => (
								<option key={c} value={c}>
									{name}
								</option>
							))}
						</select>,
					)}
					{field(
						"invoiceNumber",
						"Invoice number",
						<input
							id="man-invoiceNumber"
							className="inp"
							required
							value={d.invoiceNumber}
							onChange={(e) => set("invoiceNumber", e.target.value)}
						/>,
					)}
					{field(
						"payeeTaxId",
						`Supplier tax ID (${TAX_ID[d.payeeCountry]})`,
						<input
							id="man-payeeTaxId"
							className="inp"
							value={d.payeeTaxId}
							onChange={(e) => set("payeeTaxId", e.target.value)}
						/>,
					)}
					{field(
						"amount",
						"Amount",
						<input
							id="man-amount"
							className="inp"
							inputMode="decimal"
							required
							value={d.amount}
							onChange={(e) => set("amount", e.target.value)}
							placeholder="85000.00"
						/>,
					)}
					{field(
						"currency",
						"Currency",
						<select
							id="man-currency"
							className="inp"
							value={d.currency}
							onChange={(e) => set("currency", e.target.value)}
						>
							{CURRENCIES.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>,
					)}
					{field(
						"dueDate",
						"Due date",
						<input
							id="man-dueDate"
							type="date"
							className="inp"
							value={d.dueDate}
							onChange={(e) => set("dueDate", e.target.value)}
						/>,
					)}
					{field(
						"purposeCode",
						d.payeeCountry === "BR"
							? "FX purpose code (Brazil)"
							: "Purpose code (optional)",
						<input
							id="man-purposeCode"
							className="inp"
							value={d.purposeCode}
							onChange={(e) => set("purposeCode", e.target.value)}
						/>,
					)}
					{field(
						"bankType",
						"Bank identifier type",
						<select
							id="man-bankType"
							className="inp"
							value={d.bankType}
							onChange={(e) => set("bankType", e.target.value as LocalRail)}
						>
							{RAILS.map(([r, name]) => (
								<option key={r} value={r}>
									{name}
								</option>
							))}
						</select>,
					)}
					{field(
						"bankValue",
						"Bank identifier",
						<input
							id="man-bankValue"
							className="inp mono"
							value={d.bankValue}
							onChange={(e) => set("bankValue", e.target.value)}
						/>,
					)}
					{field(
						"description",
						"Description",
						<input
							id="man-description"
							className="inp"
							value={d.description}
							onChange={(e) => set("description", e.target.value)}
						/>,
						true,
					)}
				</div>

				{error && (
					<p
						className="m-0"
						role="alert"
						style={{ fontSize: 14, color: "var(--color-coral)" }}
					>
						{error}
					</p>
				)}

				<div className="flex flex-wrap items-center gap-2.5">
					<button
						type="submit"
						className="btn btn-primary"
						disabled={missing.length > 0 || busy}
					>
						{busy ? "Creating payout…" : "Create payout"}
					</button>
					{missing.length > 0 && (
						<span className="text-ash-dim" style={{ fontSize: 13 }}>
							{`Still needed: ${missing.join(", ")}.`}
						</span>
					)}
				</div>
			</form>
		</Card>
	);
}
