import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/screens/dashboard";

/** Where "Get Started" lands: the CEO view. The payer's home is /overview. */
export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardPage,
});
