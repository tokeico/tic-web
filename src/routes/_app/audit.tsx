import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "@/screens/audit";

export const Route = createFileRoute("/_app/audit")({
	component: AuditPage,
});
