import { createFileRoute } from "@tanstack/react-router";
import { PresentationPage } from "@/screens/presentation";

export const Route = createFileRoute("/presentation")({
	head: () => ({ meta: [{ title: "Corredor · Pitch" }] }),
	component: PresentationPage,
});
