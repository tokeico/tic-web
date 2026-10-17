import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/screens/landing";

export const Route = createFileRoute("/")({
	component: LandingPage,
});
