import { z } from "zod";
import { request } from "./api";

export const AuthUser = z.object({
	id: z.string().uuid(),
	memberId: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	role: z.enum(["controller", "approver", "ap_clerk", "auditor"]),
	workspace: z.object({
		id: z.string().uuid(),
		name: z.string(),
		owner: z.boolean(),
	}),
});
export type AuthUser = z.infer<typeof AuthUser>;
export const Session = z.object({ user: AuthUser });
export const Member = AuthUser.pick({
	id: true,
	name: true,
	email: true,
	role: true,
});
export const ApiKey = z.object({
	id: z.string(),
	label: z.string(),
	prefix: z.string(),
	expiresAt: z.string(),
	revokedAt: z.string().nullable(),
	createdAt: z.string(),
});

/** Local demo login (tic-api `bun run db:demo-admin`). The hint shows only when PUBLIC_DEMO_LOGIN=true. */
export const DEMO_LOGIN = import.meta.env.PUBLIC_DEMO_LOGIN === "true";
export const DEMO_ADMIN = { username: "admin", password: "admin" };
/** The demo admin's account email; the API maps the username "admin" to it. */
export const DEMO_ADMIN_EMAIL = "admin@corredor.demo";
/** Demo-only controls (the timeline) show for the demo admin alone. */
export const isDemoAdmin = (user: { email: string }) =>
	user.email === DEMO_ADMIN_EMAIL;

export const signIn = (input: {
	email: string;
	password: string;
	invitation?: string;
}) => request(Session, "/api/auth/signin", { method: "POST", body: input });
export const signUp = (input: {
	name: string;
	email: string;
	password: string;
	workspaceName?: string;
	invitation?: string;
}) => request(Session, "/api/auth/signup", { method: "POST", body: input });
export const signOut = () =>
	request(z.object({ ok: z.boolean() }), "/api/auth/signout", {
		method: "POST",
	});
export const listMembers = () => request(z.array(Member), "/api/auth/members");
export const Workspace = z.object({
	id: z.string().uuid(),
	name: z.string(),
	role: AuthUser.shape.role,
	owner: z.boolean(),
});
export const listWorkspaces = () =>
	request(z.array(Workspace), "/api/auth/workspaces");
export const switchWorkspace = (workspaceId: string) =>
	request(Session, "/api/auth/workspace", {
		method: "POST",
		body: { workspaceId },
	});
export const inviteMember = (
	email: string,
	role: "approver" | "ap_clerk" | "auditor",
) =>
	request(
		z.object({ invitation: z.string(), expiresAt: z.string() }),
		"/api/auth/invitations",
		{ method: "POST", body: { email, role } },
	);
export const listApiKeys = () => request(z.array(ApiKey), "/api/auth/keys");
export const createApiKey = (label: string) =>
	request(
		z.object({
			token: z.string(),
			expiresAt: z.string(),
			readOnly: z.boolean(),
		}),
		"/api/auth/keys",
		{ method: "POST", body: { label } },
	);
export const revokeApiKey = (id: string) =>
	request(
		z.object({ ok: z.boolean() }),
		`/api/auth/keys/${encodeURIComponent(id)}/revoke`,
		{ method: "POST" },
	);

export function safeReturnPath(value: unknown) {
	return typeof value === "string" &&
		![...value].some((character) => character.charCodeAt(0) < 32) &&
		/^\/(?:agent|inbox|overview|dashboard|app|trust|ledger|audit|customize|account|compliance)(?:\?[^\\]*)?$/.test(
			value,
		)
		? value
		: "/agent";
}

export function authSearch(value: Record<string, unknown>): {
	redirect?: string;
	invitation?: string;
} {
	return {
		redirect: safeReturnPath(value.redirect),
		invitation:
			typeof value.invitation === "string" &&
			/^ci_[A-Za-z0-9_-]{43}$/.test(value.invitation)
				? value.invitation
				: undefined,
	};
}
