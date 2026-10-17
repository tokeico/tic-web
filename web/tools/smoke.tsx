/**
 * Smoke test: mounts the real app in jsdom and drives the demo script.
 *
 * Run with:  npm run smoke
 * (Built by Vite in SSR mode so TSX and the @/ alias resolve, then run in node.)
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const g = globalThis as Record<string, unknown>
g.window = dom.window
g.self = dom.window
g.document = dom.window.document
g.localStorage = dom.window.localStorage
// node 24 defines a getter-only global navigator.
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
})
g.HTMLElement = dom.window.HTMLElement
g.Element = dom.window.Element
g.Node = dom.window.Node
g.Event = dom.window.Event
g.MouseEvent = dom.window.MouseEvent
g.getComputedStyle = dom.window.getComputedStyle
g.scrollTo = () => {}
dom.window.scrollTo = () => {}
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16)
g.cancelAnimationFrame = (id: number) => clearTimeout(id)
g.IS_REACT_ACT_ENVIRONMENT = true

const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { RouterProvider, createRouter, createMemoryHistory } = await import(
  '@tanstack/react-router'
)
const { routeTree } = await import('../src/router')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const act = async (fn: () => void | Promise<void>) => {
  await React.act(async () => {
    await fn()
  })
}

let failures = 0
const check = (label: string, cond: boolean, extra = '') => {
  console.log((cond ? '  ok   ' : '  FAIL ') + label + (cond || !extra ? '' : ' → ' + extra))
  if (!cond) failures++
}

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ['/app'] }),
})

const root = createRoot(document.getElementById('root')!)
await act(async () => {
  root.render(React.createElement(RouterProvider, { router }))
  await router.load()
})

const text = () => document.body.textContent || ''
const byText = (needle: string): HTMLElement | undefined =>
  [...document.querySelectorAll('button, a')].find(
    (el) =>
      (el.textContent || '').trim().replace(/\s+/g, ' ') === needle ||
      el.getAttribute('aria-label') === needle,
  ) as HTMLElement | undefined
const click = async (needle: string) => {
  const el = byText(needle)
  if (!el) throw new Error('no clickable element: ' + needle)
  if ((el as HTMLButtonElement).disabled) throw new Error('element is disabled: ' + needle)
  await act(() => {
    el.click()
  })
}
const clickEl = async (el: HTMLElement) => {
  await act(() => {
    el.click()
  })
}
const goto = async (path: string) => {
  await act(async () => {
    await router.navigate({ to: path })
  })
  await act(() => sleep(0))
}
// React tracks an input's value on the node, so a direct assignment looks like
// "no change" to it. Go through the prototype setter the way a real UI event does.
const setRange = async (value: number) => {
  const input = document.getElementById('asof') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    'value',
  )!.set!
  await act(() => {
    setter.call(input, String(value))
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
}

console.log('\nShell')
const brand = document.querySelector('a[aria-label="Corredor home"]') as HTMLElement
check('the lockup links back to the landing page', brand?.getAttribute('href') === '/')

console.log('\nOverview')
check('hero line renders', text().includes('AI reads and explains. Code decides. A person approves.'))
check('pipeline stage count', (text().match(/Reconcile and book/g) || []).length >= 1)
check('rules badge counts active rules', /Rules pack v1 · \d of 9 active/.test(text()))

console.log('\nLoad the demo invoices')
await click('Load the demo invoices')
await act(() => sleep(1700))
check('four payouts loaded', text().includes('Decisions with sources') && text().includes('4/4'))
check('Mexico waits for a second approver', text().includes('needs a second approver'))

console.log('\nInbox')
await goto('/inbox')
const rows = () => [...document.querySelectorAll('[role="row"]')].slice(1)
check('four rows', rows().length === 4, String(rows().length))
const rowText = (i: number) => (rows()[i].textContent || '').replace(/\s+/g, ' ')
check('Brazil is ready via Ponte Digital', /Ponte Digital/.test(rowText(0)) && /Ready/.test(rowText(0)), rowText(0))
check('Mexico awaits 2nd approver', /Awaiting 2nd approver/.test(rowText(1)), rowText(1))
check('Argentina carries a warning', /1 warning/.test(rowText(2)), rowText(2))
check('Venezuela is blocked', /Blocked/.test(rowText(3)) && /No compliant route/.test(rowText(3)), rowText(3))

console.log('\nAs-of date reroutes (the demo moment)')
await click('Open Estúdio Paulista Design Ltda INV-2026-0412')
check('detail pane opened', text().includes('Rules checklist') && text().includes('Decision fingerprint'))
await setRange(5)
check('Sep 30 routes via PagaFX (pre Res. 561)', /PagaFX/.test(rowText(0)), rowText(0))
await setRange(6)
check('Oct 1 reroutes off the eFX provider', !/PagaFX/.test(rowText(0)) && /Ponte Digital/.test(rowText(0)), rowText(0))
check('toast names BR-561-EFX', text().includes('BR-561-EFX took effect'))
await setRange(35)
check('Oct 30 reroutes to the authorized VASP', /Sol VASP/.test(rowText(0)), rowText(0))
check('toast names BR-VASP-AUTH', text().includes('BR-VASP-AUTH took effect'))
await setRange(22)
check('back to today', /Ponte Digital/.test(rowText(0)), rowText(0))

console.log('\nApprove, pay, reconcile')
const ack = document.querySelector('.ack input') as HTMLInputElement
await clickEl(ack)
check('warning acknowledged', ack.checked)
await click('Approve as Maria Lopez')
check('approved and plan locked', text().includes('Plan locked at approval'))
await click('Pay $15,740.74 via Ponte Digital')
await act(() => sleep(1100))
check('payment refs appear', text().includes('Tx hash') && text().includes('Pix ref'))
await click('Reconcile and book')
check('booked', text().includes('Booked · view in ledger'))

console.log('\nLedger + audit chain')
await goto('/ledger')
check('journal entry booked', /JE-2026-10-/.test(text()) && text().includes('Matched'))
check('journal has an FX line', /FX (gain|loss)/.test(text()))
await goto('/audit')
check('chain verifies', /Chain verified · \d+ events/.test(text()))
const tamper = [...document.querySelectorAll('button')].find((b) =>
  (b.textContent || '').startsWith('Simulate tampering'),
) as HTMLElement
await clickEl(tamper)
check('tampering breaks the chain', /Chain broken at #\d/.test(text()))
await clickEl(
  [...document.querySelectorAll('button')].find(
    (b) => (b.textContent || '').trim() === 'Undo tamper',
  ) as HTMLElement,
)
check('undo restores the chain', /Chain verified/.test(text()))

console.log('\nAgent')
await goto('/agent')
await click('What needs my attention today?')
await act(() => sleep(1200))
check('agent answers with a status summary', /As of Oct 17, 2026:/.test(text()))
await click('Can we pay Transportes Orinoco?')
await act(() => sleep(1200))
check('sanctions answer cites VE-OFAC', text().includes('VE-OFAC'))
check('license sign-off card queued', text().includes('Record an OFAC general license'))

console.log('\nFraud defense')
await goto('/inbox')
await click('Simulate a suspicious invoice')
check('fifth invoice is held', text().includes('Security hold'))
check('injection is quoted, not followed', text().includes('Treated as data, not followed.'))
check('approval is frozen', text().includes('Approval is frozen until a person resolves this.'))

console.log('\nTrust + customize')
await goto('/trust')
check('radar proposal awaits compliance', text().includes('Awaiting compliance'))
check('agent has no money-moving tools', text().includes('No money-moving tools for the agent'))
await click('Approve as Daniel Ortiz · Compliance')
check('registry update applied', text().includes('Approved · Daniel Ortiz'))
await goto('/customize')
check('rules pack lists 9 rules', (text().match(/Hard block|Warning|Required fields/g) || []).length >= 9)
await clickEl(
  [...document.querySelectorAll('button')].find((b) =>
    (b.textContent || '').startsWith('Fewest warnings'),
  ) as HTMLElement,
)
check(
  'routing preference is applied to the engine',
  (document.querySelector('[aria-label="Routing preference"] [aria-pressed="true"]')
    ?.textContent || '').startsWith('Fewest warnings'),
)
// A booked payout keeps the plan locked at approval, so the preference must
// not move it; what it must do is reach the engine and the audit chain.
await goto('/inbox')
check(
  'a booked payout keeps its locked plan',
  /Ponte Digital/.test(document.querySelectorAll('[role="row"]')[1].textContent || ''),
)
await goto('/audit')
check(
  'the preference change is in the audit log',
  text().includes('Routing preference set to Fewest warnings'),
)
check('settings changes are attributed to a person', text().includes('(by Maria Lopez)'))

console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'all checks passed'))
process.exit(failures ? 1 : 0)
