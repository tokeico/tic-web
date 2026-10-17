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
import { LandingPage } from './routes/landing'
import { LedgerPage } from './routes/ledger'
import { OverviewPage } from './routes/overview'
import { TrustPage } from './routes/trust'

/**
 * Two halves of the site:
 *   /      the marketing landing page, no product chrome
 *   /app…  the product, wrapped in the dashboard shell
 *
 * The store sits inside the shell layout, so demo state survives navigation
 * between tabs but the landing page carries none of it.
 */
const rootRoute = createRootRoute({ component: Outlet })

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

/** Pathless layout: everything below it renders inside the product shell. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: () => (
    <StoreProvider>
      <Shell>
        <Outlet />
      </Shell>
    </StoreProvider>
  ),
})

/** Generic over the path so the literal survives into the router's types. */
const page = <P extends string>(path: P, component: () => React.ReactNode) =>
  createRoute({ getParentRoute: () => shellRoute, path, component })

const routeTree = rootRoute.addChildren([
  landingRoute,
  shellRoute.addChildren([
    page('/app', OverviewPage),
    page('/inbox', InboxPage),
    page('/agent', AgentPage),
    page('/trust', TrustPage),
    page('/ledger', LedgerPage),
    page('/audit', AuditPage),
    page('/customize', CustomizePage),
  ]),
])

export { routeTree }

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
