import { useMemo, useState } from 'react'
import type { Session } from '../data/types'
import { tokenize } from '../lib/highlight'

interface FileBlob {
  lines: string[]
  lang?: string
}

interface Node {
  name: string
  path: string
  children?: Node[]
  file?: FileBlob
}

/**
 * Collect every file the seat touched this cycle. Later beats win, so the tree
 * shows the newest version of a file the agent edited more than once.
 */
function collectFiles(session: Session): Map<string, FileBlob> {
  const out = new Map<string, FileBlob>()
  for (const b of session.beats) {
    if (b.pane === 'editor' && b.path && b.lines?.length) {
      out.set(b.path, { lines: b.lines, lang: b.lang })
    }
  }
  return out
}

function buildTree(files: Map<string, FileBlob>): Node[] {
  const root: Node = { name: '', path: '', children: [] }

  for (const [path, blob] of files) {
    const parts = path.split('/')
    let node = root
    parts.forEach((part, i) => {
      const isLeaf = i === parts.length - 1
      const childPath = parts.slice(0, i + 1).join('/')
      node.children ??= []
      let next = node.children.find((c) => c.name === part)
      if (!next) {
        next = isLeaf
          ? { name: part, path: childPath, file: blob }
          : { name: part, path: childPath, children: [] }
        node.children.push(next)
      }
      node = next
    })
  }

  // Directories first, then alphabetical — the ordering every file manager uses.
  const sort = (nodes: Node[]): Node[] =>
    nodes
      .map((n) => (n.children ? { ...n, children: sort(n.children) } : n))
      .sort((a, b) => {
        const ad = a.children ? 0 : 1
        const bd = b.children ? 0 : 1
        return ad !== bd ? ad - bd : a.name.localeCompare(b.name)
      })

  return sort(root.children ?? [])
}

/** Disclosure triangle drawn with borders — no glyph, so no font fallback. */
function Caret({ open }: { open: boolean }) {
  return (
    <span
      className="block shrink-0 transition-transform duration-150"
      style={{
        width: 0,
        height: 0,
        borderLeft: '4px solid currentColor',
        borderTop: '3.5px solid transparent',
        borderBottom: '3.5px solid transparent',
        transform: open ? 'rotate(90deg)' : 'none',
      }}
    />
  )
}

function Row({
  node,
  depth,
  expanded,
  selected,
  accent,
  onToggle,
  onSelect,
}: {
  node: Node
  depth: number
  expanded: Set<string>
  selected: string
  accent: string
  onToggle: (p: string) => void
  onSelect: (p: string) => void
}) {
  const isDir = !!node.children
  const open = expanded.has(node.path)
  const isSel = selected === node.path

  return (
    <>
      <button
        onClick={() => (isDir ? onToggle(node.path) : onSelect(node.path))}
        className="flex w-full items-center gap-2 py-[3px] pr-2 text-left transition-colors hover:bg-raise"
        style={{
          paddingLeft: 10 + depth * 11,
          background: isSel ? 'rgba(255,255,255,0.05)' : undefined,
        }}
      >
        <span className="flex h-2 w-2 shrink-0 items-center text-ink-4">
          {isDir && <Caret open={open} />}
        </span>
        <span
          className="mono truncate text-[10.5px]"
          style={{ color: isSel ? accent : isDir ? '#a2a2a2' : '#737373' }}
        >
          {node.name}
        </span>
      </button>
      {isDir &&
        open &&
        node.children!.map((c) => (
          <Row
            key={c.path}
            node={c}
            depth={depth + 1}
            expanded={expanded}
            selected={selected}
            accent={accent}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </>
  )
}

export default function Files({
  session,
  currentPath,
  accent,
}: {
  session: Session
  currentPath?: string
  accent: string
}) {
  const files = useMemo(() => collectFiles(session), [session])
  const tree = useMemo(() => buildTree(files), [files])

  // Every directory starts open: this is a handful of paths, and a tree that
  // opens closed just makes the reader click before seeing anything.
  const allDirs = useMemo(() => {
    const acc = new Set<string>()
    const walk = (nodes: Node[]) =>
      nodes.forEach((n) => {
        if (n.children) {
          acc.add(n.path)
          walk(n.children)
        }
      })
    walk(tree)
    return acc
  }, [tree])

  const [expanded, setExpanded] = useState<Set<string>>(allDirs)
  const [picked, setPicked] = useState<string | null>(null)

  // Follow the agent until the reader takes over, then stay put — a viewer
  // that keeps yanking itself away mid-read is worse than a stale one.
  const fallback =
    currentPath && files.has(currentPath) ? currentPath : (files.keys().next().value ?? '')
  const selected = picked ?? fallback
  const blob = files.get(selected)

  const toggle = (p: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="strip">
        <span className="lbl-b">Files</span>
        <span className="lbl">{files.size}</span>
      </div>

      <div className="min-h-[120px] flex-1 overflow-auto border-b border-line py-1.5">
        {tree.map((n) => (
          <Row
            key={n.path}
            node={n}
            depth={0}
            expanded={expanded}
            selected={selected}
            accent={accent}
            onToggle={toggle}
            onSelect={(p) => setPicked(p)}
          />
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3.5 py-[6px]">
        <span className="mono truncate text-[10.5px] text-ink-2">
          {selected.split('/').pop() ?? '—'}
        </span>
        {picked && (
          <button className="lbl transition-colors hover:text-ink-2" onClick={() => setPicked(null)}>
            Follow
          </button>
        )}
      </div>

      <div className="min-h-[140px] flex-[1.2] overflow-auto bg-sunk py-2">
        {!blob ? (
          <div className="px-3.5 py-2 text-[10.5px] text-ink-4">No file selected.</div>
        ) : (
          blob.lines.map((line, i) => (
            <div key={i} className="mono flex whitespace-pre px-3 text-[10px] leading-[1.75]">
              <span className="mr-3 w-4 shrink-0 text-right text-ink-4 select-none num">
                {i + 1}
              </span>
              <span className="min-w-0">
                {tokenize(line, blob.lang).map((tk, j) => (
                  <span key={j} style={{ color: tk.c }}>
                    {tk.t}
                  </span>
                ))}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
