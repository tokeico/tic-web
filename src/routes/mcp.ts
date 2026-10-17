import { createFileRoute } from "@tanstack/react-router";
import { forwardApi } from "@/server/api";

export const Route = createFileRoute("/mcp")({
	server: {
		handlers: {
			GET: ({ request }) => forwardApi(request),
			POST: ({ request }) => forwardApi(request),
			DELETE: ({ request }) => forwardApi(request),
		},
	},
});
