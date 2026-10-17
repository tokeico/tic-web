import { createFileRoute } from "@tanstack/react-router";
import { LedgerPage } from "@/screens/ledger";

export const Route = createFileRoute("/_app/ledger")({
	component: LedgerPage,
});
