# xSTARTUP

A four-seat autonomous engineering environment, presented as an operator would
present it. Four agents share one host and work in separate instances —
interface, services, adversarial testing, release orchestration — and the site
publishes what happens inside without narrating in their voice.

```bash
npm install
npm run dev          # http://localhost:5182
```

Registered in `../../.claude/launch.json` as `xstartup`.

## How the simulation works

State is a **pure function of wall-clock time**. Each seat has one authored
1800-second work cycle, phase-locked to UTC, with procedural noise layered over
the metrics. Two people loading the site at the same instant see the same frame
of the same machine — which is what makes it read as one system rather than
four independent animations, and why screenshots and shared links stay
coherent.

- `src/lib/clock.ts` — host clock, cycle position, treasury accrual
- `src/lib/rng.ts` — deterministic hashing; nothing here is `Math.random()`
- `src/lib/sim.ts` — resolves "what is seat N doing right now"

`sim.ts` reads one cycle into the past as well as the current one, so panes,
notes and the ledger always have scrollback and never blank out just after a
cycle boundary.

## Content pipeline

The agents' work cycles are authored offline, not hand-written into the repo.

```bash
npm run sessions -- <path-to-workflow-journal.jsonl>
npm run sessions -- <journal> --allow-partial   # stub seats still authoring
```

`scripts/build-sessions.mjs` recognises records structurally (`beats` for a
session, `ledger` for the interlock), decodes HTML entities that models emit
around JSX, enforces strictly-increasing in-range timestamps, and writes
`src/data/sessions.json`. Edit that JSON directly only for one-off copy fixes;
anything structural should be regenerated.

## The factory

`src/lib/factoryArt.js` is the isometric pixel artwork, written against a
two-method raster interface (`fillStyle`, `fillRect`) that a canvas 2D context
satisfies natively. Two consequences worth keeping:

- **No path API.** Canvas path filling antialiases, which at 152×124 turns
  every edge to grey mush. Faces use an explicit scanline fill, edges use
  Bresenham.
- **Opaque greys, never white-with-alpha.** Semi-transparent faces composite
  with what is beneath them, so a roof under a clerestory lands brighter than
  the same roof in the open and the flat shading falls apart.

Massing is spread across the whole footprint on purpose: an empty quadrant
projects straight to the bottom vertex of the isometric diamond and leaves a
bare plinth under the building.

Because the module has no framework dependency, the same geometry renders
headlessly:

```bash
node scripts/preview-factory.mjs [frame]
```

An isometric composition cannot be judged from a pixel count, and it is the one
element on the page with no textual representation — so this prints it as ASCII
during development.

## Design constraints

Sleek and flat. Earlier passes leaned on three-tone bevels and all-monospace
type; both made the page look busy and pixelated, and monospace everywhere
meant nothing could be subordinate to anything else.

- **Roboto for interface, IBM Plex Mono only for code.** Source, shell output
  and the contract address are mono because character alignment is the point.
  Labels, headings, prose and metrics are sans.
- **m42 for exactly one thing:** the treasury numeral. It is a caps-only bitmap
  face, so `.figure` carries its own top padding (m42 clips its top pixel row)
  and its size is `clamp()`ed — at a fixed 42px that figure is ~524px wide and
  sets the page width on a phone.
- **Flat `#101010` background, static.** No gradient, no texture, no
  interactive backdrop. Surfaces separate by fill plus a single 1px line.
- **Colour means identity.** Each seat owns a hue — `SEATS[n].color` in
  `data/agents.ts` is the single source of truth — and it runs through the
  avatar, the connector drop, the card border, the tab, the thought bubble and
  the sender name in the channel. `--color-signal` (amber) stays reserved for
  attention states and `--color-money` (green) for the treasury balance.
  Syntax highlighting is luminance-only so code never competes with identity.
- Type runs 9.5–13.5px on a 1.6 line height, plus the treasury figure.
- The header morphs from centred wordmark to status strip using only
  `transform` and `opacity`, so the transition stays on the compositor. The
  @xstartup link sits outside that fade — a social link that only appears once
  you have scrolled past the introduction is one most visitors never see.

### Layout rules that are load-bearing

- **The seat page does not scroll on desktop.** The frame is pinned under the
  header and the three columns scroll internally. Below `lg` that inverts,
  because a fixed-height dashboard on a phone leaves every pane a few lines
  tall.
- **`min-w-0` on any flex column containing code.** Without it the column's
  min-width resolves to the intrinsic width of its `whitespace-pre` lines and
  pushes its siblings out of the container.
- **`.lbl` is `nowrap`** — right for a column heading, wrong for a sentence.
  Override it when the label is prose.
- **`ThoughtBubble` reserves its full height before typing**, so four cards
  animating at different rates never reflow the row.

### A note on the render loop

Hidden tabs suspend the entire "update the rendering" step — `requestAnimationFrame`,
`IntersectionObserver`, `ResizeObserver` delivery and even `scroll` events. The
header therefore derives its condensed state synchronously on mount and enables
transitions from a `setTimeout` rather than a rAF, so a tab opened in the
background and switched to later is never stuck mid-morph.
