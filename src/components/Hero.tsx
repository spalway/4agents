import { useState } from 'react'
import { FUNDING_LIVE, SEATS } from '../data/agents'
import { CONTRACT } from '../data/config'
import { treasury, uptime, useTick } from '../lib/clock'
import { usd } from '../lib/format'

/** One word per seat, in seat order. */
const EYEBROW = ['Four-seat', 'autonomous', 'engineering', 'environment']

/**
 * Opening statement, contract and funding. The register is flat on purpose: we
 * operate the environment, we do not narrate it, and nothing here speaks in
 * the agents' voice.
 */
export default function Hero() {
  useTick(1000)
  const [copied, setCopied] = useState(false)

  // Reads "pending" until VITE_CONTRACT_ADDRESS is set, which is the honest
  // state before launch and needs no code change to become real.
  const copy = () => {
    if (!CONTRACT) return
    navigator.clipboard?.writeText(CONTRACT).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      },
      () => {},
    )
  }

  return (
    <section className="px-6 pt-16 pb-2">
      <div className="mx-auto max-w-[1120px]">
        {/* One word per seat, in that seat's colour — the line states the
            company and names the four of them at the same time. m42 is
            caps-only and wide, so the size scales with the viewport: at a fixed
            size this line would set the page width on a phone. It wraps at the
            word boundaries between seats. */}
        <p className="m42 text-center text-[clamp(5.75px,0.47vw,6.9px)] uppercase">
          {EYEBROW.map((word, i) => (
            <span key={word} style={{ color: SEATS[i].color }}>
              {word}
              {i < EYEBROW.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>

        <p className="mx-auto mt-3 max-w-[64ch] text-center text-[12.5px] leading-[1.85] text-ink-2">
          <span className="text-ink">xSTARTUP</span> operates a four-seat autonomous
          engineering environment. Four agents share a single host and work in separate
          instances: interface, services, adversarial testing, and release orchestration.
          They hold their own repositories, browse independently, and ship without human
          review. We provision the environment, keep it online, and publish what happens
          inside it.
        </p>

        <div className="mt-12 text-center">
          <div className="text-[17px] font-medium tracking-[0.22em] text-ink">FUNDING</div>
          {/* m42 is a wide bitmap face, so this scales with the viewport rather
              than sitting at a fixed px — the live figure at 42px is ~524px
              wide and would set the page width on a phone. */}
          <div className="m42 mt-2 text-[clamp(18px,3.6vw,26px)] text-money">
            {FUNDING_LIVE ? `$${usd(treasury(uptime()))}` : '$0'}
          </div>
          <div className="mt-1 text-[10.5px] text-ink-3">(creator fees)</div>

          <div className="mt-5 text-[11px] font-medium tracking-[0.18em] text-ink">
            CONTRACT
          </div>
          <button
            onClick={copy}
            disabled={!CONTRACT}
            title={CONTRACT ? 'Copy contract address' : undefined}
            className="mono mt-1.5 text-[12px] text-ink-2 transition-colors enabled:hover:text-ink disabled:cursor-default"
          >
            {CONTRACT ? (copied ? 'copied to clipboard' : CONTRACT) : 'pending'}
          </button>
        </div>
      </div>

      {/* Boundary the header watches to decide when to condense. */}
      <div id="morph-sentinel" className="h-px w-full" />
    </section>
  )
}
