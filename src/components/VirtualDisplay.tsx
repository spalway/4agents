import { useState } from 'react'
import type { SeatMeta } from '../data/agents'
import type { SeatState } from '../lib/sim'
import { hostOf, utcClock } from '../lib/format'

type TabId = 'page' | 'shell'

/**
 * The instance's screen, framed as a remote viewport.
 *
 * One window, not a stack of boxes: the page and the shell are tabs in the same
 * chrome. That is both what a real desktop looks like and what lets the window
 * stretch to fill the column, instead of leaving dead space under a
 * fixed-height terminal.
 *
 * The active tab follows whatever the agent is doing until the reader clicks a
 * tab, after which it stays put — the same rule the file viewer uses, for the
 * same reason: a pane that yanks itself away mid-read is worse than a stale one.
 *
 * It fills its pane rather than enforcing 16:9. The dashboard has to fit a
 * viewport without scrolling, and a locked aspect ratio inside a flex column
 * either overflows or gets clamped into the wrong shape; the resolution stays
 * as a label, which is what actually says "this is a screen you are watching
 * remotely".
 */
export default function VirtualDisplay({ meta, st }: { meta: SeatMeta; st: SeatState }) {
  const browser = st.panes.browser?.item
  const tty = st.panes.tty?.item
  const [picked, setPicked] = useState<TabId | null>(null)

  const following: TabId = st.active === 'tty' ? 'shell' : 'page'
  const active = picked ?? following
  const pageLabel = browser?.title ?? 'New tab'

  const Tab = ({ id, label }: { id: TabId; label: string }) => {
    const on = active === id
    return (
      <button
        onClick={() => setPicked(id)}
        className="flex min-w-0 max-w-[56%] items-center gap-1.5 border-r border-line px-2.5 py-1 transition-colors"
        style={{
          borderTop: `2px solid ${on ? meta.color : 'transparent'}`,
          background: on ? '#171717' : 'transparent',
        }}
      >
        <span
          className="block h-[5px] w-[5px] shrink-0 rounded-full"
          style={{ background: meta.color, opacity: on ? 1 : 0.4 }}
        />
        <span className={`truncate text-[10px] ${on ? 'text-ink' : 'text-ink-3'}`}>{label}</span>
      </button>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="strip">
        <span className="lbl-b">Virtual environment</span>
        <span className="lbl mono" style={{ color: meta.color }}>
          1920 × 1080
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 bg-sunk p-2.5">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-line bg-surface">
          <div className="flex shrink-0 items-stretch border-b border-line bg-raise">
            <Tab id="page" label={pageLabel} />
            <Tab id="shell" label="shell" />
            <span className="flex items-center px-2 text-[11px] text-ink-4">+</span>
            <span className="ml-auto flex shrink-0 items-center gap-2 px-2.5 text-[10px] text-ink-4">
              <span>—</span>
              <span>□</span>
              <span>×</span>
            </span>
          </div>

          {active === 'page' ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-2.5 py-1">
                <span className="text-[10px] text-ink-4">←</span>
                <span className="text-[10px] text-ink-4">→</span>
                <span className="text-[10px] text-ink-3">⟳</span>
                <span className="sunk mono ml-1 min-w-0 flex-1 truncate px-2 py-[1px] text-[9.5px] text-ink-3">
                  {browser?.url ?? 'about:blank'}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
                {browser?.title && (
                  <div className="mb-1.5 text-[11px] text-ink">{browser.title}</div>
                )}
                {browser?.body?.map((line, i) => (
                  <div key={i} className="text-[10px] leading-[1.8] text-ink-3">
                    {line}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mono min-h-0 flex-1 overflow-auto px-3 py-2">
              <div className="text-[10px] leading-[1.8] text-ink">
                <span className="text-ink-4">$ </span>
                {tty?.cmd ?? '—'}
              </div>
              {tty?.out?.map((line, i) => (
                <div key={i} className="text-[10px] leading-[1.8] whitespace-pre-wrap text-ink-3">
                  {line}
                </div>
              ))}
              <div className="text-[10px] text-ink">
                <span className="text-ink-4">$ </span>
                <span className="caret">▌</span>
              </div>
            </div>
          )}
        </div>

        {/* Taskbar */}
        <div className="flex shrink-0 items-center gap-2.5 rounded border border-line bg-raise px-2.5 py-1">
          <span className="block h-[6px] w-[6px] rounded-full" style={{ background: meta.color }} />
          <span className="text-[10px] text-ink-2">{meta.codename}</span>
          <span className="mono ml-auto text-[9.5px] text-ink-4 num">
            {browser?.url ? `${hostOf(browser.url)} · ` : ''}
            {utcClock()}
          </span>
        </div>
      </div>
    </div>
  )
}
