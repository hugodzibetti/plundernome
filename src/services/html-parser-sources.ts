import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import {
  getElementsByTag, childrenByTag, hasClass, getAttr, getText,
  findLinkTitle, buildGame, parseSize,
} from './html-parser-helpers'

export function parseFitGirlArticle(container: any, source: SourceDefinition): Game | null {
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

  let description = ''
  for (const p of ps) {
    const txt = getText(p)
    if (!txt.toLowerCase().startsWith('size') && txt.length > 0) {
      const links = getElementsByTag(p, 'a')
      if (links.length === 0) {
        description = txt
        break
      }
    }
  }

  let imageUrl: string | undefined
  const imgs = getElementsByTag(container, 'img')
  for (const img of imgs) {
    const src = getAttr(img, 'src')
    if (src) {
      imageUrl = src
      break
    }
  }

  let lastUpdated = new Date().toISOString()
  const times = getElementsByTag(container, 'time')
  if (times.length > 0) {
    const dt = getAttr(times[0], 'datetime')
    if (dt) lastUpdated = dt
  }

  const tags: string[] = []
  for (const a of getElementsByTag(container, 'a')) {
    const rel = getAttr(a, 'rel')
    if (rel === 'tag') {
      const t = getText(a)
      if (t) tags.push(t)
    }
  }

  return buildGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}

export function parseSteamripArticle(container: any, source: SourceDefinition): Game | null {
  const titleInfo = findLinkTitle(container)
  if (!titleInfo) return null
  const { name, url } = titleInfo

  let sizeStr = ''
  let sizeBytes = 0
  const spans = getElementsByTag(container, 'span')
  for (const span of spans) {
    if (hasClass(span, 'post-size')) {
      sizeStr = getText(span)
      sizeBytes = parseSize(sizeStr)
      break
    }
  }

  let description = ''
  const ecs = getElementsByTag(container, 'div')
  for (const ec of ecs) {
    if (hasClass(ec, 'entry-content')) {
      const childPs = childrenByTag(ec, 'p')
      if (childPs.length > 0) description = getText(childPs[0])
      break
    }
  }

  let imageUrl: string | undefined
  const imgs = getElementsByTag(container, 'img')
  for (const img of imgs) {
    const src = getAttr(img, 'src')
    if (src) {
      imageUrl = src
      break
    }
  }

  let lastUpdated = new Date().toISOString()
  const times = getElementsByTag(container, 'time')
  for (const time of times) {
    if (hasClass(time, 'entry-date')) {
      const dt = getAttr(time, 'datetime')
      if (dt) lastUpdated = dt
      break
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

  return buildGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}
