import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import {
	DEMO_ADMIN,
	DEMO_LOGIN,
	safeReturnPath,
	signIn,
	signUp,
} from "@/lib/auth";

export function AuthPage({
	mode,
	redirect,
	invitation,
}: {
	mode: "signin" | "signup";
	redirect?: string;
	invitation?: string;
}) {
	const registering = mode === "signup";
	const demoLogin = DEMO_LOGIN && !registering && !invitation;
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const values = new FormData(event.currentTarget);
		const input = {
			email: String(values.get("email") ?? ""),
			password: String(values.get("password") ?? ""),
			invitation,
		};
		authenticate(() =>
			registering
				? signUp({
						...input,
						name: String(values.get("name") ?? ""),
						workspaceName: invitation
							? undefined
							: String(values.get("workspaceName") ?? ""),
					})
				: signIn(input),
		);
	}
	async function authenticate(attempt: () => Promise<unknown>) {
		if (busy) return;
		setBusy(true);
		setError("");
		try {
			await attempt();
			window.location.assign(safeReturnPath(redirect));
		} catch (failure) {
			setError(
				failure instanceof Error
					? failure.message
					: "Could not sign in. Please try again.",
			);
			setBusy(false);
		}
	}
	const inputClass =
		"w-full rounded-md border border-edge-bright bg-panel px-3 py-3 text-base text-bone";
	return (
		// Phones/tablets: one centered column no wider than a comfortable form.
		// lg: intro beside the card. ≥1800px the composition and type scale up
		// so it doesn't float as a small island on a 2560px screen.
		// (written as 112.5rem: a px arbitrary breakpoint sorts before lg in v4)
		<main className="mx-auto box-border grid min-h-dvh w-full max-w-[34rem] content-center items-center gap-10 px-[var(--gutter)] py-12 lg:max-w-[1100px] lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16 min-[112.5rem]:max-w-[1360px] min-[112.5rem]:grid-cols-[minmax(0,1fr)_480px] min-[112.5rem]:gap-24">
			<section className="flex max-w-[32rem] flex-col gap-5 min-[112.5rem]:max-w-[40rem]">
				<Link to="/" className="display text-2xl text-bone no-underline">
					Corredor
				</Link>
				<h1 className="display m-0 text-3xl leading-tight text-balance lg:text-4xl min-[112.5rem]:text-5xl">
					{registering
						? "Your compliance workspace starts here."
						: "Back to your compliance workspace."}
				</h1>
				<p className="m-0 hidden max-w-[55ch] text-ash lg:block">
					Review who you pay, understand the rules, and keep the evidence behind
					every decision. Agent explains. A person decides.
				</p>
				<p
					className={`m-0 text-sm text-ash${invitation ? "" : " hidden lg:block"}`}
				>
					{invitation
						? "You’ve been invited to an existing workspace. Use the email address on your invitation."
						: "Each new account gets a separate workspace with fictional demo invoices. Your data and decisions are not shared with other visitors."}
				</p>
				<p className="m-0 text-sm text-ash">
					Sign-up is account access, not KYC. This sandbox uses fictional data
					and simulated payments.
				</p>
			</section>
			<section
				className="min-w-0 rounded-lg border border-edge bg-panel p-5 sm:p-6 min-[112.5rem]:p-8"
				aria-labelledby="auth-title"
			>
				<h2 id="auth-title" className="display mb-6 mt-0 text-2xl">
					{registering ? "Create an account" : "Sign in"}
				</h2>
				{demoLogin && (
					<div className="mb-6 flex flex-col gap-3 rounded-md border border-edge-bright p-4 text-sm">
						<p className="m-0 text-ash">
							Demo login: username{" "}
							<strong className="text-bone">{DEMO_ADMIN.username}</strong>,
							password{" "}
							<strong className="text-bone">{DEMO_ADMIN.password}</strong>.
						</p>
						<button
							type="button"
							className="btn w-full"
							disabled={busy}
							onClick={() =>
								authenticate(() =>
									signIn({
										email: DEMO_ADMIN.username,
										password: DEMO_ADMIN.password,
									}),
								)
							}
						>
							Sign in to the demo dashboard
						</button>
					</div>
				)}
				<form className="flex flex-col gap-5" onSubmit={submit}>
					{registering && (
						<label className="flex flex-col gap-2 text-sm" htmlFor="auth-name">
							Your name
							<input
								id="auth-name"
								name="name"
								autoComplete="name"
								required
								maxLength={80}
								className={inputClass}
							/>
						</label>
					)}
					{registering && !invitation && (
						<label
							className="flex flex-col gap-2 text-sm"
							htmlFor="auth-workspace"
						>
							Workspace name
							<input
								id="auth-workspace"
								name="workspaceName"
								autoComplete="organization"
								required
								maxLength={80}
								className={inputClass}
							/>
						</label>
					)}
					<label className="flex flex-col gap-2 text-sm" htmlFor="auth-email">
						{registering ? "Email" : "Email or username"}
						<input
							id="auth-email"
							name="email"
							type={registering ? "email" : "text"}
							autoComplete={registering ? "email" : "username"}
							required
							maxLength={254}
							className={inputClass}
						/>
					</label>
					<div className="flex flex-col gap-2 text-sm">
						<label htmlFor="auth-password">Password</label>
						<input
							id="auth-password"
							name="password"
							type="password"
							autoComplete={registering ? "new-password" : "current-password"}
							required
							minLength={registering ? 15 : 1}
							maxLength={128}
							aria-describedby={registering ? "password-guidance" : undefined}
							className={inputClass}
						/>
						{registering && (
							<span id="password-guidance" className="text-ash">
								Use at least 15 characters. A unique passphrase works well.
							</span>
						)}
					</div>
					{error && (
						<p role="alert" className="m-0 text-sm text-coral">
							{error}
						</p>
					)}
					<button
						type="submit"
						className="btn btn-primary w-full"
						disabled={busy}
					>
						{busy
							? "Please wait..."
							: registering
								? "Create account"
								: "Sign in"}
					</button>
				</form>
				<p className="mb-0 mt-6 text-sm text-ash">
					{registering ? "Already have an account? " : "New to Corredor? "}
					<Link
						to={registering ? "/signin" : "/signup"}
						search={{ redirect: safeReturnPath(redirect), invitation }}
						className="text-bone underline underline-offset-4"
					>
						{registering ? "Sign in" : "Create an account"}
					</Link>
				</p>
			</section>
		</main>
	);
}
