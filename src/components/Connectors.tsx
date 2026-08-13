import { useEffect, useState } from 'react'
import { SEATS } from '../data/agents'
import { uptime } from '../lib/clock'
import { seatState } from '../lib/sim'

/**
 * The bus from the facility down to the four instances.
 *
 * One trunk, one distribution rail, four drops — each drop carrying its seat's
 * colour, so the identity of a card is established before you read its label.
 * Drawn in a fixed 1000-unit space stretched to the container; every segment is
 * axis-aligned so the stretch is invisible, and non-scaling strokes hold the
 * line weight at any width.
 */

const COLS = [125, 375, 625, 875]
/**
 * The trunk absorbs the 32px the facility was raised by in Home, so the cards
 * stay where they were. Keep these in step with the factory section's padding:
 * shortening one without lengthening the other moves the whole grid.
 */
const RAIL_Y = 66
const DROP_Y = 188

export default function Connectors() {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [])

  const now = uptime()

  return (
    <div className="px-6" aria-hidden="true">
      <div className="mx-auto max-w-[1120px]">
        <svg
          viewBox={`0 0 1000 ${DROP_Y}`}
          preserveAspectRatio="none"
          className="block w-full"
          style={{ height: DROP_Y }}
        >
          {/* Trunk and rail stay neutral — they belong to the host. */}
          <g stroke="#3a3a3a" strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke">
            <path d={`M500 0 V${RAIL_Y}`} vectorEffect="non-scaling-stroke" />
            <path d={`M${COLS[0]} ${RAIL_Y} H${COLS[3]}`} vectorEffect="non-scaling-stroke" />
          </g>

          {/* Drops carry seat identity. */}
          {SEATS.map((s, i) => (
            <path
              key={s.seat}
              d={`M${COLS[i]} ${RAIL_Y} V${DROP_Y}`}
              stroke={s.color}
              strokeWidth={1.5}
              fill="none"
              opacity={0.85}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Junctions. */}
          {SEATS.map((s, i) => (
            <circle key={s.seat} cx={COLS[i]} cy={RAIL_Y} r={3} fill={s.color} />
          ))}
          <circle cx={500} cy={RAIL_Y} r={3} fill="#3a3a3a" />

          {/* Activity pulse, released when a seat emits. */}
          {SEATS.map((s, i) => {
            const st = seatState(s.seat, now)
            const age = now - st.current.at
            if (age > 6) return null
            const p = Math.min(1, age / 6)
            return (
              <circle
                key={`p${s.seat}`}
                cx={COLS[i]}
                cy={RAIL_Y + (DROP_Y - RAIL_Y) * p}
                r={3.5}
                fill={s.color}
                opacity={0.95 - p * 0.75}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
