import { useEffect, useRef } from 'react'
import { SEATS } from '../data/agents'
import { atDate, uptime } from '../lib/clock'
import { commsUpTo } from '../lib/sim'
import { utcClock } from '../lib/format'

/**
 * The channel the four seats talk on.
 *
 * Three kinds of traffic, distinguished structurally rather than by badge: a
 * direct message names its recipient, a broadcast says "all", and a note is a
 * seat talking to itself and sits indented and dimmed. Sender identity is
 * carried by colour — the only place on the site where hue means something.
 *
 * `compact` stacks the header above the text, for the narrow column on the
 * seat dashboard where a single-row layout would leave ten usable characters.
 */
export default function Comms({
  seat,
  rows = 14,
  compact = false,
}: {
  seat?: number
  rows?: number
  compact?: boolean
}) {
  const now = uptime()
  const msgs = commsUpTo(now, rows, seat)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="strip">
        <span className="lbl-b">{seat === undefined ? 'Channel — all seats' : 'Channel'}</span>
        <span className="lbl">{msgs.length}</span>
      </div>

      <div ref={ref} className="min-h-0 flex-1 overflow-auto px-3.5 py-2.5">
        {msgs.length === 0 ? (
          <div className="text-[10.5px] text-ink-4">No traffic yet this cycle.</div>
        ) : (
          msgs.map((d, i) => {
            const m = d.item
            const from = SEATS[m.from]
            const to = m.to !== undefined ? SEATS[m.to] : undefined
            const isNote = m.kind === 'note'

            const head = (
              <span className="flex shrink-0 items-center gap-1.5">
                <span
                  className="block h-[6px] w-[6px] shrink-0 rounded-full"
                  style={{ background: from.color, opacity: isNote ? 0.5 : 1 }}
                />
                <span
                  className="text-[10.5px] font-medium"
                  style={{ color: from.color, opacity: isNote ? 0.66 : 1 }}
                >
                  {from.codename}
                </span>
                {to ? (
                  <span className="text-[10.5px]" style={{ color: to.color }}>
                    → {to.codename}
                  </span>
                ) : (
                  <span className="lbl">{isNote ? 'note' : 'all'}</span>
                )}
              </span>
            )

            return (
              <div
                key={`${d.at}-${i}`}
                className={compact ? 'py-1.5' : 'flex gap-3 py-1.5'}
                style={{ paddingLeft: isNote ? 12 : 0 }}
              >
                {compact ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="mono shrink-0 text-[9.5px] text-ink-4 num">
                        {utcClock(atDate(d.at))}
                      </span>
                      {head}
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] leading-[1.6] ${
                        isNote ? 'text-ink-3' : 'text-ink-2'
                      }`}
                    >
                      {m.text}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="mono shrink-0 text-[9.5px] text-ink-4 num">
                      {utcClock(atDate(d.at))}
                    </span>
                    {/* Wide enough for "xFRONT → xPIPE" and no wider — the
                        column is fixed, so any slack reads as an empty gutter
                        down the whole feed. */}
                    <span className="w-[136px] shrink-0 overflow-hidden">{head}</span>
                    <span
                      className={`min-w-0 text-[11px] leading-[1.6] ${
                        isNote ? 'text-ink-3' : 'text-ink-2'
                      }`}
                    >
                      {m.text}
                    </span>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
