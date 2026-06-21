import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import {
  getElementsByTag, childrenByTag, hasClass, getAttr, getText,
  buildGame, parseSize,
} from './html-parser-helpers'

export function parseElAmigosGame(container: any, source: SourceDefinition): Game | null {
  let name = ''
  let url = ''
  const linkEls = getElementsByTag(container, 'a')
  for (const a of linkEls) {
    const href = getAttr(a, 'href')
    const txt = getText(a)
    if (href && txt && !href.startsWith('#') && href !== '/') {
      name = txt; url = href; break
    }
  }
  if (!name || !url) return null

  let sizeStr = ''
  let sizeBytes = 0
  const allEls = getElementsByTag(container, '*')
  for (const el of allEls) {
    const cls = getAttr(el, 'class')
    if (cls && hasClass(el, 'text-body-secondary')) {
      sizeStr = getText(el)
      sizeBytes = parseSize(sizeStr)
      break
    }
  }

  let description = ''
  const smalls = getElementsByTag(container, 'small')
  for (const sm of smalls) {
    const txt = getText(sm)
    if (txt && txt.length > 0) {
      description = txt
      break
    }
  }

  let imageUrl: string | undefined
  const imgs = getElementsByTag(container, 'img')
  for (const img of imgs) {
    const src = getAttr(img, 'src')
    if (src && !src.includes('banner') && !src.includes('logo')) {
      imageUrl = src; break
    }
  }

  const tags: string[] = []
  return buildGame(name, url, sizeStr, sizeBytes, description, new Date().toISOString(), imageUrl, tags, source)
}

export function parseGloadGame(container: any, source: SourceDefinition): Game | null {
  const linkWrapper = getElementsByTag(container, 'a')
  let name = ''
  let url = ''
  for (const a of linkWrapper) {
    const cls = getAttr(a, 'class')
    if (cls && hasClass(a, 'card-link-wrapper')) {
      url = getAttr(a, 'href') ?? ''
      const titles = getElementsByTag(a, 'h2')
      if (titles.length > 0) {
        name = getText(titles[0])
      }
      if (!name) {
        const h3s = getElementsByTag(a, 'h3')
        if (h3s.length > 0) name = getText(h3s[0])
      }
      break
    }
  }
  if (!name || !url) return null

  let sizeStr = ''
  let sizeBytes = 0
  const sizeDivs = getElementsByTag(container, 'div')
  for (const d of sizeDivs) {
    const cls = getAttr(d, 'class')
    if (cls?.includes('card-size') || cls?.includes('list-size')) {
      sizeStr = getText(d).replace(/[\d.,]+\s*GB|MB|KB/g, m => m)
      const match = getText(d).match(/[\d.,]+\s*(GB|MB|KB)/i)
      if (match) {
        sizeStr = match[0]
        sizeBytes = parseSize(sizeStr)
      }
      break
    }
  }
  if (!sizeStr) {
    const metaDivs = getElementsByTag(container, 'div')
    for (const d of metaDivs) {
      const cls = getAttr(d, 'class')
      if (cls?.includes('covers-meta-item')) {
        const txt = getText(d)
        const match = txt.match(/[\d.,]+\s*(GB|MB|KB)/i)
        if (match) {
          sizeStr = match[0]; sizeBytes = parseSize(sizeStr); break
        }
      }
    }
  }

  let description = ''
  const excerpts = getElementsByTag(container, 'div')
  for (const d of excerpts) {
    const cls = getAttr(d, 'class')
    if (cls?.includes('card-excerpt')) {
      description = getText(d)
      break
    }
  }

  let imageUrl: string | undefined
  const imgs = getElementsByTag(container, 'img')
  for (const img of imgs) {
    const src = getAttr(img, 'src')
    if (src && !src.includes('logo')) {
      imageUrl = src; break
    }
  }

  let lastUpdated = new Date().toISOString()
  const dateDivs = getElementsByTag(container, 'div')
  for (const d of dateDivs) {
    const cls = getAttr(d, 'class')
    if (cls?.includes('card-date') || cls?.includes('list-date')) {
      const txt = getText(d)
      if (txt) {
        try { lastUpdated = new Date(txt).toISOString() } catch {}
      }
      break
    }
  }

  const tags: string[] = []
  for (const d of getElementsByTag(container, 'div')) {
    const cls = getAttr(d, 'class')
    if (cls?.includes('card-genre')) {
      const t = getText(d)
      if (t) tags.push(t)
    }
  }
  if (tags.length === 0) {
    const articleCls = getAttr(container, 'class') ?? ''
    const genreMatches = articleCls.match(/genre-(\S+)/g)
    if (genreMatches) {
      for (const g of genreMatches) {
        tags.push(g.replace('genre-', ''))
      }
    }
  }

  return buildGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}

export function parseOvaGamesGame(container: any, source: SourceDefinition): Game | null {
  let name = ''
  let url = ''
  const titleDivs = getElementsByTag(container, 'div')
  for (const d of titleDivs) {
    const cls = getAttr(d, 'class')
    if (cls?.includes('home-post-titles')) {
      const links = getElementsByTag(d, 'a')
      if (links.length > 0) {
        url = getAttr(links[0], 'href') ?? ''
        name = getText(links[0])
      }
      break
    }
  }
  if (!name || !url) return null

  let imageUrl: string | undefined
  const imgs = getElementsByTag(container, 'img')
  for (const img of imgs) {
    const src = getAttr(img, 'src')
    if (src && !src.includes('readmore') && !src.includes('logo') && !src.includes('button')) {
      imageUrl = src; break
    }
  }

  const tags: string[] = []
  return buildGame(name, url, '', 0, '', new Date().toISOString(), imageUrl, tags, source)
}

export function extractElAmigosDownloadLinks(html: string): string[] {
  const links: string[] = []
  const patterns = [
    /href="(https:\/\/mega\.nz\/[^"]+)"/gi,
    /href="(https:\/\/drive\.google\.com\/[^"]+)"/gi,
    /href="(https:\/\/www\.mediafire\.com\/[^"]+)"/gi,
    /href="(https:\/\/[^"]+1fichier[^"]+)"/gi,
    /href="(https:\/\/[^"]+uploaded[^"]+)"/gi,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) links.push(m[1]!)
  }
  return [...new Set(links)]
}

export function extractGloadDownloadLinks(html: string): string[] {
  const links: string[] = []
  const patterns = [
    /href="(magnet:[^"]+)"/gi,
    /href="([^"]+\.torrent)"/gi,
    /href="(https:\/\/(?:[^"]*mega[^"]*|upload[^"]*)[^"]*)"/gi,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) links.push(m[1]!)
  }
  return [...new Set(links)]
}

export function extractOvaGamesDownloadLinks(html: string): string[] {
  const links: string[] = []
  const patterns = [
    /href="(https:\/\/mega\.nz\/[^"]+)"/gi,
    /href="(https:\/\/www\.mediafire\.com\/[^"]+)"/gi,
    /href="(https:\/\/drive\.google\.com\/[^"]+)"/gi,
    /href="(magnet:[^"]+)"/gi,
    /href="([^"]+\.torrent)"/gi,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) links.push(m[1]!)
  }
  return [...new Set(links)]
}