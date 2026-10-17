// The only file that talks to tic-api. The token-incinerators store calls these
// fetch helpers directly (no React Query in the UI layer).

import { z } from "zod";
import {
	AgentReply,
	AgentStatus,
	type AgentTurn,
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
	const form = init.body instanceof FormData;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method: init.method ?? "GET",
			headers:
				init.body === undefined || form
					? undefined
					: { "content-type": "application/json" },
			body:
				init.body === undefined
					? undefined
					: form
						? (init.body as FormData)
						: JSON.stringify(init.body),
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

/** Every payout with its plan, memo, approvals, payment and journal in one request. */
export const payoutsQuery = {
	queryFn: () => request(z.array(PayoutDetail), "/api/payouts?detail=1"),
};

export const settingsQuery = {
	queryFn: () => request(Settings, "/api/settings"),
};

export const rulesQuery = {
	queryFn: () => request(z.array(Rule), "/api/rules?all=1"),
};

export const offrampsQuery = {
	queryFn: () => request(z.array(OfframpListing), "/api/offramps"),
};

export const ledgerQuery = {
	queryFn: () => request(z.array(LedgerEntry), "/api/ledger"),
};

export const auditQuery = {
	queryFn: () => request(z.array(AuditEvent), "/api/audit"),
};

export const verifyQuery = (tamper?: number) => ({
	queryFn: () =>
		request(
			AuditVerifyResult,
			`/api/audit/verify${tamper ? `?tamper=${tamper}` : ""}`,
		),
});

export const healthQuery = {
	queryFn: () => request(Health, "/api/health"),
};

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

export const agentStatusQuery = {
	queryFn: () => request(AgentStatus, "/api/agent/status"),
};

export const askAgentApi = (messages: AgentTurn[], asOf: string) =>
	request(AgentReply, "/api/agent/chat", {
		method: "POST",
		body: { messages, asOf },
	});

// ---- Invoices and memos ---------------------------------------------------------------

/** Upload one invoice PDF: the API reads it, creates the payout and plans it. */
export const uploadInvoice = (file: File) => {
	const body = new FormData();
	body.append("file", file);
	return request(PayoutDetail, "/api/invoices", { method: "POST", body });
};

/** Have the model write the memo for the current plan (citations checked against the plan). */
export const writeMemo = (id: string) =>
	request(PayoutDetail, `/api/payouts/${enc(id)}/memo`, { method: "POST" });
