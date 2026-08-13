import { SEATS } from '../data/agents'
import { paletteFor, spriteRuns } from '../lib/brand'

/**
 * Pixel portrait for one seat.
 *
 * Geometry and palette live in lib/brand.js so the site and the offline asset
 * generator (scripts/generate-brand.mjs) draw the same faces — the favicon and
 * the social art are the same portraits, not copies that can drift.
 *
 * Rendered as SVG with horizontal runs merged, so it stays crisp at any size
 * without a canvas or an image asset.
 */
export default function Avatar({
  seat,
  size = 40,
  on = 'dark',
}: {
  seat: number
  size?: number
  on?: 'dark' | 'color'
}) {
  const meta = SEATS[seat] ?? SEATS[0]
  const palette = paletteFor(meta.color, on)
  const runs = spriteRuns(seat)

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-label={`${meta.codename} avatar`}
      className="block shrink-0"
    >
      {runs.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          fill={palette[r.key as keyof typeof palette]}
        />
      ))}
    </svg>
  )
}
