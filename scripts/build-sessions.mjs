/**
 * Extracts the authored agent sessions from a workflow run journal and writes
 * them into src/data/sessions.json.
 *
 * The journal is append-only JSONL where each completed agent contributes a
 * `result` record. We do not care about record ordering or agent identity —
 * sessions are recognised structurally (they carry `beats`), the interlock by
 * `ledger` — so the script is stable across workflow edits and reruns.
 *
 *   node scripts/build-sessions.mjs <journal.jsonl>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../src/data/sessions.json')
const CYCLE = 1800

const journalPath = process.argv[2]
if (!journalPath) {
  console.error('usage: node scripts/build-sessions.mjs <journal.jsonl>')
  process.exit(1)
}

/**
 * Models emit JSX and shell output with HTML entities escaped. React renders
 * text nodes literally, so `&lt;svg` would reach the screen as `&lt;svg` — decode
 * once here rather than at every render site.
 */
const ENTITIES = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&amp;': '&',
}

function decode(v) {
  if (typeof v === 'string') {
    // &amp; last, so &amp;lt; does not collapse into a bare '<'.
    let s = v
    for (const [k, r] of Object.entries(ENTITIES)) s = s.split(k).join(r)
    return s
  }
  if (Array.isArray(v)) return v.map(decode)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x)]))
  }
  return v
}

/** Walk any JSON value looking for objects that match a predicate. */
function collect(node, pred, found = []) {
  if (!node || typeof node !== 'object') return found
  if (pred(node)) found.push(node)
  for (const v of Array.isArray(node) ? node : Object.values(node)) collect(v, pred, found)
  return found
}

const raw = readFileSync(journalPath, 'utf8').trim().split('\n')
const records = []
for (const line of raw) {
  try {
    records.push(JSON.parse(line))
  } catch {
    /* partial trailing write while the run is still going */
  }
}

const sessions = collect(records, (o) => Array.isArray(o.beats) && o.seat !== undefined)
const interlocks = collect(records, (o) => Array.isArray(o.ledger) && Array.isArray(o.crossRefs))

if (sessions.length === 0) {
  console.error('no sessions found in journal — is the run still in its first phase?')
  process.exit(1)
}

/** Last write wins per seat, so a resumed run supersedes an earlier attempt. */
const bySeat = new Map()
for (const s of sessions) bySeat.set(s.seat, s)

/** Placeholder so the UI can be worked on before every seat has landed. */
const STUB = ['xFRONT', 'xCORE', 'xBREAK', 'xPIPE']
const partialOk = process.argv.includes('--allow-partial')

const ordered = []
for (let seat = 0; seat < 4; seat++) {
  let s = bySeat.get(seat)
  if (!s && partialOk) {
    console.warn(`  ! seat ${seat} not authored yet — stubbing`)
    s = {
      seat,
      codename: STUB[seat],
      discipline: 'pending',
      workItem: 'awaiting authored cycle',
      repo: 'xstartup/pending',
      stack: [],
      metrics: [],
      beats: [],
    }
  }
  if (!s) {
    console.error(`missing seat ${seat} — refusing to write a partial data file`)
    console.error('pass --allow-partial to stub the gaps while iterating')
    process.exit(1)
  }
  // The UI assumes strictly increasing, in-range timestamps; enforce it here
  // rather than defensively at every read site.
  const beats = s.beats
    .filter((b) => Number.isFinite(b.t) && b.t >= 0 && b.t < CYCLE)
    .sort((a, b) => a.t - b.t)
  let last = -1
  for (const b of beats) {
    if (b.t <= last) b.t = last + 1
    last = b.t
  }
  ordered.push({ ...s, cycleSeconds: CYCLE, beats })
}

const interlock = interlocks.at(-1) ?? { ledger: [], crossRefs: [] }
interlock.ledger = interlock.ledger
  .filter((l) => Number.isFinite(l.t) && l.t >= 0 && l.t < CYCLE)
  .sort((a, b) => a.t - b.t)
interlock.crossRefs = interlock.crossRefs.sort((a, b) => a.t - b.t)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(decode({ sessions: ordered, interlock }), null, 1))

console.log(`wrote ${OUT}`)
for (const s of ordered) {
  const notes = s.beats.filter((b) => b.note).length
  console.log(
    `  seat ${s.seat} ${s.codename.padEnd(8)} ${String(s.beats.length).padStart(3)} beats  ${notes} notes  ${s.metrics.length} metrics`,
  )
}
console.log(`  ledger ${interlock.ledger.length} lines, ${interlock.crossRefs.length} crossrefs`)
