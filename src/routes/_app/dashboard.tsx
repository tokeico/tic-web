import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/screens/overview";

/** Where "Get Started" lands: the overview, under the URL people expect. */
export const Route = createFileRoute("/_app/dashboard")({
	component: OverviewPage,
});
