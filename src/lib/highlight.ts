/**
 * A deliberately small tokenizer for the editor pane.
 *
 * Syntax colour is expressed purely as luminance — the site has one accent and
 * it is reserved for attention states, so a red-green-purple theme would be
 * the loudest thing on the page. Keywords sit at full white, values step down,
 * comments nearly vanish. It reads as syntax highlighting without introducing
 * a second palette.
 */

export interface Tok {
  t: string
  c: string
}

/** Opaque, not white-with-alpha: the surface is grey, so alpha washes out. */
export const TONE = {
  kw: '#e8e8e8',
  num: '#b6b6b6',
  str: '#8a8a8a',
  com: '#585858',
  def: '#a0a0a0',
  punc: '#767676',
}

const KEYWORDS = new Set([
  // shared control flow
  'if', 'else', 'for', 'while', 'return', 'break', 'continue', 'switch', 'case',
  'default', 'try', 'catch', 'finally', 'throw', 'defer', 'go', 'select', 'range',
  // declarations
  'func', 'function', 'const', 'let', 'var', 'type', 'struct', 'interface',
  'class', 'enum', 'import', 'export', 'from', 'package', 'module', 'def',
  'async', 'await', 'new', 'static', 'public', 'private', 'extends', 'implements',
  // types / literals
  'int', 'int64', 'uint8', 'float64', 'string', 'bool', 'byte', 'void', 'char',
  'true', 'false', 'nil', 'null', 'undefined', 'self', 'this',
  // sql / config
  'select', 'insert', 'update', 'delete', 'create', 'alter', 'index', 'table',
  'where', 'join', 'on', 'not', 'and', 'or', 'resource', 'variable', 'output',
])

const HASH_COMMENT = new Set([
  'yaml', 'yml', 'py', 'python', 'sh', 'bash', 'zsh', 'hcl', 'tf', 'terraform',
  'toml', 'conf', 'dockerfile', 'make', 'mk', 'ini', 'rb',
])

const isWord = (c: string) => /[A-Za-z0-9_$]/.test(c)

export function tokenize(line: string, lang = ''): Tok[] {
  const l = lang.toLowerCase()
  const hash = HASH_COMMENT.has(l)
  const dash = l === 'sql'
  const out: Tok[] = []
  let i = 0
  let buf = ''

  const flush = (c = TONE.def) => {
    if (buf) out.push({ t: buf, c })
    buf = ''
  }

  while (i < line.length) {
    const ch = line[i]
    const two = line.slice(i, i + 2)

    if (two === '//' || two === '/*' || (hash && ch === '#') || (dash && two === '--')) {
      flush()
      out.push({ t: line.slice(i), c: TONE.com })
      return out
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      flush()
      let j = i + 1
      while (j < line.length && line[j] !== ch) j += line[j] === '\\' ? 2 : 1
      out.push({ t: line.slice(i, Math.min(j + 1, line.length)), c: TONE.str })
      i = j + 1
      continue
    }

    if (isWord(ch)) {
      buf += ch
      i++
      continue
    }

    // Word boundary: classify what we collected.
    if (buf) {
      if (KEYWORDS.has(buf)) flush(TONE.kw)
      else if (/^\d/.test(buf)) flush(TONE.num)
      else flush()
    }
    out.push({ t: ch, c: TONE.punc })
    i++
  }

  if (buf) {
    if (KEYWORDS.has(buf)) flush(TONE.kw)
    else if (/^\d/.test(buf)) flush(TONE.num)
    else flush()
  }
  return out
}
