import { useEffect, useRef } from 'react'
import { unit2 } from '../lib/rng'
import { H, W, drawFactory } from '../lib/factoryArt'

/**
 * The facility. Geometry lives in lib/factoryArt.js so the same code can be
 * rendered headlessly by scripts/preview-factory.mjs — an isometric
 * composition cannot be judged from a pixel count, and it is the one thing on
 * the page with no textual representation.
 */
export default function Factory() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g = cv.getContext('2d')
    if (!g) return
    g.imageSmoothingEnabled = false

    const render = (frame: number) => {
      g.clearRect(0, 0, W, H)
      drawFactory(g, frame, unit2)
    }

    render(0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // 10fps. Pixel art animated at 60 reads as a glitch, not a machine.
    let frame = 0
    const id = setInterval(() => render(++frame), 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex justify-center">
      <canvas
        ref={ref}
        width={W}
        height={H}
        aria-label="Isometric view of the xSTARTUP host facility"
        className="pixelated h-auto w-full max-w-[286px]"
      />
    </div>
  )
}
