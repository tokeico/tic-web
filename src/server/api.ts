import { createServerOnlyFn } from "@tanstack/react-start";

export const apiOrigin = createServerOnlyFn(() => {
	const url = new URL(
		process.env.API_ORIGIN ||
			process.env.PUBLIC_API_URL ||
			"http://localhost:3000",
	);
	if (!["http:", "https:"].includes(url.protocol))
		throw new Error("Invalid API origin.");
	return url.origin;
});

export const forwardApi = createServerOnlyFn(async (request: Request) => {
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/api/") && url.pathname !== "/mcp")
		return new Response("Not found", { status: 404 });
	const forwarded = new Request(
		`${apiOrigin()}${url.pathname}${url.search}`,
		request,
	);
	for (const key of [...forwarded.headers.keys()]) {
		if (key === "host" || key === "forwarded" || key.startsWith("x-forwarded-"))
			forwarded.headers.delete(key);
	}
	forwarded.headers.set("ngrok-skip-browser-warning", "true");
	try {
		const response = await fetch(forwarded, { redirect: "manual" });
		const headers = new Headers(response.headers);
		headers.set("Cache-Control", "no-store");
		return new Response(response.body, { status: response.status, headers });
	} catch {
		return Response.json(
			{
				error: {
					code: "api_unavailable",
					message: "The API is unavailable. Please try again.",
				},
			},
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
});
