import assert from "node:assert/strict";
import { test } from "node:test";
import { forwardApi } from "./api";

test("API proxy requests JSON through ngrok while preserving authentication and origin checks", async () => {
	const originalFetch = globalThis.fetch;
	const originalOrigin = process.env.API_ORIGIN;
	let upstream: Request | undefined;
	process.env.API_ORIGIN = "https://geotropic-preseminal-syble.ngrok-free.dev";
	globalThis.fetch = async (input, init) => {
		upstream = new Request(input, init);
		return Response.json({ db: true });
	};
	try {
		const response = await forwardApi(
			new Request("http://localhost:8080/api/health", {
				headers: {
					"user-agent": "Mozilla/5.0",
					cookie: "corredor_session=test-session",
					origin: "http://localhost:8080",
					"x-forwarded-host": "untrusted.example.test",
				},
			}),
		);
		assert.equal(
			upstream?.url,
			"https://geotropic-preseminal-syble.ngrok-free.dev/api/health",
		);
		assert.equal(upstream?.headers.get("ngrok-skip-browser-warning"), "true");
		assert.equal(
			upstream?.headers.get("cookie"),
			"corredor_session=test-session",
		);
		assert.equal(upstream?.headers.get("origin"), "http://localhost:8080");
		assert.equal(upstream?.headers.has("x-forwarded-host"), false);
		assert.equal(response.headers.get("cache-control"), "no-store");
	} finally {
		globalThis.fetch = originalFetch;
		if (originalOrigin === undefined) delete process.env.API_ORIGIN;
		else process.env.API_ORIGIN = originalOrigin;
	}
});
