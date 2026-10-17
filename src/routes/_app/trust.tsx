import { createFileRoute } from "@tanstack/react-router";
import { TrustPage } from "@/screens/trust";

export const Route = createFileRoute("/_app/trust")({
	component: TrustPage,
});
