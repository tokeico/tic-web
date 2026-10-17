import { createFileRoute } from "@tanstack/react-router";
import { forwardApi } from "@/server/api";

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			GET: ({ request }) => forwardApi(request),
			POST: ({ request }) => forwardApi(request),
			PUT: ({ request }) => forwardApi(request),
			PATCH: ({ request }) => forwardApi(request),
			DELETE: ({ request }) => forwardApi(request),
		},
	},
});
