import { useEffect, useState } from 'react'
import { drift, unit } from './rng'

/**
 * The host clock.
 *
 * Every seat runs the same 1800s cycle, phase-locked to real UTC time. The
 * consequence that matters: state is a pure function of wall-clock time, so
 * two people loading the site at the same moment are looking at the same frame
 * of the same machine. It reads as one system rather than four animations.
 */

export const CYCLE = 1800
const EPOCH = Date.UTC(2026, 0, 1) / 1000

/** Seconds since the host was provisioned. */
export function uptime(): number {
  return Date.now() / 1000 - EPOCH
}

/** Position within the current 1800s cycle. */
export function cyclePos(now = uptime()): number {
  return ((now % CYCLE) + CYCLE) % CYCLE
}

export function cycleIndex(now = uptime()): number {
  return Math.floor(now / CYCLE)
}

/** Convert host-uptime seconds back to a wall-clock instant. */
export function atDate(at: number): Date {
  return new Date((EPOCH + at) * 1000)
}

/* ------------------------------------------------------------- treasury -- */

const TREASURY_SEED = 0x7a11
const BASE = 24_000
/** Dollars accrued per completed cycle: floor plus a hashed shipped-unit step. */
const FLOOR = 9
const STEP = 18

/**
 * Creator fees arrive as a continuous drip; shipped units land as steps. The
 * sum of both is what the counter shows. Accrual is integrated over every
 * elapsed cycle so the figure is continuous across reloads and always rises.
 */
let cachedIdx = -1
let cachedSum = 0

function accrued(idx: number): number {
  if (idx === cachedIdx) return cachedSum
  let sum = 0
  const start = Math.max(0, idx - 40_000)
  for (let i = start; i < idx; i++) sum += FLOOR + unit(TREASURY_SEED ^ i) * STEP
  cachedIdx = idx
  cachedSum = sum
  return sum
}

export function treasury(now = uptime()): number {
  if (now <= 0) return BASE
  const idx = cycleIndex(now)
  const within = cyclePos(now) / CYCLE
  const partial = (FLOOR + unit(TREASURY_SEED ^ idx) * STEP) * within
  return BASE + accrued(idx) + partial
}

/**
 * Fee inflow in dollars per hour. Derived from the same per-cycle accrual the
 * treasury integrates, so the two readouts can never contradict each other.
 */
export function feeRate(now = uptime()): number {
  const perCycle = FLOOR + STEP / 2
  return perCycle * (3600 / CYCLE) + drift(TREASURY_SEED, now, 900) * 7
}

/* ---------------------------------------------------------------- hooks -- */

/**
 * Re-render on an interval. Used instead of rAF for anything textual: at 11px
 * a value that changes 60 times a second is unreadable noise, and the clock
 * only needs to be right, not smooth.
 */
export function useTick(ms = 1000): number {
  const [, set] = useState(0)
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(id)
  }, [ms])
  return Date.now()
}
