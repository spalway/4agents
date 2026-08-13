export function usd(n: number, dp = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })
}

export function pad(n: number, w = 2): string {
  return String(Math.floor(n)).padStart(w, '0')
}

/** HH:MM:SS in UTC — the host reports in UTC, never local time. */
export function utcClock(d = new Date()): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** Elapsed seconds as `224d 03:45:12`. Four-digit hour counts are unreadable. */
export function elapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const d = Math.floor(s / 86400)
  const r = s % 86400
  return `${d}d ${pad(r / 3600)}:${pad((r / 60) % 60)}:${pad(r % 60)}`
}

/** MM:SS position inside the cycle. */
export function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${pad(s / 60)}:${pad(s % 60)}`
}

/** Decimal places implied by how a number was authored: 0.002 -> 3, 7 -> 0. */
function precisionOf(...nums: number[]): number {
  let p = 0
  for (const n of nums) {
    const s = String(n)
    const i = s.indexOf('.')
    if (i >= 0) p = Math.max(p, s.length - i - 1)
  }
  return Math.min(p, 4)
}

/**
 * Metrics carry their own precision. A CLS of 0.002 and a queue depth of 7 are
 * both correct to render, and neither survives a fixed number of decimals —
 * so precision is inferred from the authored base and drift rather than from
 * the metric's kind. Grouping separators only appear above 10k, since "2,088
 * ms" is not how anyone writes a latency.
 */
export function metricValue(v: number, m: { base: number; drift: number }): string {
  const p = precisionOf(m.base, m.drift)
  return v.toLocaleString('en-US', {
    minimumFractionDigits: p,
    maximumFractionDigits: p,
    useGrouping: Math.abs(v) >= 10_000,
  })
}

/** Hostname of a URL, without the www. Falls back to naive parsing. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0]
  }
}
