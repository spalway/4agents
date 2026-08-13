export type Pane = 'editor' | 'browser' | 'tty' | 'git'

export type BeatKind =
  | 'open'
  | 'nav'
  | 'edit'
  | 'run'
  | 'commit'
  | 'note'
  | 'pr'
  | 'review'

export interface Beat {
  /** Seconds from the start of the 1800s cycle. Strictly increasing. */
  t: number
  pane: Pane
  kind: BeatKind
  /* editor */
  path?: string
  lang?: string
  lines?: string[]
  caret?: number
  /* browser */
  url?: string
  title?: string
  body?: string[]
  /* tty */
  cmd?: string
  out?: string[]
  /* notes rail */
  note?: string
  /* git */
  ref?: string
}

export interface MetricSpec {
  label: string
  unit: string
  base: number
  drift: number
  kind: 'gauge' | 'counter' | 'percent'
}

export interface Session {
  seat: number
  codename: string
  discipline: string
  cycleSeconds: number
  workItem: string
  repo: string
  stack: string[]
  metrics: MetricSpec[]
  beats: Beat[]
}

export interface LedgerLine {
  t: number
  seat: number
  text: string
  level?: 'info' | 'warn' | 'ok'
}

export interface CrossRef {
  t: number
  fromSeat: number
  toSeat: number
  summary: string
}

export interface Interlock {
  ledger: LedgerLine[]
  crossRefs: CrossRef[]
}

export interface CommsMsg {
  t: number
  from: number
  /** Absent for a broadcast, and for a private note. */
  to?: number
  kind: 'direct' | 'broadcast' | 'note'
  text: string
}
