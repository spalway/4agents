/**
 * Isometric pixel factory — the artwork, with no rendering backend attached.
 *
 * Written against a two-method raster interface ({ fillStyle, fillRect }) that
 * a canvas 2D context satisfies natively. That keeps the art renderable
 * headlessly, which is the only way to actually look at it during development:
 * scripts/preview-factory.mjs draws it into a framebuffer and prints it.
 *
 * Plain JS rather than TS so both Vite and bare node can import the same file
 * and there is no second copy of the geometry to drift out of sync.
 *
 * Canvas path filling antialiases, which at this scale turns every edge into
 * grey mush. Faces are rasterised with an explicit scanline fill and edges with
 * Bresenham; no path API is used anywhere.
 *
 * @typedef {object} Raster
 * @property {string | CanvasGradient | CanvasPattern} fillStyle
 * @property {(x: number, y: number, w: number, h: number) => void} fillRect
 */

/**
 * Canvas is sized to the model's bounds rather than left oversized — dead
 * margin is wasted resolution once the buffer is scaled up to 600px, and the
 * pixels are the point.
 */
const S = 1.4
export const W = 152
export const H = 124
const OX = 75
const OY = 47

/** Standard 2:1 isometric. @returns {[number, number]} */
function iso(x, y, z) {
  return [OX + (x - y) * 2 * S, OY + (x + y) * S - z * S]
}

/** Scanline polygon fill. Integer spans only — no antialiasing. */
function poly(g, pts, fill) {
  let min = Infinity
  let max = -Infinity
  for (const [, y] of pts) {
    if (y < min) min = y
    if (y > max) max = y
  }
  const y0 = Math.max(0, Math.ceil(min))
  const y1 = Math.min(H - 1, Math.floor(max))
  g.fillStyle = fill
  for (let y = y0; y <= y1; y++) {
    const sy = y + 0.5
    const xs = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      if (ay === by) continue
      if (sy >= Math.min(ay, by) && sy < Math.max(ay, by)) {
        xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax))
      }
    }
    if (xs.length < 2) continue
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.round(xs[i])
      const xb = Math.round(xs[i + 1])
      if (xb > xa) g.fillRect(xa, y, xb - xa, 1)
    }
  }
}

/** Bresenham, one pixel wide, for seams between adjoining volumes. */
function line(g, a, b, fill) {
  let x0 = Math.round(a[0])
  let y0 = Math.round(a[1])
  const x1 = Math.round(b[0])
  const y1 = Math.round(b[1])
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  g.fillStyle = fill
  for (;;) {
    g.fillRect(x0, y0, 1, 1)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

/**
 * Opaque greys, deliberately not white-with-alpha.
 *
 * Semi-transparent faces composite with whatever is already beneath them, so a
 * roof drawn under a clerestory lands brighter than the same roof in the open
 * and the flat-shaded look falls apart. Opaque tones replace instead of
 * accumulating, which is what keeps every top face reading as one surface.
 */
const SOLID = { top: '#dcdcdc', left: '#585858', right: '#3a3a3a' }
const SLAB = { top: '#303030', left: '#262626', right: '#1e1e1e' }
const SEAM = '#151515'
const LIT = '#b4b4b4'
const UNLIT = '#2a2a2a'

function box(g, x, y, z, w, d, h, tone = SOLID) {
  const a = iso(x, y, z + h)
  const b = iso(x + w, y, z + h)
  const c = iso(x + w, y + d, z + h)
  const e = iso(x, y + d, z + h)
  const cb = iso(x + w, y + d, z)
  const eb = iso(x, y + d, z)
  const bb = iso(x + w, y, z)

  poly(g, [a, b, c, e], tone.top)
  poly(g, [e, c, cb, eb], tone.left)
  poly(g, [b, c, cb, bb], tone.right)

  // Outline every visible edge, not just the interior spine. Two adjoining
  // volumes present the same tone on facing surfaces, and without a full
  // silhouette they fuse into one unreadable mass.
  for (const [p, q] of [
    [a, b],
    [b, c],
    [c, e],
    [e, a],
    [c, cb],
    [cb, eb],
    [eb, e],
    [cb, bb],
    [bb, b],
  ]) {
    line(g, p, q, SEAM)
  }
}

/** Fill a rectangle lying on a constant-y plane (a left-facing wall). */
function wallY(g, xa, xb, y, za, zb, fill) {
  poly(g, [iso(xa, y, zb), iso(xb, y, zb), iso(xb, y, za), iso(xa, y, za)], fill)
}

function px(g, p, fill, s = 1) {
  g.fillStyle = fill
  g.fillRect(Math.round(p[0]), Math.round(p[1]), s, s)
}

/* -------------------------------------------------------------- sequence -- */

// Painter's order, back to front. Hand-ordered rather than sorted: the tower
// cap sits on top of the tower and must follow it regardless of its origin.

/**
 * @param {Raster} g
 * @param {number} frame
 * @param {(a: number, b: number) => number} rand deterministic unit hash
 */
export function drawFactory(g, frame, rand) {
  // Plinth. Kept tight, and the massing above is spread across the whole
  // footprint — an empty quadrant projects straight to the bottom vertex and
  // leaves a bare diamond under the building.
  box(g, 0, 1, 0, 27, 24, 2, SLAB)

  // Main hall.
  box(g, 2, 3, 2, 17, 15, 10)
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 2.9
    const lit = rand(11 + i, Math.floor(frame / 26)) > 0.6
    wallY(g, x, x + 1.9, 18, 5, 8.4, lit ? LIT : UNLIT)
  }

  // Clerestory strip along the roof.
  box(g, 4, 5, 12, 13, 11, 3)

  // Chimneys.
  box(g, 5, 6, 15, 3, 3, 15)
  box(g, 10, 6, 15, 2, 2, 10)

  // Silo and its cap, back-right.
  box(g, 21, 3, 2, 5, 5, 13)
  box(g, 20.4, 2.4, 15, 6.2, 6.2, 1)

  // Four output units down the right flank — one per seat.
  for (let i = 0; i < 4; i++) {
    box(g, 21, 10 + i * 2.3, 2, 4, 1.7, 2 + (rand(70 + i, Math.floor(frame / 16)) > 0.5 ? 1.3 : 0))
  }

  // Annex, front-left.
  box(g, 2, 19, 2, 9, 5, 5)
  for (let i = 0; i < 3; i++) {
    const x = 3.5 + i * 2.6
    const lit = rand(31 + i, Math.floor(frame / 34)) > 0.55
    wallY(g, x, x + 1.7, 24, 3.4, 5.6, lit ? LIT : UNLIT)
  }

  // Loading dock, running out to the front vertex.
  box(g, 13, 19, 2, 12, 5, 3.5)

  // Exhaust. Deterministic drift so the plume reads as continuous.
  for (const [cx, cy, cz, seed, n] of [
    [6.5, 7.5, 30, 5, 9],
    [11, 7, 25, 9, 6],
  ]) {
    const [bx, by] = iso(cx, cy, cz)
    for (let k = 0; k < n; k++) {
      const age = (frame * 0.5 + k * 2.4) % (n * 2.4)
      const wob = (rand(seed + k, Math.floor((frame * 0.5 + k * 2.4) / 6)) - 0.5) * 5
      const a = 0.34 * (1 - age / (n * 2.4))
      if (a <= 0.02) continue
      px(g, [bx + wob, by - 2 - age * 1.15], `rgba(255,255,255,${a.toFixed(3)})`, age > 8 ? 2 : 1)
    }
  }

  // Silo beacon.
  if (Math.floor(frame / 9) % 2 === 0) px(g, iso(23.5, 5.5, 16), 'rgba(255,176,0,0.95)', 2)
}
