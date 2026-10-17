import { useLocation } from "@tanstack/react-router";
import { Disclosure } from "@/components/ui";
import { AuditSection } from "@/screens/audit";
import { ExplorerSection } from "@/screens/explorer";
import { LedgerSection } from "@/screens/ledger";

/**
 * The books: what was paid (the ledger) and the proof it happened (the audit
 * chain). One page, because a controller reads them together at month-end.
 */
export function BooksPage() {
	const { pathname } = useLocation();
	return (
		<main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-8">
			<ExplorerSection />
			<Disclosure summary="Ledger · journal entries & CSV export">
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
