import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import {
  getElementsByTag, childrenByTag, hasClass, getAttr, getText,
  buildGame, parseSize,
} from './html-parser-helpers'

export function parseGoggamesContainer(container: any, source: SourceDefinition): Game | null {
  let titleInfo: { name: string; url: string } | null = null
  const headers = childrenByTag(container, 'h2')
  for (const h of headers) {
    const links = getElementsByTag(h, 'a')
    for (const link of links) {
      const url = getAttr(link, 'href')
      const name = getText(link)
      if (name && url) { titleInfo = { name, url }; break }
    }
    if (titleInfo) break
  }
  if (!titleInfo) {
    const divs = getElementsByTag(container, 'div')
    for (const div of divs) {
      if (hasClass(div, 'game-title')) {
        const links = getElementsByTag(div, 'a')
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
  const spans = getElementsByTag(container, 'span')
  for (const span of spans) {
    if (hasClass(span, 'size')) {
      sizeStr = getText(span)
      sizeBytes = parseSize(sizeStr)
      break
    }
  }
  if (!sizeStr) {
    const tds = getElementsByTag(container, 'td')
    for (const td of tds) {
      if (hasClass(td, 'size')) {
        sizeStr = getText(td)
        sizeBytes = parseSize(sizeStr)
        break
      }
    }
  }

  let description = ''
  const ps = getElementsByTag(container, 'p')
  for (const p of ps) {
    const txt = getText(p)
    if (!txt.toLowerCase().startsWith('size') && txt.length > 0) {
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
  const dateSpans = getElementsByTag(container, 'span')
  for (const span of dateSpans) {
    if (hasClass(span, 'date')) {
      const txt = getText(span)
      if (txt) lastUpdated = txt
      break
    }
  }
  const tds = getElementsByTag(container, 'td')
  for (const td of tds) {
    if (hasClass(td, 'date')) {
      const txt = getText(td)
      if (txt) lastUpdated = txt
      break
    }
  }

  const tags: string[] = []
  for (const a of getElementsByTag(container, 'a')) {
    if (hasClass(a, 'genre')) {
      const t = getText(a)
      if (t) tags.push(t)
    }
  }

  return buildGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}
