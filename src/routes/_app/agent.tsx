import { createFileRoute } from "@tanstack/react-router";
import { AgentPage } from "@/screens/agent";

export const Route = createFileRoute("/_app/agent")({
	component: AgentPage,
});
