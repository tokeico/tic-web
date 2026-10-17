import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shell } from "../components/Shell";

export const Route = createFileRoute("/app")({ component: AppLayout });

// Every page under /app lives inside the app frame: header with tabs, the
// as-of date bar, the guided-demo bar and the toast. The landing page at "/"
// renders outside of it.

function AppLayout() {
	return (
		<Shell>
			<Outlet />
		</Shell>
	);
}
