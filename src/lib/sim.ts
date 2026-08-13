import type { Beat, CommsMsg, LedgerLine, MetricSpec, Pane, Session } from '../data/types'
import { INTERLOCK, SESSIONS } from '../data/sessions'
import { COMMS } from '../data/comms'
import { CYCLE, cyclePos, uptime } from './clock'
import { drift } from './rng'

/**
 * Resolves "what is seat N doing right now" from the authored cycle plus the
 * host clock. Pure — no state, no timers. Callers re-render on a tick and read
 * a fresh answer.
 *
 * Everything reads one cycle into the past as well as the current one, so the
 * panes, notes and ledger always have scrollback and never blank out in the
 * first seconds after a cycle boundary.
 */

const PANES: Pane[] = ['editor', 'browser', 'tty', 'git']

export function sessionFor(seat: number): Session {
  return SESSIONS[seat] ?? SESSIONS[0]
}

/** A beat resolved to absolute time, so items can be ordered across cycles. */
export interface Dated<T> {
  at: number
  item: T
}

/**
 * Flatten the looped timeline into absolute seconds covering the previous and
 * current cycle, clipped to `now`.
 */
function window_<T extends { t: number }>(items: T[], now: number): Dated<T>[] {
  const pos = cyclePos(now)
  const start = now - pos
  const out: Dated<T>[] = []
  for (const item of items) {
    if (item.t > pos) out.push({ at: start - CYCLE + item.t, item })
    else out.push({ at: start + item.t, item })
  }
  out.sort((a, b) => a.at - b.at)
  return out
}

export type SeatStatus = 'running' | 'idle' | 'hold'

export interface SeatState {
  status: SeatStatus
  label: string
  blk: string
  /** Pane the seat is currently working in. */
  active: Pane
  /** Latest beat overall. */
  current: Dated<Beat>
  /** Latest beat per pane — what each pane should be showing. */
  panes: Record<Pane, Dated<Beat> | undefined>
  /** Note stream, newest first. */
  notes: Dated<Beat>[]
  /** Landed git activity, newest first. */
  git: Dated<Beat>[]
  /** 0..1 through the current work item. */
  progress: number
  session: Session
}

export function seatState(seat: number, now = uptime()): SeatState {
  const session = sessionFor(seat)
  const dated = window_(session.beats, now).filter((d) => d.at <= now)
  const current = dated[dated.length - 1] ?? { at: now, item: session.beats[0] }

  const panes = {} as Record<Pane, Dated<Beat> | undefined>
  for (const p of PANES) {
    for (let i = dated.length - 1; i >= 0; i--) {
      if (dated[i].item.pane === p) {
        panes[p] = dated[i]
        break
      }
    }
  }

  const notes = dated.filter((d) => d.item.note).reverse()
  // Notes sometimes carry a branch ref for context; they belong in the notes
  // rail, not in the git log.
  const git = dated.filter((d) => d.item.ref && d.item.kind !== 'note').reverse()

  // Status is derived, never authored: a seat is held if the host ledger
  // raised a warning against it recently, idle if nothing has happened for a
  // while, otherwise running.
  const recent = window_(INTERLOCK.ledger, now).filter(
    (d) => d.at <= now && d.item.seat === seat,
  )
  const last = recent[recent.length - 1]
  let status: SeatStatus = 'running'
  if (last && last.item.level === 'warn' && now - last.at < 150) status = 'hold'
  else if (now - current.at > 110) status = 'idle'

  return {
    status,
    label: status === 'hold' ? 'HOLD' : status === 'idle' ? 'IDLE' : 'ONLINE',
    blk: status === 'hold' ? 'blk-sig' : status === 'idle' ? 'blk-idle' : 'blk-on',
    active: current.item.pane,
    current,
    panes,
    notes,
    git,
    progress: cyclePos(now) / CYCLE,
    session,
  }
}

/* --------------------------------------------------------------- metrics -- */

export function metricNow(m: MetricSpec, seat: number, i: number, now = uptime()): number {
  const seed = (seat + 1) * 1013 + i * 37
  if (m.kind === 'counter') {
    const through = 0.04 + 0.96 * (cyclePos(now) / CYCLE)
    return Math.max(0, m.base * through + drift(seed, now, 60) * m.drift)
  }
  const v = m.base + drift(seed, now, 240) * m.drift
  return m.kind === 'percent' ? Math.min(100, Math.max(0, v)) : Math.max(0, v)
}

/* ---------------------------------------------------------------- ledger -- */

export function ledgerUpTo(now = uptime(), count = 40): Dated<LedgerLine>[] {
  return window_(INTERLOCK.ledger, now)
    .filter((d) => d.at <= now)
    .slice(-count)
}

export function crossRefsUpTo(now = uptime(), count = 4) {
  return window_(INTERLOCK.crossRefs, now)
    .filter((d) => d.at <= now)
    .slice(-count)
    .reverse()
}

/* ----------------------------------------------------------------- comms -- */

/**
 * The shared channel, windowed like the ledger. Pass a seat to narrow it to
 * that seat's own traffic: what it said, what was addressed to it, and its own
 * private notes — but not two other seats talking to each other.
 */
export function commsUpTo(now = uptime(), count = 60, seat?: number): Dated<CommsMsg>[] {
  let msgs = window_(COMMS, now).filter((d) => d.at <= now)
  if (seat !== undefined) {
    msgs = msgs.filter((d) => d.item.from === seat || d.item.to === seat)
  }
  return msgs.slice(-count)
}
