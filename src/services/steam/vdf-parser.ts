export interface VdfEntry { [key: string]: string | number | VdfEntry }

function tokenize(text: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '"') {
      i++
      let s = ''
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < text.length) s += text[++i]
        else s += text[i]
        i++
      }
      i++
      tokens.push(s)
    } else if (c === '{' || c === '}') {
      tokens.push(c)
      i++
    } else {
      i++
    }
  }
  return tokens
}

function parse(tokens: string[], start: number): { entry: VdfEntry; next: number } {
  const entry: VdfEntry = {}
  let i = start
  while (i < tokens.length && tokens[i] !== '}') {
    const key = tokens[i++]
    if (key === undefined || i >= tokens.length) break
    if (tokens[i] === '{') {
      i++
      const result = parse(tokens, i)
      entry[key] = result.entry
      i = result.next
    } else {
      const val = tokens[i++]; if (val !== undefined) entry[key] = val
    }
  }
  return { entry, next: i + 1 }
}

export function parseVdf(text: string): VdfEntry {
  return parse(tokenize(text), 0).entry
}

function serializeEntry(entry: VdfEntry, indent: number): string {
  let s = ''
  for (const [key, value] of Object.entries(entry)) {
    if (typeof value === 'object' && value !== null) {
      s += `${'\t'.repeat(indent)}"${key}"\n${'\t'.repeat(indent)}{\n`
      s += serializeEntry(value as VdfEntry, indent + 1)
      s += `${'\t'.repeat(indent)}}\n`
    } else {
      s += `${'\t'.repeat(indent)}"${key}" "${value}"\n`
    }
  }
  return s
}

export function serializeVdf(entry: VdfEntry): string {
  return serializeEntry(entry, 0)
}
