import { createFileRoute } from "@tanstack/react-router";
import { authSearch } from "@/lib/auth";
import { AuthPage } from "@/screens/auth";

export const Route = createFileRoute("/signin")({
	validateSearch: authSearch,
	component: SignInPage,
});

function SignInPage() {
	const { redirect, invitation } = Route.useSearch();
	return <AuthPage mode="signin" redirect={redirect} invitation={invitation} />;
}
