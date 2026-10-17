import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { StoreProvider } from "@/state/store";

export const Route = createFileRoute("/_app")({
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
