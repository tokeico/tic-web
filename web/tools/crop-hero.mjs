// One-off: lifts the hero coin visual (coin, glow, rails, flag chips) out of the
// brand artwork and writes it as the landing page's hero image.
import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = process.argv[2]
const [X, Y, W, H, SCALE] = process.argv.slice(3).map(Number)

const browser = await puppeteer.launch()
const page = await browser.newPage()
const out = await page.evaluate(
  async (src, x, y, w, h, scale) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const c = document.createElement('canvas')
    c.width = w * scale
    c.height = h * scale
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, x, y, w, h, 0, 0, c.width, c.height)
    return { png: c.toDataURL('image/png'), w: c.width, h: c.height, src: [img.naturalWidth, img.naturalHeight] }
  },
  'data:image/jpeg;base64,' + readFileSync(SRC).toString('base64'),
  X, Y, W, H, SCALE,
)
writeFileSync(process.env.OUT || 'public/hero-coin.png', Buffer.from(out.png.split(',')[1], 'base64'))
console.log('source', out.src.join('x'), '→', process.env.OUT || 'public/hero-coin.png', out.w + 'x' + out.h)
await browser.close()
