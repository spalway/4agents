import { Link } from 'react-router-dom'
import type { Beat } from '../data/types'
import { SEATS } from '../data/agents'
import { uptime, useTick } from '../lib/clock'
import { seatState } from '../lib/sim'
import { hostOf } from '../lib/format'
import Avatar from './Avatar'
import ThoughtBubble from './ThoughtBubble'

/** What the seat is doing, in words a non-engineer can read. */
function actionPhrase(b: Beat): string {
  switch (b.pane) {
    case 'editor':
      return `Editing ${b.path?.split('/').pop() ?? 'a file'}`
    case 'browser':
      return `Reading ${hostOf(b.url ?? '')}`
    case 'tty':
      return `Running ${b.cmd?.split(/\s+/)[0] ?? 'a command'}`
    case 'git':
      return b.kind === 'pr' ? `Opened ${b.ref}` : `Committed ${b.ref ?? ''}`.trim()
  }
}

/**
 * The four instances as identity cards.
 *
 * The portrait leads, then two lines of substance: what the seat is doing, and
 * what it is thinking. Everything else — metrics, file paths, window state —
 * lives on the seat's own page.
 */
export default function SeatPanes() {
  useTick(1000)
  const now = uptime()

  return (
    <section className="px-6">
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SEATS.map((s) => {
          const st = seatState(s.seat, now)
          return (
            <Link
              key={s.seat}
              to={`/${s.slug}`}
              className="group flex flex-col rounded-md border border-line bg-surface transition-colors duration-200 hover:border-ink-4"
              style={{ borderTop: `2px solid ${s.color}` }}
            >
              <div className="flex flex-col items-center px-4 pt-6 pb-4">
                <Avatar seat={s.seat} size={68} />
                <div className="mt-3.5 text-[13.5px] font-medium" style={{ color: s.color }}>
                  {s.codename}
                </div>
                <div className="lbl mt-1 text-center">{s.discipline}</div>
              </div>

              <div className="px-3.5 pb-4">
                <ThoughtBubble text={st.notes[0]?.item.note} color={s.color} />
              </div>

              <div className="mt-auto">
                <div className="border-t border-line px-3.5 py-2.5">
                  <div className="lbl">Now</div>
                  <div className="mt-1 truncate text-[11px] text-ink-2">
                    {actionPhrase(st.current.item)}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-line px-3.5 py-2.5">
                  <span className="flex items-center gap-2">
                    <i className={`blk ${st.blk}`} />
                    <span className="lbl-b">{st.label}</span>
                  </span>
                  <span className="mono text-[9.5px] text-ink-4">INST-0{s.seat}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
