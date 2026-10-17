import { createFileRoute } from "@tanstack/react-router";
import { CustomizePage } from "@/screens/customize";

export const Route = createFileRoute("/_app/customize")({
	component: CustomizePage,
});