/**
 * Renders the social and favicon art from the same portraits the site uses.
 *
 *   node scripts/generate-brand.mjs
 *
 * Writes to public/brand/. Everything is drawn at an integer multiple of the
 * 16px sprite grid and encoded directly — no resampling anywhere in the
 * pipeline, because a downscaled pixel portrait turns to mush. That is also
 * why each favicon size is rendered natively rather than scaled from the big
 * one.
 *
 * PNG is written by hand (zlib is the only dependency, and it ships with Node)
 * rather than pulling in a canvas library for four rectangles.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEAT_COLORS, SEAT_NAMES, paletteFor, quadrantGround, spriteRuns } from '../src/lib/brand.js'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/brand')

/* --------------------------------------------------------------- encoder -- */

const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Encode an RGBA buffer as a PNG. */
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // Each scanline is prefixed with filter type 0 (none); the art is flat
  // colour, so a smarter filter would not pay for itself.
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------------------------------------------------------- canvas -- */

function hex(c) {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function canvas(w, h) {
  const buf = Buffer.alloc(w * h * 4)
  return {
    w,
    h,
    buf,
    fill(x0, y0, rw, rh, color) {
      const [r, g, b] = hex(color)
      const xEnd = Math.min(w, x0 + rw)
      const yEnd = Math.min(h, y0 + rh)
      for (let y = Math.max(0, y0); y < yEnd; y++) {
        for (let x = Math.max(0, x0); x < xEnd; x++) {
          const i = (y * w + x) * 4
          buf[i] = r
          buf[i + 1] = g
          buf[i + 2] = b
          buf[i + 3] = 255
        }
      }
    },
    /** Draw seat `seat`'s portrait with its top-left at (ox, oy), `s` px per sprite pixel. */
    sprite(seat, ox, oy, s, on) {
      const palette = paletteFor(SEAT_COLORS[seat], on)
      for (const run of spriteRuns(seat)) {
        this.fill(ox + run.x * s, oy + run.y * s, run.w * s, s, palette[run.key])
      }
    },
    png() {
      return encodePNG(w, h, buf)
    },
  }
}

/* ----------------------------------------------------------------- pieces -- */

const BANNER_BG = '#000000'

/**
 * Four quadrants, each a seat's colour with that seat's portrait on it.
 * `size` must be divisible by 2, and half of it by 16, so every sprite pixel
 * lands on a whole device pixel.
 */
function quadrantMark(size) {
  const c = canvas(size, size)
  const half = size / 2
  // The portrait sits at the largest integer scale that leaves a margin, so it
  // never touches the quadrant seam.
  const scale = Math.max(1, Math.floor((half * 0.8) / 16))
  const inset = Math.round((half - scale * 16) / 2)

  SEAT_COLORS.forEach((color, seat) => {
    const qx = (seat % 2) * half
    const qy = Math.floor(seat / 2) * half
    c.fill(qx, qy, half, half, quadrantGround(color))
    c.sprite(seat, qx + inset, qy + inset, scale, 'flat')
  })
  return c
}

/** One seat alone on its own square — same proportions as a quadrant of the
 *  four-up mark, so a solo avatar sits beside it without looking like a
 *  different set. */
function soloMark(seat, size) {
  const c = canvas(size, size)
  const scale = Math.max(1, Math.floor((size * 0.8) / 16))
  const inset = Math.round((size - scale * 16) / 2)
  c.fill(0, 0, size, size, quadrantGround(SEAT_COLORS[seat]))
  c.sprite(seat, inset, inset, scale, 'flat')
  return c
}

/** Black field, four portraits centred in a row. */
function banner(w, h, scale, gap) {
  const c = canvas(w, h)
  c.fill(0, 0, w, h, BANNER_BG)
  const each = 16 * scale
  const total = each * 4 + gap * 3
  const x0 = Math.round((w - total) / 2)
  const y0 = Math.round((h - each) / 2)
  for (let seat = 0; seat < 4; seat++) {
    c.sprite(seat, x0 + seat * (each + gap), y0, scale, 'flat')
  }
  return c
}

/* ------------------------------------------------------------------ main -- */

mkdirSync(OUT, { recursive: true })

const assets = [
  // Twitter header is 1500x500; the row sits in the centre, which is the part
  // that survives every crop.
  ['banner.png', banner(1500, 500, 6, 4)],
  // Profile picture. Twitter wants >=400 square and renders it as a circle,
  // so the quadrant seams read as a cross through the middle.
  ['pfp.png', quadrantMark(512)],
  ['favicon-32.png', quadrantMark(32)],
  ['favicon-64.png', quadrantMark(64)],
  ['apple-touch-icon.png', quadrantMark(192)],
  ...SEAT_NAMES.map((n, seat) => [`pfp-${n.toLowerCase()}.png`, soloMark(seat, 512)]),
]

for (const [name, c] of assets) {
  const png = c.png()
  writeFileSync(resolve(OUT, name), png)
  console.log(`  ${name.padEnd(22)} ${c.w}x${c.h}  ${(png.length / 1024).toFixed(1)} kB`)
}
console.log(`\nwrote ${assets.length} files to public/brand/`)
