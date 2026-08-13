import { X_HANDLE, X_URL } from '../data/config'

/**
 * The contract deliberately does not appear here — it is stated once in the
 * hero, where it is click-to-copy, and again in the condensed header strip.
 * A third copy in the footer is noise.
 */
export default function Footer() {
  return (
    <footer className="mt-20 px-6 pb-14">
      <div className="mx-auto max-w-[1120px] border-t border-line pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-baseline gap-2">
            <span className="lbl">Funding</span>
            <span className="text-[10.5px] text-ink-3">Creator fees</span>
          </span>

          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10.5px] text-ink-3 transition-colors hover:text-ink"
          >
            @{X_HANDLE}
          </a>

          <span className="lbl">xSTARTUP © 2026</span>
        </div>
      </div>
    </footer>
  )
}
