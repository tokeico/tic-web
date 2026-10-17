import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/screens/overview";

export const Route = createFileRoute("/_app/overview")({
	component: OverviewPage,
});
