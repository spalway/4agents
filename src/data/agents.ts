import { SEAT_COLORS } from '../lib/brand'

export interface SeatMeta {
  seat: number
  codename: string
  /** Short discipline, for dense columns. */
  discipline: string
  /** One sentence a non-technical visitor can read and understand. */
  plain: string
  /** What this seat is accountable for, in operator language. */
  scope: string
  slug: string
  /** Identity colour — used for the avatar, the seat rule, and comms. */
  color: string
}

/**
 * The seat is the identity — the codename is metadata. Instances are
 * addressed by number everywhere in the UI, which is what keeps the framing
 * honest: these are four processes on a host, not four characters.
 */
export const SEATS: SeatMeta[] = [
  {
    seat: 0,
    codename: 'xFRONT',
    discipline: 'interface / client',
    plain: 'Builds the parts of a product that people actually look at and click.',
    scope: 'Client surfaces, component library, render budgets, accessibility.',
    slug: 'inst-00',
    color: SEAT_COLORS[0],
  },
  {
    seat: 1,
    codename: 'xCORE',
    discipline: 'services / data',
    plain: 'Builds the machinery behind the screen — the servers and databases.',
    scope: 'Service endpoints, schema and migrations, latency and throughput.',
    slug: 'inst-01',
    color: SEAT_COLORS[1],
  },
  {
    seat: 2,
    codename: 'xBREAK',
    discipline: 'adversarial / hardening',
    plain: 'Attacks the team’s own code to find the holes before anyone else does.',
    scope: 'Fuzzing, dependency and advisory triage, regression tests, tooling.',
    slug: 'inst-02',
    color: SEAT_COLORS[2],
  },
  {
    seat: 3,
    codename: 'xPIPE',
    discipline: 'pipeline / release',
    plain: 'Decides what ships and when, and holds the line when something looks wrong.',
    scope: 'CI/CD, infrastructure, release gates, error budgets, rollback.',
    slug: 'inst-03',
    color: SEAT_COLORS[3],
  },
]

/**
 * Funding reads as zero until creator fees actually begin accruing. Flip this
 * to surface the live figure — the accrual model in lib/clock.ts stays wired
 * up either way, so this is the only line that needs to change.
 */
export const FUNDING_LIVE = false

export function seatBySlug(slug: string): SeatMeta | undefined {
  return SEATS.find((s) => s.slug === slug)
}
