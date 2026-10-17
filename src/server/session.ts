import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Session } from "@/lib/auth";
import { apiOrigin } from "./api";

export const currentUser = createServerFn({ method: "GET" }).handler(
	async () => {
		setResponseHeader("Cache-Control", "no-store");
		const cookie = getRequestHeader("cookie");
		if (!cookie) return null;
		const response = await fetch(`${apiOrigin()}/api/auth/me`, {
			headers: { cookie },
			cache: "no-store",
		});
		if (response.status === 401) return null;
		if (!response.ok)
			throw new Error("Could not check your session. Please try again.");
		return Session.parse(await response.json()).user;
	},
);
