// Screenshot pass over the running dev server. Dev-only helper.
import puppeteer from 'puppeteer'

const base = process.env.BASE || 'http://localhost:5173'
const out = '.shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 1000 } })
const page = await browser.newPage()

const shoot = async (name, full = false) => {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full })
  console.log('shot', name)
}
const clickText = async (text) => {
  const handle = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button, a')]
    return els.find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim() === t) || null
  }, text)
  const el = handle.asElement()
  if (!el) throw new Error('no element: ' + text)
  await el.click()
}

await page.goto(base, { waitUntil: 'networkidle0' })
await sleep(900)
await shoot('0-landing-hero')
await shoot('0-landing-full', true)

await page.goto(base + '/app', { waitUntil: 'networkidle0' })
await sleep(600)
await clickText('Load the demo invoices')
await sleep(2000)
await shoot('2-overview-loaded', true)

// Navigate in-app: a reload would reset the in-memory demo state.
await clickText('Inbox')
await sleep(500)
await clickText('Open')
await sleep(400)
await shoot('3-inbox-detail', true)

await clickText('Agent')
await sleep(400)
await clickText('What needs my attention today?')
await sleep(1600)
await shoot('4-agent')

await clickText('Audit')
await sleep(400)
await shoot('5-audit')

await browser.close()
