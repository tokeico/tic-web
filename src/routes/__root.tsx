import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useState } from "react";
import { Shell } from "../components/Shell";
import { rootSearch } from "../lib/search";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	validateSearch: rootSearch,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Corredor payouts" },
		],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,500..800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap",
			},
			{ rel: "stylesheet", href: appCss },
			{
				rel: "icon",
				href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230e6b5c'/%3E%3Ctext x='16' y='23' font-size='20' font-weight='700' text-anchor='middle' fill='white' font-family='sans-serif'%3EC%3C/text%3E%3C/svg%3E",
			},
		],
	}),
	shellComponent: RootDocument,
	component: () => <Outlet />,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	// Client-side data only: one QueryClient per browser tab.
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false },
				},
			}),
	);
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					<Shell>{children}</Shell>
				</QueryClientProvider>
				<TanStackDevtools
					config={{ position: "bottom-left" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
