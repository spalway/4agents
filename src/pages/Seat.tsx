import { Link, Navigate, useParams } from 'react-router-dom'
import { SEATS, seatBySlug } from '../data/agents'
import { uptime, useTick } from '../lib/clock'
import { seatState } from '../lib/sim'
import { agentStats } from '../lib/agentStats'
import Avatar from '../components/Avatar'
import VirtualDisplay from '../components/VirtualDisplay'
import Files from '../components/Files'
import Comms from '../components/Comms'

/**
 * One instance, as a dashboard that fits the viewport.
 *
 * On a wide screen the page itself never scrolls: the frame is pinned to the
 * space under the header and the three columns scroll internally. Below the lg
 * breakpoint that inverts — a fixed-height dashboard on a phone would leave
 * every pane a few lines tall — so the constraint is lifted and the page
 * scrolls normally.
 */
export default function Seat() {
  const { slug } = useParams()
  useTick(1000)

  const meta = slug ? seatBySlug(slug) : undefined
  if (!meta) return <Navigate to="/" replace />

  const now = uptime()
  const st = seatState(meta.seat, now)
  const stats = agentStats(meta.seat, now)
  const prev = SEATS[(meta.seat + 3) % 4]
  const next = SEATS[(meta.seat + 1) % 4]

  return (
    <div className="flex flex-col px-5 pb-5 lg:h-[calc(100vh-44px)] lg:overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col">
        {/* Seat switcher */}
        <div className="flex shrink-0 items-center justify-between py-3">
          <Link to="/" className="lbl transition-colors hover:text-ink-2">
            ← All seats
          </Link>
          <div className="flex items-center gap-1">
            {SEATS.map((s) => (
              <Link
                key={s.seat}
                to={`/${s.slug}`}
                className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-raise"
                style={{
                  background: s.seat === meta.seat ? '#1e1e1e' : undefined,
                  borderBottom: `2px solid ${s.seat === meta.seat ? s.color : 'transparent'}`,
                }}
              >
                <span
                  className="block h-[6px] w-[6px] rounded-full"
                  style={{ background: s.color, opacity: s.seat === meta.seat ? 1 : 0.45 }}
                />
                <span
                  className="text-[10.5px]"
                  style={{ color: s.seat === meta.seat ? s.color : '#737373' }}
                >
                  {s.codename}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="frame flex min-h-0 flex-1 flex-col">
          <div className="h-[2px] w-full shrink-0" style={{ background: meta.color }} />

          {/* Identity and runtime */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-raise px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar seat={meta.seat} size={32} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[13.5px] font-medium" style={{ color: meta.color }}>
                    {meta.codename}
                  </span>
                  <span className="mono text-[9.5px] text-ink-4">INST-0{meta.seat}</span>
                </div>
                <div className="lbl mt-0.5">{meta.discipline}</div>
              </div>
            </div>

            {/* Larpy runtime telemetry, tinted to the seat. */}
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
              {stats.map((s) => (
                <div key={s.label} className="min-w-0">
                  <div className="lbl">{s.label}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="mono text-[12px] font-medium num"
                      style={{ color: meta.color }}
                    >
                      {s.value}
                    </span>
                    {s.sub && <span className="text-[9.5px] text-ink-4">{s.sub}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <i className={`blk ${st.blk}`} />
              <span className="lbl-b">{st.label}</span>
            </div>
          </div>

          {/* Three columns: screen, files, channel. */}
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_300px_minmax(0,1fr)]">
            <div className="flex min-h-[380px] min-w-0 flex-col border-b border-line lg:min-h-0 lg:border-b-0 lg:border-r">
              <VirtualDisplay meta={meta} st={st} />
            </div>

            <div className="flex min-h-[320px] min-w-0 flex-col border-b border-line lg:min-h-0 lg:border-b-0 lg:border-r">
              <Files
                session={st.session}
                currentPath={st.panes.editor?.item.path}
                accent={meta.color}
              />
            </div>

            <div className="flex min-h-[300px] min-w-0 flex-col lg:min-h-0">
              <Comms seat={meta.seat} rows={20} compact />
            </div>
          </div>
        </div>

        <div className="shrink-0 pt-3 text-center">
          <Link to={`/${next.slug}`} className="lbl transition-colors hover:text-ink-2">
            Next seat: {next.codename} →
          </Link>
          <span className="lbl mx-3 text-ink-4">·</span>
          <Link to={`/${prev.slug}`} className="lbl transition-colors hover:text-ink-2">
            {prev.codename}
          </Link>
        </div>
      </div>
    </div>
  )
}
