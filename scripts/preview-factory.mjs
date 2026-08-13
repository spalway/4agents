/**
 * Renders the factory artwork to the terminal.
 *
 * The pixel factory is the page's centrepiece and there is no way to judge an
 * isometric composition from a pixel count — so this draws it into a plain
 * framebuffer using the same geometry module the browser uses and prints it as
 * ASCII. Rows are averaged in pairs because terminal cells are about twice as
 * tall as they are wide, which keeps the 2:1 isometric proportions honest.
 *
 *   node scripts/preview-factory.mjs [frame]
 */
import { W, H, drawFactory } from '../src/lib/factoryArt.js'

/* Same hash the component uses, so lit windows match what ships. */
function hash32(n) {
  let x = n | 0
  x = Math.imul(x ^ (x >>> 16), 2246822507)
  x = Math.imul(x ^ (x >>> 13), 3266489909)
  x ^= x >>> 16
  return x >>> 0
}
const unit = (n) => hash32(n) / 4294967296
const rand = (a, b) => unit(hash32(a) ^ Math.imul(b + 0x9e3779b9, 2654435761))

/** Page background the canvas is transparent against — untouched pixels must
 *  read as this, not as black, or the tone separation looks wrong. */
const PAGE_BG = 36 / 255

/** Minimal { fillStyle, fillRect } raster that composites onto the page grey. */
function createRaster() {
  const buf = new Float32Array(W * H).fill(PAGE_BG)
  let r = 1
  let a = 1
  return {
    buf,
    set fillStyle(v) {
      // Luminance only; the palette is monochrome apart from the beacon.
      const hex = /^#([0-9a-f]{6})$/i.exec(v)
      if (hex) {
        const n = parseInt(hex[1], 16)
        r = (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255
        a = 1
        return
      }
      const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(v)
      if (!m) throw new Error(`preview raster cannot parse colour: ${v}`)
      r = (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) / 255
      a = m[4] === undefined ? 1 : +m[4]
    },
    get fillStyle() {
      return ''
    },
    fillRect(x, y, w, h) {
      for (let yy = Math.round(y); yy < Math.round(y) + h; yy++) {
        if (yy < 0 || yy >= H) continue
        for (let xx = Math.round(x); xx < Math.round(x) + w; xx++) {
          if (xx < 0 || xx >= W) continue
          const i = yy * W + xx
          buf[i] = buf[i] * (1 - a) + r * a
        }
      }
    },
  }
}

const frame = Number(process.argv[2] ?? 0)
const g = createRaster()
drawFactory(g, frame, rand)

const RAMP = ' .:-=+*#%@'
const lines = []
for (let y = 0; y < H; y += 2) {
  let row = ''
  for (let x = 0; x < W; x++) {
    const a = g.buf[y * W + x]
    const b = y + 1 < H ? g.buf[(y + 1) * W + x] : a
    const v = Math.max(a, b) * 0.72 + ((a + b) / 2) * 0.28
    row += RAMP[Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1)))]
  }
  lines.push(row.replace(/\s+$/, ''))
}

console.log(`frame ${frame} — ${W}x${H}, rows paired\n`)
console.log(lines.join('\n'))
