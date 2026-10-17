// One-off: samples the brand yellow from the reference artwork and lifts the
// header horse mark out of it as a transparent PNG.
import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = process.argv[2]
const browser = await puppeteer.launch()
const page = await browser.newPage()

const result = await page.evaluate(async (src) => {
  const img = new Image()
  img.src = src
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height)

  const px = (x, y) => {
    const i = (y * width + x) * 4
    return [data[i], data[i + 1], data[i + 2]]
  }
  // Yellow = red and green both high, blue low.
  const isYellow = ([r, g, b]) => r > 150 && g > 170 && b < 120 && g - b > 90

  // Dominant yellow across the whole page, quantised.
  const counts = new Map()
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const p = px(x, y)
      if (!isYellow(p)) continue
      const k = p.map((v) => Math.round(v / 8) * 8).join(',')
      counts.set(k, (counts.get(k) || 0) + 1)
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Header mark: the yellow cluster in the top-left corner.
  let x0 = width, y0 = height, x1 = 0, y1 = 0
  const scanW = Math.round(width * 0.14)
  const scanH = Math.round(height * 0.05)
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      if (!isYellow(px(x, y))) continue
      if (x < x0) x0 = x
      if (y < y0) y0 = y
      if (x > x1) x1 = x
      if (y > y1) y1 = y
    }
  }
  const pad = 2
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
  x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad)
  const mw = x1 - x0 + 1
  const mh = y1 - y0 + 1

  // Upscale the crop, then key it to a flat silhouette with soft edges.
  const S = 8
  const out = document.createElement('canvas')
  out.width = mw * S
  out.height = mh * S
  const octx = out.getContext('2d')
  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(img, x0, y0, mw, mh, 0, 0, out.width, out.height)
  const od = octx.getImageData(0, 0, out.width, out.height)
  for (let i = 0; i < od.data.length; i += 4) {
    const r = od.data[i], g = od.data[i + 1], b = od.data[i + 2]
    // Luma of the yellow-vs-black separation drives the alpha.
    const lum = (0.3 * r + 0.6 * g + 0.1 * b) / 255
    const a = Math.max(0, Math.min(1, (lum - 0.12) / 0.5))
    od.data[i] = 255; od.data[i + 1] = 255; od.data[i + 2] = 255
    od.data[i + 3] = Math.round(a * 255)
  }
  octx.putImageData(od, 0, 0)

  return { top, box: { x0, y0, mw, mh }, png: out.toDataURL('image/png'), width, height }
}, 'data:image/jpeg;base64,' + readFileSync(SRC).toString('base64'))

console.log('image', result.width + 'x' + result.height)
console.log('mark box', JSON.stringify(result.box))
console.log('dominant yellows (r,g,b → count):')
for (const [k, n] of result.top) {
  const [r, g, b] = k.split(',').map(Number)
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  console.log('  ' + hex + '  ' + k + '  ×' + n)
}
writeFileSync('public/corredor-mark.png', Buffer.from(result.png.split(',')[1], 'base64'))
console.log('wrote public/corredor-mark.png')
await browser.close()
