// Lightweight regex-based HTML DOM for GJS when GXml unavailable.
// Matches GXml API surface used by parsers.

const TAG_REG = /<(\w+)([^>]*?)>([\s\S]*?)<\/\1>/gi
const SELF_CLOSING = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'])
const ATTR_REG = /(\S+)\s*=\s*"([^"]*)"/g

function parseAttrs(chunk: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  let m: RegExpExecArray | null
  ATTR_REG.lastIndex = 0
  while ((m = ATTR_REG.exec(chunk)) !== null) {
    if (m[1] !== undefined && m[2] !== undefined) attrs[m[1]] = m[2]
  }
  return attrs
}

interface FallbackElement {
  tag: string
  attrs: Record<string, string>
  text: string
  kids: FallbackElement[]
}

// Linked list node for GXml iteration
interface GXmlListItem {
  data: GXmlElement
  next: GXmlListItem | null
}

interface GXmlElement {
  tagName: string
  get_tag_name(): string
  get_attribute(name: string): string | null
  get_text_content(): string
  get_child_elements(): GXmlListItem | null
  get_elements_by_tag_name(tag: string): GXmlListItem | null
}

function makeList(items: GXmlElement[]): GXmlListItem | null {
  if (items.length === 0) return null
  let head: GXmlListItem = { data: items[0]!, next: null }
  let cur = head
  for (let i = 1; i < items.length; i++) {
    cur.next = { data: items[i]!, next: null }
    cur = cur.next
  }
  return head
}

function buildElement(el: FallbackElement): GXmlElement {
  const children: GXmlElement[] = el.kids.map(c => buildElement(c))
  const elem: GXmlElement = {
    tagName: el.tag,
    get_tag_name() { return el.tag },
    get_attribute(name: string) { return el.attrs[name] ?? null },
    get_text_content() { return el.text },
    get_child_elements() { return makeList(children) },
    get_elements_by_tag_name(tag: string) {
      const result: GXmlElement[] = []
      function walk(list: FallbackElement[]) {
        for (const e of list) {
          if (tag === '*' || e.tag === tag) result.push(buildElement(e))
          walk(e.kids)
        }
      }
      walk([el])
      return makeList(result)
    },
  }
  return elem
}

function parseTag(html: string): FallbackElement | null {
  const m = html.match(/^<(\w+)([^>]*?)>/)
  if (!m) return null
  const tag = (m[1] ?? '').toLowerCase()
  const attrs = parseAttrs(m[2] ?? '')
  if (SELF_CLOSING.has(tag)) return { tag, attrs, text: '', kids: [] }
  const inner = html.slice(m[0].length)
  const text = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  const kids: FallbackElement[] = []
  let rest = inner
  while (rest.length > 0) {
    TAG_REG.lastIndex = 0
    const cm = TAG_REG.exec(rest)
    if (!cm) break
    const child = parseTag(cm[0])
    if (child) kids.push(child)
    rest = rest.slice(cm.index + cm[0].length)
  }
  return { tag, attrs, text, kids }
}

/**
 * Parse HTML into a GXml-compatible structure without GXml library.
 * Returns object with get_document_element() and documentElement properties.
 */
export function parseHtmlFallback(html: string, _baseUrl: string): object | null {
  try {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const content = bodyMatch ? bodyMatch[1]! : html
    const root: FallbackElement = { tag: 'body', attrs: {}, text: '', kids: [] }
    TAG_REG.lastIndex = 0
    let rest = content
    while (rest.length > 0) {
      TAG_REG.lastIndex = 0
      const m = TAG_REG.exec(rest)
      if (!m) break
      const el = parseTag(m[0])
      if (el) root.kids.push(el)
      rest = rest.slice(m.index + m[0].length)
    }
    const docElem = buildElement(root)
    return {
      get_document_element() { return docElem },
      documentElement: docElem,
    }
  } catch {
    return null
  }
}
