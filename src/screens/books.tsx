import { useLocation } from "@tanstack/react-router";
import { Disclosure, PAGE_MAX_W } from "@/components/ui";
import { AuditSection } from "@/screens/audit";
import { ExplorerSection } from "@/screens/explorer";
import { LedgerSection } from "@/screens/ledger";
import { useStore } from "@/state/store";

/**
 * The books: what was paid (the ledger) and the proof it happened (the audit
 * chain). One page, because a controller reads them together at month-end.
 */
export function BooksPage() {
	const { pathname } = useLocation();
	const { state } = useStore();
	return (
		<main
			className={`mx-auto flex ${PAGE_MAX_W["/ledger"]} flex-col gap-8 px-5 py-8`}
		>
			<ExplorerSection />
			<Disclosure
				summary="Ledger · journal entries & CSV export"
				open={pathname === "/ledger" && state.tour !== null}
			>
				<LedgerSection />
			</Disclosure>
			<Disclosure
				summary="Audit log · all activity & chain verification"
				open={pathname === "/audit"}
			>
				<AuditSection />
			</Disclosure>
		</main>
	);
}
