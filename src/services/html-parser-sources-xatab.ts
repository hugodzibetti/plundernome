import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import {
  getElementsByTag, childrenByTag, hasClass, getAttr, getText,
  findLinkTitle, buildGame, parseSize,
} from './html-parser-helpers'

export function parseXatabContainer(container: any, source: SourceDefinition): Game | null {
  let titleInfo = findLinkTitle(container)
  if (!titleInfo) {
    const divs = childrenByTag(container, 'div')
    for (const d of divs) {
      if (hasClass(d, 'post-title') || hasClass(d, 'game-title')) {
        const links = getElementsByTag(d, 'a')
        for (const link of links) {
          const url = getAttr(link, 'href')
          const name = getText(link)
          if (name && url) { titleInfo = { name, url }; break }
        }
        if (titleInfo) break
      }
    }
  }
  if (!titleInfo) return null
  const { name, url } = titleInfo

  let sizeStr = ''
  let sizeBytes = 0
  for (const tag of ['p', 'span', 'div']) {
    const els = getElementsByTag(container, tag)
    for (const el of els) {
      const txt = getText(el)
      if (/size|размер/i.test(txt)) {
        const val = txt.replace(/^size[:\s]*/i, '').replace(/^размер[:\s]*/i, '').trim()
        sizeStr = val
        sizeBytes = parseSize(val)
        break
      }
    }
    if (sizeStr) break
  }

  let description = ''
  const ps = getElementsByTag(container, 'p')
  for (const p of ps) {
    const txt = getText(p)
    if (!/size|размер/i.test(txt) && txt.length > 0) {
      const links = getElementsByTag(p, 'a')
      if (links.length === 0) { description = txt; break }
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
    for (const s of spans) {
      if (hasClass(s, 'post-date') || hasClass(s, 'date')) {
        const txt = getText(s)
        if (txt) { try { lastUpdated = new Date(txt).toISOString() } catch {}; break }
      }
    }
  }

  const tags: string[] = []
  for (const a of getElementsByTag(container, 'a')) {
    const rel = getAttr(a, 'rel')
    if (rel === 'tag') { const t = getText(a); if (t) tags.push(t) }
  }

  return buildGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}