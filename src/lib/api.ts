// The only file that talks to tic-api. Components import query options and
// mutations from here and never call fetch themselves.

import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import {
	type ApproveRequest,
	AuditEvent,
	AuditVerifyResult,
	Health,
	type InvoicePatch,
	LedgerEntry,
	OfframpListing,
	PayoutDetail,
	PayoutSummary,
	Plan,
	PlanAllResponse,
	ReplayResult,
	Rule,
	type ScreeningReviewRequest,
	Settings,
	type SettingsPatch,
	SettingsUpdate,
} from "./contracts";

export const API_URL: string =
	import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000";

/** `{ error: { code, message } }` from the API, or a network failure. */
export class ApiRequestError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
	) {
		super(message);
		this.name = "ApiRequestError";
	}
}

async function request<S extends z.ZodType>(
	schema: S,
	path: string,
	init: { method?: string; body?: unknown } = {},
): Promise<z.infer<S>> {
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method: init.method ?? "GET",
			headers:
				init.body === undefined
					? undefined
					: { "content-type": "application/json" },
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
		});
	} catch {
		throw new ApiRequestError(
			0,
			"network",
			`Can't reach the API at ${API_URL}. Is tic-api running?`,
		);
	}
	const json: unknown = await res.json().catch(() => null);
	if (!res.ok) {
		const err = (json as { error?: { code?: string; message?: string } } | null)
			?.error;
		throw new ApiRequestError(
			res.status,
			err?.code ?? "http_error",
			err?.message ?? res.statusText,
		);
	}
	return schema.parse(json);
}

const enc = encodeURIComponent;

// ---- Queries ------------------------------------------------------------------------

/** Every payout with its plan, memo, approvals, payment and journal in one request. */
export const payoutsQuery = queryOptions({
	queryKey: ["payouts"],
	queryFn: () => request(z.array(PayoutDetail), "/api/payouts?detail=1"),
});

export const settingsQuery = queryOptions({
	queryKey: ["settings"],
	queryFn: () => request(Settings, "/api/settings"),
});

/** The whole rules pack (Customize, and the "not in effect" rows of a checklist). */
export const rulesQuery = queryOptions({
	queryKey: ["rules"],
	queryFn: () => request(z.array(Rule), "/api/rules?all=1"),
	staleTime: Infinity,
});

export const offrampsQuery = queryOptions({
	queryKey: ["offramps"],
	queryFn: () => request(z.array(OfframpListing), "/api/offramps"),
});

export const ledgerQuery = queryOptions({
	queryKey: ["ledger"],
	queryFn: () => request(z.array(LedgerEntry), "/api/ledger"),
});

export const auditQuery = queryOptions({
	queryKey: ["audit"],
	queryFn: () => request(z.array(AuditEvent), "/api/audit"),
});

/** `tamper` edits that event in memory before verifying: the audit page's demo. */
export const verifyQuery = (tamper?: number) =>
	queryOptions({
		queryKey: ["audit", "verify", tamper ?? null],
		queryFn: () =>
			request(
				AuditVerifyResult,
				`/api/audit/verify${tamper ? `?tamper=${tamper}` : ""}`,
			),
	});

export const healthQuery = queryOptions({
	queryKey: ["health"],
	queryFn: () => request(Health, "/api/health"),
});

// ---- Reads that aren't cached (dry runs and proofs) --------------------------------------

/** What would this payout's plan be on another date, optionally if registry updates were approved? Stores nothing. */
export const previewPlan = (
	id: string,
	asOf: string,
	registry?: Record<string, string>,
) => {
	const reg =
		registry && Object.keys(registry).length
			? `&registry=${Object.entries(registry)
					.map(([k, v]) => `${k}:${v}`)
					.join(",")}`
			: "";
	return request(
		Plan,
		`/api/payouts/${enc(id)}/preview?asOf=${enc(asOf)}${reg}`,
	);
};

export const replayPlan = (id: string, n = 100) =>
	request(ReplayResult, `/api/payouts/${enc(id)}/replay?n=${n}`);

export const ledgerCsvUrl = `${API_URL}/api/ledger.csv`;

// ---- Mutations ----------------------------------------------------------------------

/** The slider. Moves the server's demo clock and returns every payout plus what rerouted. */
export const planAll = (asOf: string) =>
	request(PlanAllResponse, `/api/plan-all?asOf=${enc(asOf)}`, {
		method: "POST",
	});

export const approvePayout = (id: string, body: ApproveRequest) =>
	request(PayoutDetail, `/api/payouts/${enc(id)}/approve`, {
		method: "POST",
		body,
	});

export const payPayout = (id: string, by?: string) =>
	request(PayoutDetail, `/api/payouts/${enc(id)}/pay`, {
		method: "POST",
		body: by ? { by } : undefined,
	});

export const reconcilePayout = (id: string, by?: string) =>
	request(PayoutDetail, `/api/payouts/${enc(id)}/reconcile`, {
		method: "POST",
		body: by ? { by } : undefined,
	});

export const editInvoice = (id: string, body: InvoicePatch & { by?: string }) =>
	request(PayoutDetail, `/api/payouts/${enc(id)}`, { method: "PATCH", body });

export const reviewScreening = (id: string, body: ScreeningReviewRequest) =>
	request(PayoutDetail, `/api/payouts/${enc(id)}/screening-review`, {
		method: "POST",
		body,
	});

export const updateSettings = (body: SettingsPatch) =>
	request(SettingsUpdate, "/api/settings", { method: "PUT", body });

export const resetDemo = () =>
	request(
		z.object({ asOf: z.string(), payouts: z.array(PayoutSummary) }),
		"/api/demo/reset",
		{ method: "POST" },
	);

export { mutationOptions };
