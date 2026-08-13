import { useEffect, useRef } from 'react'
import { SEATS } from '../data/agents'
import { atDate, uptime, useTick } from '../lib/clock'
import { ledgerUpTo } from '../lib/sim'
import { utcClock } from '../lib/format'

/**
 * The host log — machine output, as opposed to the channel, which is the seats
 * talking. Mono, because it is literally console output, and colour-keyed by
 * seat so one instance can be followed down the column without reading names.
 *
 * Layout-agnostic: the caller supplies the frame and the height.
 */
export default function Ledger() {
  useTick(1000)
  const now = uptime()
  const lines = ledgerUpTo(now, 50)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines.length])

  return (
    <div className="flex min-h-0 flex-col">
      <div className="strip">
        <span className="lbl-b">Host log</span>
        <span className="mono lbl num">{utcClock()} UTC</span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-4 py-2.5">
        {lines.map((d, i) => {
          const seat = SEATS[d.item.seat]
          const level = d.item.level ?? 'info'
          return (
            <div key={`${d.at}-${i}`} className="flex gap-3 py-[2px]">
              <span className="mono shrink-0 text-[9.5px] text-ink-4 num">
                {utcClock(atDate(d.at))}
              </span>
              <span
                className="w-[58px] shrink-0 text-[10.5px] font-medium"
                style={{ color: seat?.color }}
              >
                {seat?.codename}
              </span>
              <span
                className={`mono min-w-0 text-[10.5px] leading-[1.7] ${
                  level === 'warn'
                    ? 'text-signal'
                    : level === 'ok'
                      ? 'text-ink'
                      : 'text-ink-3'
                }`}
              >
                {d.item.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
