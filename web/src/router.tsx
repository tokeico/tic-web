import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'

import { Shell } from './components/Shell'
import { StoreProvider } from './state/store'
import { AgentPage } from './routes/agent'
import { AuditPage } from './routes/audit'
import { CustomizePage } from './routes/customize'
import { InboxPage } from './routes/inbox'
import { LedgerPage } from './routes/ledger'
import { OverviewPage } from './routes/overview'
import { TrustPage } from './routes/trust'

/**
 * Code-based route tree: one route per tab. The store lives above the outlet so
 * demo state survives navigation between tabs.
 */
const rootRoute = createRootRoute({
  component: () => (
    <StoreProvider>
      <Shell>
        <Outlet />
      </Shell>
    </StoreProvider>
  ),
})

const page = (path: string, component: () => React.ReactNode) =>
  createRoute({ getParentRoute: () => rootRoute, path, component })

export const routeTree = rootRoute.addChildren([
  page('/', OverviewPage),
  page('/inbox', InboxPage),
  page('/agent', AgentPage),
  page('/trust', TrustPage),
  page('/ledger', LedgerPage),
  page('/audit', AuditPage),
  page('/customize', CustomizePage),
])

/**
 * `VITE_PREVIEW=1` builds the demo for a sandboxed iframe (the shared preview
 * page), where pushState isn't available — the tabs then navigate in memory
 * instead of in the URL. Normal builds use real browser history.
 */
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  ...(import.meta.env.VITE_PREVIEW
    ? { history: createMemoryHistory({ initialEntries: ['/'] }) }
    : {}),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
