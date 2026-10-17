import { createFileRoute } from "@tanstack/react-router";
import { InboxPage } from "@/screens/inbox";

export const Route = createFileRoute("/_app/inbox")({
	component: InboxPage,
});
