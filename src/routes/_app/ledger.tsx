import { createFileRoute } from "@tanstack/react-router";
import { BooksPage } from "@/screens/books";

export const Route = createFileRoute("/_app/ledger")({
	component: BooksPage,
});
