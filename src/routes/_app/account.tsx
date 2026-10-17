import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/screens/account";

export const Route = createFileRoute("/_app/account")({
	component: AccountPage,
});
