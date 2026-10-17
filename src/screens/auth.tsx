import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { safeReturnPath, signIn, signUp } from "@/lib/auth";

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
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy) return;
		const values = new FormData(event.currentTarget);
		setBusy(true);
		setError("");
		try {
			const input = {
				email: String(values.get("email") ?? ""),
				password: String(values.get("password") ?? ""),
				invitation,
			};
			if (registering)
				await signUp({
					...input,
					name: String(values.get("name") ?? ""),
					workspaceName: invitation
						? undefined
						: String(values.get("workspaceName") ?? ""),
				});
			else await signIn(input);
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
		<main className="mx-auto grid min-h-screen max-w-[1100px] items-center gap-12 px-6 py-12 lg:grid-cols-[1fr_420px]">
			<section className="flex max-w-[32rem] flex-col gap-5">
				<Link to="/" className="display text-2xl text-bone no-underline">
					Corredor
				</Link>
				<h1 className="display m-0 text-4xl leading-tight">
					{registering
						? "Your compliance workspace starts here."
						: "Back to your compliance workspace."}
				</h1>
				<p className="m-0 max-w-[55ch] text-ash">
					Review who you pay, understand the rules, and keep the evidence behind
					every decision. Agent explains. A person decides.
				</p>
				<p className="m-0 text-sm text-ash">
					{invitation
						? "You’ve been invited to an existing workspace. Use the email address on your invitation."
						: "Each new account gets a separate workspace with fictional demo invoices. Your data and decisions are not shared with other visitors."}
				</p>
				<p className="m-0 text-sm text-ash">
					Creating an account does not verify your identity or business.
					Payments and identity-verification examples are simulated.
				</p>
			</section>
			<section
				className="rounded-lg border border-edge bg-panel p-6"
				aria-labelledby="auth-title"
			>
				<h2 id="auth-title" className="display mb-6 mt-0 text-2xl">
					{registering ? "Create an account" : "Sign in"}
				</h2>
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
						Email
						<input
							id="auth-email"
							name="email"
							type="email"
							autoComplete="email"
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
