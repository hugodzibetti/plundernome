import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import {
  getElementsByTag, childrenByTag, hasClass, getAttr, getText,
  findLinkTitle, buildGame, parseSize,
} from './html-parser-helpers'

export function parseOnlinefixContainer(container: any, source: SourceDefinition): Game | null {
  const titleInfo = findLinkTitle(container)
  if (!titleInfo) return null
  const { name, url } = titleInfo

  let sizeStr = ''
  let sizeBytes = 0
  const ps = getElementsByTag(container, 'p')
  for (const p of ps) {
    const txt = getText(p)
    if (txt.toLowerCase().startsWith('size')) {
      const val = txt.replace(/^size[:\s]*/i, '').trim()
      sizeStr = val
      sizeBytes = parseSize(val)
      break
    }
  }
  if (!sizeStr) {
    const lis = getElementsByTag(container, 'li')
    for (const li of lis) {
      const txt = getText(li)
      if (txt.toLowerCase().startsWith('size')) {
        const val = txt.replace(/^size[:\s]*/i, '').trim()
        sizeStr = val
        sizeBytes = parseSize(val)
        break
      }
    }
  }

  let description = ''
  const ecs = getElementsByTag(container, 'div')
  for (const ec of ecs) {
    if (hasClass(ec, 'entry-content')) {
      const childPs = childrenByTag(ec, 'p')
      if (childPs.length > 0) { description = getText(childPs[0]); break }
    }
  }
  if (!description) {
    for (const p of ps) {
      const txt = getText(p)
      if (!txt.toLowerCase().startsWith('size') && txt.length > 0) {
        const links = getElementsByTag(p, 'a')
        if (links.length === 0) { description = txt; break }
      }
    }
  }

  let imageUrl: string | undefined
  const imgs = getElementsByTag(container, 'img')
  for (const img of imgs) {
    const src = getAttr(img, 'src')
    if (src) { imageUrl = src; break }
  }

  let lastUpdated = new Date().toISOString()
  const times = getElementsByTag(container, 'time')
  if (times.length > 0) {
    const dt = getAttr(times[0], 'datetime')
    if (dt) lastUpdated = dt
  }
  if (!lastUpdated) {
    const spans = getElementsByTag(container, 'span')
    for (const span of spans) {
      if (hasClass(span, 'post-date')) {
        const txt = getText(span)
        if (txt) {
          try { lastUpdated = new Date(txt).toISOString() } catch {}
        }
        break
      }
    }
  }

  const tags: string[] = []
  for (const a of getElementsByTag(container, 'a')) {
    const rel = getAttr(a, 'rel')
    if (rel === 'tag') {
      const t = getText(a)
      if (t) tags.push(t)
    }
  }
  const spans = getElementsByTag(container, 'span')
  for (const span of spans) {
    if (hasClass(span, 'tag')) {
      const links = getElementsByTag(span, 'a')
      for (const a of links) {
        const t = getText(a)
        if (t && !tags.includes(t)) tags.push(t)
      }
    }
  }

  return buildGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}
