import { type FormEvent, useEffect, useState } from "react";
import type { z } from "zod";
import { ConnectAgent } from "@/components/ConnectAgent";
import {
	type ApiKey,
	createApiKey,
	inviteMember,
	listApiKeys,
	listMembers,
	listWorkspaces,
	type Member,
	revokeApiKey,
	switchWorkspace,
	type Workspace,
} from "@/lib/auth";
import { useStore } from "@/state/store";

export function AccountPage() {
	const { user } = useStore();
	const [members, setMembers] = useState<z.infer<typeof Member>[]>([]);
	const [keys, setKeys] = useState<z.infer<typeof ApiKey>[]>([]);
	const [workspaces, setWorkspaces] = useState<z.infer<typeof Workspace>[]>([]);
	const [workspaceId, setWorkspaceId] = useState(user.workspace.id);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [secret, setSecret] = useState("");
	const [invitation, setInvitation] = useState("");
	useEffect(() => {
		let cancelled = false;
		Promise.all([listMembers(), listApiKeys(), listWorkspaces()])
			.then(([people, tokens, spaces]) => {
				if (!cancelled) {
					setMembers(people);
					setKeys(tokens);
					setWorkspaces(spaces);
				}
			})
			.catch(() => {
				if (!cancelled)
					setError("Could not load your account. Refresh to try again.");
			});
		return () => {
			cancelled = true;
		};
	}, []);
	async function run(action: () => Promise<void>) {
		if (busy) return;
		setBusy(true);
		setError("");
		try {
			await action();
		} catch (failure) {
			setError(
				failure instanceof Error
					? failure.message
					: "Could not complete this action.",
			);
		} finally {
			setBusy(false);
		}
	}
	function invite(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const role = data.get("role");
		if (role !== "approver" && role !== "ap_clerk" && role !== "auditor")
			return;
		void run(async () => {
			const result = await inviteMember(String(data.get("email") ?? ""), role);
			const url = new URL("/signup", window.location.origin);
			url.searchParams.set("invitation", result.invitation);
			setInvitation(url.toString());
		});
	}
	// min-h-10 matches .btn (40px) so a field and its submit button share
	// both edges when they sit on one row.
	const field =
		"min-h-10 w-full min-w-0 rounded-md border border-edge-bright bg-panel px-3 py-2 text-bone";
	// A form row: the main field keeps a usable basis and the rest wrap under
	// it on phones (the submit button goes full width there).
	const row = "flex flex-wrap items-end gap-3";
	const grow = "flex min-w-0 grow basis-48 flex-col gap-2 text-sm";
	const submit = "btn w-full sm:w-auto";
	const section = "flex min-w-0 flex-col gap-4 border-t border-edge pt-6";
	return (
		// One 1040px column below xl; from xl the two sections sit side by side
		// so the page uses the frame on wide monitors.
		<main className="page grid grid-cols-1 content-start gap-10 py-8 *:max-w-[1040px] xl:grid-cols-2 xl:gap-x-12 xl:*:max-w-none">
			<header className="xl:col-span-2">
				<h1 className="display m-0 text-3xl">Your account & workspace</h1>
				<p className="mb-0 text-ash">
					{user.workspace.name} · {user.email}
				</p>
			</header>
			{workspaces.length > 1 && (
				<form
					className={`${row} xl:col-span-1 xl:col-start-1`}
					onSubmit={(event) => {
						event.preventDefault();
						void run(async () => {
							await switchWorkspace(workspaceId);
							window.location.assign("/agent");
						});
					}}
				>
					<label htmlFor="active-workspace" className={grow}>
						Active workspace
						<select
							id="active-workspace"
							value={workspaceId}
							onChange={(event) => setWorkspaceId(event.currentTarget.value)}
							className={field}
						>
							{workspaces.map((workspace) => (
								<option key={workspace.id} value={workspace.id}>
									{workspace.name} · {workspace.role}
								</option>
							))}
						</select>
					</label>
					<button
						type="submit"
						className={submit}
						disabled={busy || workspaceId === user.workspace.id}
					>
						Switch workspace
					</button>
				</form>
			)}
			{error && (
				<p role="alert" className="m-0 text-coral xl:col-span-2">
					{error}
				</p>
			)}
			<section
				aria-labelledby="members-h"
				className={`${section} xl:col-start-1`}
			>
				<h2 id="members-h" className="display m-0 text-xl">
					People who can decide
				</h2>
				<p className="m-0 max-w-[70ch] text-ash">
					Each decision is tied to a signed-in account. Payments above the
					policy threshold need a second, different approver; you cannot switch
					demo identities.
				</p>
				<ul className="m-0 list-none divide-y divide-edge p-0">
					{members.map((member) => (
						<li
							key={member.id}
							className="flex flex-wrap justify-between gap-2 py-3"
						>
							<span>
								{member.name}
								<span className="ml-2 text-sm text-ash">{member.email}</span>
							</span>
							<span className="text-sm text-ash">{member.role}</span>
						</li>
					))}
				</ul>
				{user.workspace.owner && (
					<form onSubmit={invite} className={`${row} mt-1`}>
						<label htmlFor="invite-email" className={grow}>
							Email
							<input
								className={field}
								id="invite-email"
								type="email"
								name="email"
								autoComplete="email"
								required
								maxLength={254}
							/>
						</label>
						<label
							htmlFor="invite-role"
							className="flex min-w-0 grow basis-40 flex-col gap-2 text-sm sm:grow-0"
						>
							Role
							<select className={field} id="invite-role" name="role">
								<option value="approver">Approver</option>
								<option value="ap_clerk">AP clerk</option>
								<option value="auditor">Auditor (read only)</option>
							</select>
						</label>
						<button className={submit} type="submit" disabled={busy}>
							Create invitation
						</button>
					</form>
				)}
				{invitation && (
					<label
						htmlFor="invite-link"
						className="flex flex-col gap-2 text-sm"
						role="status"
					>
						Share this single-use link with the invited person. It expires in 48
						hours.
						<input
							id="invite-link"
							readOnly
							value={invitation}
							onFocus={(event) => event.currentTarget.select()}
							className={field}
						/>
					</label>
				)}
			</section>
			<section aria-labelledby="keys-h" className={section}>
				<h2 id="keys-h" className="display m-0 text-xl">
					API & MCP access
				</h2>
				<p className="m-0 max-w-[70ch] text-ash">
					Keys can read this workspace’s data and use read-only MCP tools. They
					cannot approve payments, move money, or clear compliance holds. Keys
					expire after 90 days.
				</p>
				<form
					className={`${row} mt-1`}
					onSubmit={(event) => {
						event.preventDefault();
						const label = String(
							new FormData(event.currentTarget).get("label") ?? "",
						);
						void run(async () => {
							const result = await createApiKey(label);
							setSecret(result.token);
							setKeys(await listApiKeys());
						});
					}}
				>
					<label className={grow} htmlFor="key-label">
						Key label
						<input
							id="key-label"
							name="label"
							className={field}
							required
							maxLength={80}
							placeholder="Compliance integration"
						/>
					</label>
					<button className={submit} type="submit" disabled={busy}>
						Create read-only key
					</button>
				</form>
				{secret && (
					<div className="flex flex-col gap-3 rounded-md border border-edge-bright p-4">
						<label
							htmlFor="new-api-key"
							className="flex flex-col gap-2 text-sm"
							role="status"
						>
							Copy this key now. It won’t be shown again.
							<input
								id="new-api-key"
								readOnly
								value={secret}
								onFocus={(event) => event.currentTarget.select()}
								className={`${field} mono`}
							/>
						</label>
						<div>
							<button
								type="button"
								className="btn btn-sm max-sm:min-h-10"
								onClick={() => setSecret("")}
							>
								I’ve saved the key
							</button>
						</div>
					</div>
				)}
				<ConnectAgent secret={secret} />
				{keys.length > 0 && (
					<ul className="m-0 list-none divide-y divide-edge p-0">
						{keys.map((key) => (
							<li
								key={key.id}
								className="flex flex-wrap items-center justify-between gap-3 py-3"
							>
								<span>
									{key.label}{" "}
									<span className="mono ml-2 text-sm text-ash">
										{key.prefix}
									</span>
									<span className="ml-2 text-sm text-ash">
										{key.revokedAt
											? "Revoked"
											: `Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
									</span>
								</span>
								{!key.revokedAt && (
									<button
										type="button"
										className="btn btn-sm max-sm:min-h-10"
										disabled={busy}
										onClick={() =>
											void run(async () => {
												await revokeApiKey(key.id);
												setKeys(await listApiKeys());
											})
										}
									>
										Revoke
									</button>
								)}
							</li>
						))}
					</ul>
				)}
			</section>
		</main>
	);
}
