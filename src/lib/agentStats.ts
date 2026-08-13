import { CYCLE, cyclePos, uptime } from './clock'
import { drift, unit } from './rng'
import { mmss } from './format'
import { seatState } from './sim'

/**
 * Runtime telemetry for an instance — the numbers you would actually watch on
 * an agent that bills by the token.
 *
 * Everything is a pure function of the host clock, like the rest of the site,
 * so all four instances stay consistent across reloads and between visitors.
 * `actions` is not synthesised at all: it counts the beats the seat has really
 * executed this cycle, which keeps the fabricated figures anchored to
 * something the page can be checked against.
 */

export interface Stat {
  label: string
  value: string
  /** Optional second-line context, e.g. a rate or a limit. */
  sub?: string
}

/** Tokens per second, per seat. Adversarial work reads far more than it writes. */
const TOK_RATE = [186, 224, 312, 158]
const CTX_LIMIT = 200_000

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

export function agentStats(seat: number, now = uptime()): Stat[] {
  const pos = cyclePos(now)
  const st = seatState(seat, now)

  const rate = TOK_RATE[seat] ?? 200
  const wobble = 1 + drift(seat * 71 + 5, now, 180) * 0.22
  const tokens = pos * rate * wobble

  // Context fills through the cycle and gets compacted when it runs hot, which
  // is why it sawtooths rather than climbing forever.
  const fill = (tokens % (CTX_LIMIT * 0.82)) + CTX_LIMIT * 0.06
  const ctxPct = (fill / CTX_LIMIT) * 100

  const actions = st.session.beats.filter((b) => b.t <= pos).length
  const cost = (tokens / 1_000_000) * 4.2 + unit(seat + 17) * 0.4

  return [
    { label: 'Tokens', value: compact(tokens), sub: `${Math.round(rate * wobble)}/s` },
    { label: 'Context', value: `${ctxPct.toFixed(0)}%`, sub: `${compact(CTX_LIMIT)} window` },
    { label: 'Actions', value: String(actions), sub: 'this cycle' },
    { label: 'Spend', value: `$${cost.toFixed(2)}`, sub: 'this cycle' },
    { label: 'Cycle', value: mmss(pos), sub: `of ${mmss(CYCLE)}` },
  ]
}
