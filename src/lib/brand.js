/**
 * Brand primitives shared by the running site and the offline asset generator.
 *
 * Plain JS rather than TS so scripts/generate-brand.mjs can import it directly
 * under Node — the same arrangement factoryArt.js uses. Seat colour and the
 * portraits live here and nowhere else; data/agents.ts and components/Avatar.tsx
 * both read from this file, so a colour change lands on the site, the favicon
 * and the social art in one edit.
 */

/** Seat identity colours, in seat order. */
export const SEAT_COLORS = ['#6fb4d4', '#8cc07a', '#d8845f', '#a894d6']

/**
 * 16x16 portraits, one per seat. Hand-authored rather than generated: an
 * identicon gives four different blobs, and what is wanted is four recognisable
 * faces. Each carries one distinguishing feature — visor, headset, hood,
 * beacon — so they stay apart at 16px in a favicon.
 *
 *   . transparent   K outline   B base   D shade   W highlight
 */
export const SPRITES = [
  // 0 xFRONT — full visor
  [
    '................',
    '....KKKKKKKK....',
    '...KBBBBBBBBK...',
    '..KBBBBBBBBBBK..',
    '..KBBBBBBBBBBK..',
    '..KWWWWWWWWWWK..',
    '..KWKKWWWWKKWK..',
    '..KBBBBBBBBBBK..',
    '..KBBBBBBBBBBK..',
    '...KBBBBBBBBK...',
    '....KKBBBBKK....',
    '...KDDDDDDDDK...',
    '..KDDDDDDDDDDK..',
    '.KDDDDDDDDDDDDK.',
    '.KDDDDDDDDDDDDK.',
    '.KDDDDDDDDDDDDK.',
  ],
  // 1 xCORE — headset band
  [
    '................',
    '....KKKKKKKK....',
    '...KBBBBBBBBK...',
    '..KBBBBBBBBBBK..',
    '..KBBBBBBBBBBK..',
    '..KBKKBBBBKKBK..',
    '..KBKKBBBBKKBK..',
    '..KBBBBBBBBBBK..',
    '..KBBBKKKKBBBK..',
    '...KBBBBBBBBK...',
    '....KKBBBBKK....',
    '...KDDDDDDDDK...',
    '..KDDDDDDDDDDK..',
    '.KDDDDDDDDDDDDK.',
    '.KDDDDDDDDDDDDK.',
    '.KDDDDDDDDDDDDK.',
  ],
  // 2 xBREAK — hood
  [
    '................',
    '...KKKKKKKKKK...',
    '..KDDDDDDDDDDK..',
    '..KDBBBBBBBBDK..',
    '..KDBBBBBBBBDK..',
    '..KDBKKBBKKBDK..',
    '..KDBKKBBKKBDK..',
    '..KDBBBBBBBBDK..',
    '..KDBBBBBBBBDK..',
    '...KDBBBBBBDK...',
    '....KKDDDDKK....',
    '...KDDDDDDDDK...',
    '..KDDDDDDDDDDK..',
    '.KDDDDDDDDDDDDK.',
    '.KDDDDDDDDDDDDK.',
    '.KDDDDDDDDDDDDK.',
  ],
  // 3 xPIPE — beacon
  [
    '.......KK.......',
    '......KWWK......',
    '....KKKKKKKK....',
    '...KBBBBBBBBK...',
    '..KBBBBBBBBBBK..',
    '..KBKKBBBBKKBK..',
    '..KBKKBBBBKKBK..',
    '..KBBBBBBBBBBK..',
    '..KBBBBBBBBBBK..',
    '...KBBBBBBBBK...',
    '....KKBBBBKK....',
    '...KDDDDDDDDK...',
    '..KDDDDDDDDDDK..',
    '.KDDDDDDDDDDDDK.',
    '.KDDDDDDDDDDDDK.',
    '.KDDDDDDDDDDDDK.',
  ],
]

// A malformed sprite fails silently as a subtly clipped portrait. Fail loudly
// at import instead.
for (const [i, rows] of SPRITES.entries()) {
  if (rows.length !== 16 || rows.some((r) => r.length !== 16)) {
    throw new Error(`avatar sprite ${i} is not 16x16`)
  }
}

/** Blend a hex colour toward 0 (black) or 255 (white). */
export function mix(hex, target, amount) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(c + (target - c) * amount),
  )
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Palette for one seat. The portrait is always drawn in the seat's colour at
 * full strength — never dimmed to fit its surroundings. Where a portrait would
 * otherwise sit on its own colour, the *ground* is darkened instead (see
 * QUADRANT_GROUND).
 *
 *   dark — a dark UI surface. Shoulders stepped down enough to separate head
 *          from torso at 20px.
 *   flat — a large format where the portrait is the subject rather than an
 *          icon. Shoulders barely stepped, so the figure reads as one bright
 *          shape instead of a lit head above a murky body.
 */
export function paletteFor(color, on = 'dark') {
  return {
    K: '#0d0d0d',
    B: color,
    D: mix(color, 0, on === 'flat' ? 0.14 : 0.44),
    W: mix(color, 255, 0.6),
  }
}

/**
 * Backing colour for a quadrant of the profile mark: the seat's colour taken
 * well down toward black. Deep enough that a full-strength portrait reads
 * cleanly on top, while the panel is still unmistakably that seat's hue.
 */
export function quadrantGround(color) {
  return mix(color, 0, 0.66)
}

/** Horizontal runs of identical pixels — fewer rects, identical output. */
export function spriteRuns(seat) {
  const rows = SPRITES[seat] ?? SPRITES[0]
  const runs = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < 16) {
      const c = row[x]
      if (c === '.') {
        x++
        continue
      }
      let w = 1
      while (x + w < 16 && row[x + w] === c) w++
      runs.push({ x, y, w, key: c })
      x += w
    }
  })
  return runs
}
