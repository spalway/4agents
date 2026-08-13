import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FUNDING_LIVE, SEATS } from '../data/agents'
import { CONTRACT, X_HANDLE, X_URL, shortContract } from '../data/config'
import { treasury, useTick, uptime } from '../lib/clock'
import { seatState } from '../lib/sim'
import { usd, utcClock } from '../lib/format'

/** Must match the header's rendered height (h-11). */
const BAR_H = 44

/** Seat colours, swept across the mark left to right. */
const SEAT_SWEEP = `linear-gradient(135deg, ${SEATS.map(
  (s, i) => `${s.color} ${Math.round((i / (SEATS.length - 1)) * 100)}%`,
).join(', ')})`

function XLogo({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="x-mark block shrink-0"
      style={{ width: size, height: size, backgroundImage: SEAT_SWEEP }}
    />
  )
}

/**
 * The site's only chrome, doing two jobs.
 *
 * At rest it is the wordmark alone, centred — the page opens on a title card.
 * Past the introduction it condenses into a status strip: wordmark left, seat
 * telemetry beside it, treasury and contract centred, host clock right.
 *
 * Both states are the same DOM; only `transform` and `opacity` change, so the
 * transition stays on the compositor.
 */
export default function Header() {
  const { pathname } = useLocation()
  const barRef = useRef<HTMLDivElement>(null)
  const wmRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [condensed, setCondensed] = useState(false)
  const [ready, setReady] = useState(false)

  useTick(1000)

  // Distance the wordmark must travel to sit centred. Measured from layout
  // geometry, which is unaffected by the transform already on the element.
  useLayoutEffect(() => {
    const measure = () => {
      const bar = barRef.current
      const wm = wmRef.current
      if (!bar || !wm) return
      setOffset(bar.clientWidth / 2 - wm.offsetWidth / 2 - wm.offsetLeft)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (barRef.current) ro.observe(barRef.current)
    return () => ro.disconnect()
  }, [])

  // Enable transitions only after the first commit, so a reload partway down
  // the page does not animate the header in from centre. Deliberately not
  // requestAnimationFrame: rAF is suspended in a backgrounded tab, which would
  // leave the header permanently untransitioned for anyone who opens the site
  // in a new tab and switches to it later.
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0)
    return () => clearTimeout(id)
  }, [])

  // Condense once the reader is past the introduction. A passive scroll
  // listener comparing two integers costs nothing measurable and, unlike an
  // IntersectionObserver, keeps working while the tab is hidden.
  useEffect(() => {
    const sentinel = document.getElementById('morph-sentinel')
    if (!sentinel) {
      setCondensed(true)
      return
    }

    let threshold = 0
    const evaluate = () => setCondensed(window.scrollY > threshold)
    const remeasure = () => {
      threshold = sentinel.getBoundingClientRect().top + window.scrollY - BAR_H
      evaluate()
    }

    remeasure()
    window.addEventListener('scroll', evaluate, { passive: true })
    const ro = new ResizeObserver(remeasure)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('scroll', evaluate)
      ro.disconnect()
    }
  }, [pathname])

  const now = uptime()
  const ease = 'cubic-bezier(.22,.68,.24,1)'
  const shift = condensed ? 0 : offset
  const fade = (i: number) => ({
    opacity: condensed ? 1 : 0,
    transform: condensed ? 'none' : 'translate3d(0,3px,0)',
    transition: ready
      ? `opacity .3s ${ease} ${condensed ? 80 + i * 50 : 0}ms, transform .3s ${ease} ${condensed ? 80 + i * 50 : 0}ms`
      : 'none',
    pointerEvents: condensed ? ('auto' as const) : ('none' as const),
  })

  return (
    <header className="sticky top-0 z-50 bg-bg">
      <div
        ref={barRef}
        className="relative mx-auto flex h-11 max-w-[1400px] items-center gap-6 px-5"
      >
        <div
          ref={wmRef}
          className="shrink-0 will-change-transform"
          style={{
            transform: `translate3d(${shift}px,0,0)`,
            transition: ready ? `transform .6s ${ease}` : 'none',
          }}
        >
          <span className="text-[12px] font-medium tracking-[0.14em] text-ink">xSTARTUP</span>
          <span className="lbl ml-2.5">© 2026</span>
        </div>

        {/* Seat telemetry — left cluster. */}
        <div className="hidden shrink-0 items-center gap-3.5 md:flex" style={fade(0)}>
          {SEATS.map((s) => {
            const st = seatState(s.seat, now)
            return (
              <a
                key={s.seat}
                href={`#/${s.slug}`}
                className="flex items-center gap-1.5"
                title={`${s.codename} — ${st.label}`}
              >
                <span
                  className="block h-[6px] w-[6px] rounded-full"
                  style={{
                    background: s.color,
                    opacity: st.status === 'idle' ? 0.4 : 1,
                  }}
                />
                <span className="mono text-[9.5px] text-ink-4">0{s.seat}</span>
              </a>
            )
          })}
        </div>

        {/* Treasury and contract — centre. */}
        <div
          className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-4 whitespace-nowrap"
          style={fade(1)}
        >
          <span className="flex items-baseline gap-2">
            <span className="lbl">Funding</span>
            <span className="mono text-[11px] font-medium text-money num">
              {FUNDING_LIVE ? `$${usd(treasury(now))}` : '$0'}
            </span>
          </span>
          {CONTRACT && (
            <span className="hidden items-baseline gap-2 lg:flex">
              <span className="lbl">CA</span>
              <span className="mono text-[9.5px] text-ink-4">{shortContract()}</span>
            </span>
          )}
        </div>

        {/* Host clock and social — right. */}
        <div className="ml-auto flex shrink-0 items-center gap-4">
          <span className="mono hidden text-[9.5px] text-ink-4 num sm:inline" style={fade(2)}>
            {utcClock()} UTC
          </span>
          {/* Deliberately outside the fade: a social link that only appears
              once you have scrolled past the introduction is one most visitors
              never see. */}
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-ink transition-opacity hover:opacity-80"
          >
            <XLogo />
            {/* Same four-seat sweep as the mark, clipped to the glyphs. Needs
                an explicit transparent fill — without it the text paints over
                its own background. */}
            <span
              className="text-[11px] font-bold"
              style={{
                backgroundImage: SEAT_SWEEP,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              @{X_HANDLE}
            </span>
          </a>
        </div>
      </div>

      <div
        className="mx-auto max-w-[1400px] border-t border-line"
        style={{
          opacity: condensed ? 1 : 0,
          transition: ready ? `opacity .3s ${ease}` : 'none',
        }}
      />
    </header>
  )
}
