import { createFileRoute } from "@tanstack/react-router";
import { authSearch } from "@/lib/auth";
import { AuthPage } from "@/screens/auth";

export const Route = createFileRoute("/signup")({
	validateSearch: authSearch,
	component: SignUpPage,
});

function SignUpPage() {
	const { redirect, invitation } = Route.useSearch();
	return <AuthPage mode="signup" redirect={redirect} invitation={invitation} />;
}
