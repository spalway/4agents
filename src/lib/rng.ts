/**
 * Deterministic hashing. Every number the site shows is derived from the wall
 * clock through these functions, so two visitors loading at the same instant
 * see byte-identical state. Nothing is ever Math.random().
 */

export function hash32(n: number): number {
  let x = n | 0
  x = Math.imul(x ^ (x >>> 16), 2246822507)
  x = Math.imul(x ^ (x >>> 13), 3266489909)
  x ^= x >>> 16
  return x >>> 0
}

/** Hash to the unit interval. */
export function unit(n: number): number {
  return hash32(n) / 4294967296
}

/** Hash to a range. */
export function span(n: number, lo: number, hi: number): number {
  return lo + unit(n) * (hi - lo)
}

/** Two-input hash, for (entity, tick) pairs. */
export function unit2(a: number, b: number): number {
  return unit(hash32(a) ^ Math.imul(b + 0x9e3779b9, 2654435761))
}

/**
 * Smooth deterministic wobble in [-1, 1]. Interpolates between hashed values at
 * integer ticks so metrics drift instead of jittering.
 */
export function drift(seed: number, t: number, period: number): number {
  const p = t / period
  const i = Math.floor(p)
  const f = p - i
  const a = unit2(seed, i) * 2 - 1
  const b = unit2(seed, i + 1) * 2 - 1
  const e = f * f * (3 - 2 * f)
  return a + (b - a) * e
}
