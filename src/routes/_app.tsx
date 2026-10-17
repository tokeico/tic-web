import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { safeReturnPath } from "@/lib/auth";
import { currentUser } from "@/server/session";
import { StoreProvider } from "@/state/store";

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ location }) => {
		const user = await currentUser();
		if (!user)
			throw redirect({
				to: "/signin",
				search: { redirect: safeReturnPath(location.href) },
			});
		return { user };
	},
	component: function ProductLayout() {
		return (
			<StoreProvider>
				<Shell>
					<Outlet />
				</Shell>
			</StoreProvider>
		);
	},
});
