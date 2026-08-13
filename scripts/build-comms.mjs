/**
 * Extracts the authored inter-agent transcript from a workflow run journal and
 * writes src/data/comms.json.
 *
 *   node scripts/build-comms.mjs <journal.jsonl>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/comms.json')
const CYCLE = 1800

const journalPath = process.argv[2]
if (!journalPath) {
  console.error('usage: node scripts/build-comms.mjs <journal.jsonl>')
  process.exit(1)
}

function collect(node, pred, found = []) {
  if (!node || typeof node !== 'object') return found
  if (pred(node)) found.push(node)
  for (const v of Array.isArray(node) ? node : Object.values(node)) collect(v, pred, found)
  return found
}

const records = []
for (const line of readFileSync(journalPath, 'utf8').trim().split('\n')) {
  try {
    records.push(JSON.parse(line))
  } catch {
    /* partial trailing write while the run is still going */
  }
}

const hit = collect(records, (o) => Array.isArray(o.messages) && o.messages.length > 0).at(-1)
if (!hit) {
  console.error('no messages found in journal — is the run still going?')
  process.exit(1)
}

const seen = new Set()
const messages = hit.messages
  .filter((m) => Number.isFinite(m.t) && m.t >= 0 && m.t < CYCLE)
  .filter((m) => Number.isInteger(m.from) && m.from >= 0 && m.from <= 3)
  // A 'direct' with no recipient would render as an unaddressed message; drop
  // it rather than inventing a target.
  .filter((m) => m.kind !== 'direct' || (Number.isInteger(m.to) && m.to !== m.from))
  .map((m) => (m.kind === 'direct' ? m : { t: m.t, from: m.from, kind: m.kind, text: m.text }))
  .sort((a, b) => a.t - b.t)
  .filter((m) => {
    const k = `${m.t}:${m.from}:${m.text}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

let last = -1
for (const m of messages) {
  if (m.t <= last) m.t = last + 1
  last = m.t
}

writeFileSync(OUT, JSON.stringify({ messages }, null, 1))

const by = (k) => messages.filter((m) => m.kind === k).length
console.log(`wrote ${OUT}`)
console.log(`  ${messages.length} messages — ${by('direct')} direct, ${by('broadcast')} broadcast, ${by('note')} note`)
