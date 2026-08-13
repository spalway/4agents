import { useEffect, useRef, useState } from 'react'

/** Hex to rgba, for tinting a surface with a seat's identity colour. */
function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const SPEED_MS = 18

/**
 * The agent's current thought, typed out.
 *
 * The bubble reserves its full height up front and the text types into it, so
 * a card never grows or reflows mid-sentence — four of these animating at
 * different rates inside a grid would otherwise make the whole row jitter.
 *
 * A new thought fades the bubble out, swaps the text, and types the new one:
 * cross-fading mid-sentence reads as a glitch rather than a change of mind.
 */
export default function ThoughtBubble({
  text,
  color,
  lines = 3,
}: {
  text?: string
  color: string
  lines?: number
}) {
  const [shown, setShown] = useState('')
  const [visible, setVisible] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []

    if (!text) {
      setShown('')
      setVisible(false)
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setShown(text)
      setVisible(true)
      return
    }

    // Fade out, then type the new thought in.
    setVisible(false)
    const start = window.setTimeout(() => {
      setShown('')
      setVisible(true)
      let i = 0
      const tick = window.setInterval(() => {
        i += 1
        setShown(text.slice(0, i))
        if (i >= text.length) window.clearInterval(tick)
      }, SPEED_MS)
      timers.current.push(tick)
    }, 220)
    timers.current.push(start)

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current.forEach(clearInterval)
      timers.current = []
    }
  }, [text])

  const typing = !!text && shown.length < text.length

  return (
    <div
      className="relative rounded-md border px-3 py-2 transition-opacity duration-300"
      style={{
        borderColor: tint(color, 0.34),
        background: tint(color, 0.07),
        opacity: visible ? 1 : 0,
        // Reserve the full box so the card never reflows while typing.
        minHeight: lines * 17 + 16,
      }}
    >
      <span
        className="absolute -top-[5px] left-6 h-[8px] w-[8px] rotate-45 border-t border-l"
        style={{ borderColor: tint(color, 0.34), background: tint(color, 0.07) }}
      />
      <p className="text-[11px] leading-[17px] text-ink-2">
        {shown}
        {typing && <span className="caret ml-px" style={{ color }}>▌</span>}
      </p>
    </div>
  )
}
