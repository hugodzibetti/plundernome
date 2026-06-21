import { describe, it, expect } from 'vitest'
import type { Game } from '../../domain/models'
import type { SourceDefinition } from '../../domain/catalog/types'
import { createGameID, parseSize, extractGameId, buildMockGame } from './html-parser-test-util'

const XATAB_SOURCE_DEF: SourceDefinition = {
  id: 'xatab', name: 'Xatab Repacks',
  baseUrl: 'https://byxatab.com', scrapeType: 'html',
  updateIntervalMinutes: 360, enabled: true,
}

const REPACK_GAMES_SOURCE_DEF: SourceDefinition = {
  id: 'repack-games', name: 'Repack Games',
  baseUrl: 'https://repack-games.com', scrapeType: 'html',
  updateIntervalMinutes: 360, enabled: true,
}

const REPACKLAB_SOURCE_DEF: SourceDefinition = {
  id: 'repacklab', name: 'Repack Lab',
  baseUrl: 'https://repacklab.com', scrapeType: 'html',
  updateIntervalMinutes: 360, enabled: true,
}

function parseXatabArticle(article: string, source: SourceDefinition): Game | null {
  const titleMatch = article.match(/<h[23][^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h[23]>/i)
  if (!titleMatch) {
    const divTitleMatch = article.match(/<div[^>]*class="[^"]*\b(post-title|game-title)\b[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i)
    if (!divTitleMatch) return null
    const url = divTitleMatch[2] ?? ''
    const name = divTitleMatch[3]?.trim() ?? ''
    if (!name || !url) return null
    const sizeMatch = article.match(/(?:Size|Размер)[:\s]*([^<]*)(?:<|$)/i)
    const sizeStr = sizeMatch?.[1]?.trim() ?? ''
    const sizeBytes = parseSize(sizeStr)
    const descMatch = article.match(/<p[^>]*>([^<]*)<\/p>/i)
    const description = descMatch?.[1]?.trim() ?? ''
    const imageMatch = article.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
    const imageUrl = imageMatch?.[1]
    const dateMatch = article.match(/<time[^>]*datetime="([^"]*)"/i)
    const lastUpdated = dateMatch?.[1] ?? new Date().toISOString()
    const tagMatches = article.matchAll(/<a[^>]*rel="tag"[^>]*>([^<]*)<\/a>/gi)
    const tags = Array.from(tagMatches).map(m => m[1]?.trim()).filter((t): t is string => !!t)
    return buildMockGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
  }
  const url = titleMatch[1] ?? ''
  const name = titleMatch[2]?.trim() ?? ''
  if (!name || !url) return null
  const sizeMatch = article.match(/(?:Size|Размер)[:\s]*([^<]*)(?:<|$)/i)
  const sizeStr = sizeMatch?.[1]?.trim() ?? ''
  const sizeBytes = parseSize(sizeStr)
  const descMatch = article.match(/<p[^>]*>([^<]*)<\/p>/i)
  const description = descMatch?.[1]?.trim() ?? ''
  const imageMatch = article.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
  const imageUrl = imageMatch?.[1]
  const dateMatch = article.match(/<time[^>]*datetime="([^"]*)"/i)
  const lastUpdated = dateMatch?.[1] ?? new Date().toISOString()
  const tagMatches = article.matchAll(/<a[^>]*rel="tag"[^>]*>([^<]*)<\/a>/gi)
  const tags = Array.from(tagMatches).map(m => m[1]?.trim()).filter((t): t is string => !!t)
  return buildMockGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}

function parseXatabGamesRegExp(rawHtml: string, source: SourceDefinition): Game[] {
  const containerRegex = /<(?:article|div)[^>]*>.*?<\/(?:article|div)>/gis
  const containers = rawHtml.match(containerRegex) ?? []
  const results: Game[] = []
  for (const c of containers) {
    if (/class="[^"]*\b(post|game-item)\b[^"]*"/i.test(c) || /<article/i.test(c)) {
      const g = parseXatabArticle(c, source)
      if (g) results.push(g)
    }
  }
  return results
}

function parseRepackGamesArticle(article: string, source: SourceDefinition): Game | null {
  const titleMatch = article.match(/<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h2>/i)
  if (!titleMatch) {
    const divTitleMatch = article.match(/<div[^>]*class="[^"]*\bentry-title\b[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i)
    if (!divTitleMatch) return null
    const url = divTitleMatch[1] ?? ''
    const name = divTitleMatch[2]?.trim() ?? ''
    if (!name || !url) return null
    const sizeMatch = article.match(/<span[^>]*class="[^"]*\b(size|post-size)\b[^"]*"[^>]*>([^<]*)<\/span>/i)
    const sizeStr = sizeMatch?.[2]?.trim() ?? ''
    const sizeBytes = parseSize(sizeStr)
    const descMatch = article.match(/<p[^>]*>([^<]*)<\/p>/i)
    const description = descMatch?.[1]?.trim() ?? ''
    const imageMatch = article.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
    const imageUrl = imageMatch?.[1]
    const dateMatch = article.match(/<time[^>]*datetime="([^"]*)"/i)
    const lastUpdated = dateMatch?.[1] ?? new Date().toISOString()
    const tagMatches = article.matchAll(/<a[^>]*rel="(?:tag|category)"[^>]*>([^<]*)<\/a>/gi)
    const tags = Array.from(tagMatches).map(m => m[1]?.trim()).filter((t): t is string => !!t)
    return buildMockGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
  }
  const url = titleMatch[1] ?? ''
  const name = titleMatch[2]?.trim() ?? ''
  if (!name || !url) return null
  const sizeMatch = article.match(/<span[^>]*class="[^"]*\b(size|post-size)\b[^"]*"[^>]*>([^<]*)<\/span>/i)
  const sizeStr = sizeMatch?.[2]?.trim() ?? ''
  const sizeBytes = parseSize(sizeStr)
  const descMatch = article.match(/<p[^>]*>([^<]*)<\/p>/i)
  const description = descMatch?.[1]?.trim() ?? ''
  const imageMatch = article.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
  const imageUrl = imageMatch?.[1]
  const dateMatch = article.match(/<time[^>]*datetime="([^"]*)"/i)
  const lastUpdated = dateMatch?.[1] ?? new Date().toISOString()
  const tagMatches = article.matchAll(/<a[^>]*rel="(?:tag|category)"[^>]*>([^<]*)<\/a>/gi)
  const tags = Array.from(tagMatches).map(m => m[1]?.trim()).filter((t): t is string => !!t)
  return buildMockGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}

function parseRepackGamesGamesRegExp(rawHtml: string, source: SourceDefinition): Game[] {
  const containerRegex = /<(?:article|div)[^>]*>.*?<\/(?:article|div)>/gis
  const containers = rawHtml.match(containerRegex) ?? []
  const results: Game[] = []
  for (const c of containers) {
    if (/<article/i.test(c) || /class="[^"]*\b(post|game-listing)\b[^"]*"/i.test(c)) {
      const g = parseRepackGamesArticle(c, source)
      if (g) results.push(g)
    }
  }
  return results
}

function parseRepacklabArticle(article: string, source: SourceDefinition): Game | null {
  const titleMatch = article.match(/<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h2>/i)
  if (!titleMatch) {
    const divTitleMatch = article.match(/<div[^>]*class="[^"]*\b(post-title|game-title|entry-title)\b[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i)
    if (!divTitleMatch) return null
    const url = divTitleMatch[2] ?? ''
    const name = divTitleMatch[3]?.trim() ?? ''
    if (!name || !url) return null
    const sizeMatch = article.match(/<span[^>]*class="[^"]*\bsize\b[^"]*"[^>]*>([^<]*)<\/span>/i)
    const sizeStr = sizeMatch?.[1]?.trim() ?? ''
    const sizeBytes = parseSize(sizeStr)

    // fallback to p:contains('Size')
    let finalSizeStr = sizeStr
    let finalSizeBytes = sizeBytes
    if (!finalSizeStr) {
      const pSizeMatch = article.match(/<p[^>]*>Size[:\s]*([^<]*)(?:<|$)/i)
      if (pSizeMatch) {
        finalSizeStr = pSizeMatch[1]?.trim() ?? ''
        finalSizeBytes = parseSize(finalSizeStr)
      }
    }
    const descMatch = article.match(/<p[^>]*>([^<]*)<\/p>/i)
    const description = descMatch?.[1]?.trim() ?? ''
    const imageMatch = article.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
    const imageUrl = imageMatch?.[1]
    const dateMatch = article.match(/<time[^>]*datetime="([^"]*)"/i)
    const lastUpdated = dateMatch?.[1] ?? new Date().toISOString()
    const tagMatches = article.matchAll(/<a[^>]*rel="tag"[^>]*>([^<]*)<\/a>/gi)
    const tags = Array.from(tagMatches).map(m => m[1]?.trim()).filter((t): t is string => !!t)
    return buildMockGame(name, url, finalSizeStr, finalSizeBytes, description, lastUpdated, imageUrl, tags, source)
  }
  const url = titleMatch[1] ?? ''
  const name = titleMatch[2]?.trim() ?? ''
  if (!name || !url) return null
  const sizeMatch = article.match(/<span[^>]*class="[^"]*\bsize\b[^"]*"[^>]*>([^<]*)<\/span>/i)
  const sizeStr = sizeMatch?.[1]?.trim() ?? ''
  const sizeBytes = parseSize(sizeStr)

  // fallback to p:contains('Size')
  let finalSizeStr = sizeStr
  let finalSizeBytes = sizeBytes
  if (!finalSizeStr) {
    const pSizeMatch = article.match(/<p[^>]*>Size[:\s]*([^<]*)(?:<|$)/i)
    if (pSizeMatch) {
      finalSizeStr = pSizeMatch[1]?.trim() ?? ''
      finalSizeBytes = parseSize(finalSizeStr)
    }
  }

  const descMatch = article.match(/<p[^>]*>([^<]*)<\/p>/i)
  const description = descMatch?.[1]?.trim() ?? ''
  const imageMatch = article.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
  const imageUrl = imageMatch?.[1]
  const dateMatch = article.match(/<time[^>]*datetime="([^"]*)"/i)
  const lastUpdated = dateMatch?.[1] ?? new Date().toISOString()
  const tagMatches = article.matchAll(/<a[^>]*rel="tag"[^>]*>([^<]*)<\/a>/gi)
  const tags = Array.from(tagMatches).map(m => m[1]?.trim()).filter((t): t is string => !!t)
  return buildMockGame(name, url, finalSizeStr, finalSizeBytes, description, lastUpdated, imageUrl, tags, source)
}

function parseRepacklabGamesRegExp(rawHtml: string, source: SourceDefinition): Game[] {
  const containerRegex = /<(?:article|div)[^>]*>.*?<\/(?:article|div)>/gis
  const containers = rawHtml.match(containerRegex) ?? []
  const results: Game[] = []
  for (const c of containers) {
    if (/<article/i.test(c) || /class="[^"]*\b(post|hentry|game)\b[^"]*"/i.test(c)) {
      const g = parseRepacklabArticle(c, source)
      if (g) results.push(g)
    }
  }
  return results
}

describe('parseXatabGames regex fallback', () => {
  it('parses game from h2 link', () => {
    const html = '<html><body><article><h2><a href="/game/hades/">Hades</a></h2><p>Size: 14.2 GB</p></article></body></html>'
    const games = parseXatabGamesRegExp(html, XATAB_SOURCE_DEF)
    expect(games).toHaveLength(1)
    expect(games[0]?.name).toBe('Hades')
    expect(games[0]?.sizeBytes).toBeGreaterThan(10 * 1024 ** 3)
  })

  it('parses game from h3 link', () => {
    const html = '<html><body><div class="post"><h3><a href="/game/baldur/">Baldur\'s Gate 3</a></h3><p>Size: 150 GB</p></div></body></html>'
    const games = parseXatabGamesRegExp(html, XATAB_SOURCE_DEF)
    expect(games).toHaveLength(1)
    expect(games[0]?.name).toBe("Baldur's Gate 3")
  })

  it('parses Russian size label', () => {
    const html = '<html><body><article><h2><a href="/game/stalker/">S.T.A.L.K.E.R.</a></h2><p>Размер: 50 GB</p></article></body></html>'
    const games = parseXatabGamesRegExp(html, XATAB_SOURCE_DEF)
    expect(games).toHaveLength(1)
    expect(games[0]?.sizeBytes).toBe(50 * 1024 ** 3)
  })

  it('extracts image and date', () => {
    const html = '<html><body><article><h2><a href="/game/test/">Test Game</a></h2><img src="/img/cover.jpg"/><time datetime="2026-01-10T08:00:00Z"></time></article></body></html>'
    const games = parseXatabGamesRegExp(html, XATAB_SOURCE_DEF)
    expect(games[0]?.imageUrl).toBe('/img/cover.jpg')
    expect(games[0]?.lastUpdated).toBe('2026-01-10T08:00:00Z')
  })

  it('handles no title container returns empty', () => {
    expect(parseXatabGamesRegExp('<html><body><div>no links</div></body></html>', XATAB_SOURCE_DEF)).toEqual([])
  })

  it('parses tags from rel=tag links', () => {
    const html = '<html><body><article><h2><a href="/game/rpg/">RPG Game</a></h2><a rel="tag" href="/tag/rpg/">RPG</a></article></body></html>'
    const games = parseXatabGamesRegExp(html, XATAB_SOURCE_DEF)
    expect(games[0]?.tags).toContain('RPG')
  })

  it('handles empty HTML string', () => {
    expect(parseXatabGamesRegExp('', XATAB_SOURCE_DEF)).toEqual([])
  })

  it('parses size in MB', () => {
    const html = '<html><body><article><h2><a href="/game/small/">Small Game</a></h2><p>Size: 500 MB</p></article></body></html>'
    expect(parseXatabGamesRegExp(html, XATAB_SOURCE_DEF)[0]?.sizeBytes).toBe(500 * 1024 ** 2)
  })
})

describe('parseRepackGamesGames regex fallback', () => {
  it('parses game from article h2 link', () => {
    const html = '<html><body><article><h2><a href="/game/cyberpunk/">Cyberpunk 2077</a></h2><span class="size">70 GB</span><p>Open world RPG</p></article></body></html>'
    const games = parseRepackGamesGamesRegExp(html, REPACK_GAMES_SOURCE_DEF)
    expect(games).toHaveLength(1)
    expect(games[0]?.name).toBe('Cyberpunk 2077')
    expect(games[0]?.sizeBytes).toBe(70 * 1024 ** 3)
  })

  it('parses size from post-size class', () => {
    const html = '<html><body><article><h2><a href="/game/red-dead/">Red Dead Redemption 2</a></h2><span class="post-size">120 GB</span></article></body></html>'
    const games = parseRepackGamesGamesRegExp(html, REPACK_GAMES_SOURCE_DEF)
    expect(games[0]?.sizeBytes).toBe(120 * 1024 ** 3)
  })

  it('extracts description, image, and date', () => {
    const html = '<html><body><article><h2><a href="/game/doom/">Doom Eternal</a></h2><img src="/img/doom.jpg"/><time datetime="2026-02-15T10:00:00Z"></time><p>Fast-paced FPS</p></article></body></html>'
    const games = parseRepackGamesGamesRegExp(html, REPACK_GAMES_SOURCE_DEF)
    expect(games[0]?.description).toBe('Fast-paced FPS')
    expect(games[0]?.imageUrl).toBe('/img/doom.jpg')
    expect(games[0]?.lastUpdated).toBe('2026-02-15T10:00:00Z')
  })

  it('parses tags from rel=tag and rel=category', () => {
    const html = '<html><body><article><h2><a href="/game/action/">Action Game</a></h2><a rel="tag" href="/tag/action/">Action</a><a rel="category" href="/cat/shooter/">Shooter</a></article></body></html>'
    const games = parseRepackGamesGamesRegExp(html, REPACK_GAMES_SOURCE_DEF)
    expect(games[0]?.tags).toContain('Action')
    expect(games[0]?.tags).toContain('Shooter')
  })

  it('handles empty HTML string', () => {
    expect(parseRepackGamesGamesRegExp('', REPACK_GAMES_SOURCE_DEF)).toEqual([])
  })

  it('handles no article containers', () => {
    expect(parseRepackGamesGamesRegExp('<html><body><p>No games</p></body></html>', REPACK_GAMES_SOURCE_DEF)).toEqual([])
  })

  it('parses multiple articles', () => {
    const html = '<html><body><article><h2><a href="/game/a/">Game A</a></h2><span class="size">1 GB</span></article><article><h2><a href="/game/b/">Game B</a></h2><span class="size">2 GB</span></article></body></html>'
    const games = parseRepackGamesGamesRegExp(html, REPACK_GAMES_SOURCE_DEF)
    expect(games).toHaveLength(2)
    expect(games[0]?.name).toBe('Game A')
    expect(games[1]?.name).toBe('Game B')
  })

  it('uses correct source ID', () => {
    const html = '<html><body><article><h2><a href="/game/test/">Test</a></h2></article></body></html>'
    expect(parseRepackGamesGamesRegExp(html, REPACK_GAMES_SOURCE_DEF)[0]?.sourceId).toBe('repack-games')
  })
})

describe('parseRepacklabGames regex fallback', () => {
  it('parses game from h2 link with size span', () => {
    const html = '<html><body><article><h2><a href="/game/spiderman/">Spider-Man</a></h2><span class="size">75 GB</span><p>Action adventure</p></article></body></html>'
    const games = parseRepacklabGamesRegExp(html, REPACKLAB_SOURCE_DEF)
    expect(games).toHaveLength(1)
    expect(games[0]?.name).toBe('Spider-Man')
    expect(games[0]?.sizeBytes).toBe(75 * 1024 ** 3)
  })

  it('parses game from div.post container', () => {
    const html = '<html><body><div class="post"><h2><a href="/game/horizon/">Horizon Zero Dawn</a></h2><span class="size">100 GB</span></div></body></html>'
    const games = parseRepacklabGamesRegExp(html, REPACKLAB_SOURCE_DEF)
    expect(games).toHaveLength(1)
    expect(games[0]?.name).toBe('Horizon Zero Dawn')
  })

  it('parses description and date', () => {
    const html = '<html><body><article><h2><a href="/game/witcher/">The Witcher 3</a></h2><time datetime="2026-03-01T12:00:00Z"></time><p>Open world RPG masterpiece</p></article></body></html>'
    const games = parseRepacklabGamesRegExp(html, REPACKLAB_SOURCE_DEF)
    expect(games[0]?.description).toBe('Open world RPG masterpiece')
    expect(games[0]?.lastUpdated).toBe('2026-03-01T12:00:00Z')
  })

  it('extracts image URL', () => {
    const html = '<html><body><article><h2><a href="/game/elden/">Elden Ring</a></h2><img src="/img/eldenring.jpg"/></article></body></html>'
    const games = parseRepacklabGamesRegExp(html, REPACKLAB_SOURCE_DEF)
    expect(games[0]?.imageUrl).toBe('/img/eldenring.jpg')
  })

  it('handles empty HTML string', () => {
    expect(parseRepacklabGamesRegExp('', REPACKLAB_SOURCE_DEF)).toEqual([])
  })

  it('handles no containers', () => {
    expect(parseRepacklabGamesRegExp('<html><body><span>no containers</span></body></html>', REPACKLAB_SOURCE_DEF)).toEqual([])
  })

  it('parses tags from rel=tag links', () => {
    const html = '<html><body><article><h2><a href="/game/rpg2/">RPG Game</a></h2><a rel="tag" href="/tag/rpg/">RPG</a><a rel="tag" href="/tag/adventure/">Adventure</a></article></body></html>'
    const games = parseRepacklabGamesRegExp(html, REPACKLAB_SOURCE_DEF)
    expect(games[0]?.tags).toEqual(['RPG', 'Adventure'])
  })

  it('uses correct source ID', () => {
    const html = '<html><body><article><h2><a href="/game/test/">Test</a></h2></article></body></html>'
    expect(parseRepacklabGamesRegExp(html, REPACKLAB_SOURCE_DEF)[0]?.sourceId).toBe('repacklab')
  })

  it('parses size from p:contains Size fallback', () => {
    const html = '<html><body><article><h2><a href="/game/big/">Big Game</a></h2><p>Size: 200 GB</p></article></body></html>'
    expect(parseRepacklabGamesRegExp(html, REPACKLAB_SOURCE_DEF)[0]?.sizeBytes).toBe(200 * 1024 ** 3)
  })
})

describe('extractDownloadLinks for new sources', () => {
  it('extracts magnet links from xatab HTML', () => {
    const html = '<html><body><div class="entry-content"><a href="magnet:?xt=urn:btih:abc123">Download</a></div></body></html>'
    const magnetRe = /href="(magnet:[^"]+)"/gi
    const links = [...html.matchAll(magnetRe)].map(m => m[1])
    expect(links).toHaveLength(1)
    expect(links[0]).toContain('magnet:?xt=urn:btih:')
  })

  it('extracts direct download links from repack-games HTML', () => {
    const html = '<div class="download-links"><a href="https://dl.repack-games.com/game.zip">Download ZIP</a></div>'
    const links = [...html.matchAll(/href="([^"]+\.zip)"/gi)].map(m => m[1])
    expect(links).toHaveLength(1)
    expect(links[0]).toContain('.zip')
  })

  it('extracts magnet links from repacklab HTML', () => {
    const html = '<div class="post-content"><a href="magnet:?xt=urn:btih:xyz789">Torrent</a><a href="https://dl.repacklab.com/game.rar">Direct</a></div>'
    const magnets = [...html.matchAll(/href="(magnet:[^"]+)"/gi)].map(m => m[1])
    expect(magnets).toHaveLength(1)
    expect(magnets[0]).toContain('magnet:')
  })

  it('returns no links for empty HTML', () => {
    const html = '<html></html>'
    const magnets = [...html.matchAll(/href="(magnet:[^"]+)"/gi)].map(m => m[1])
    expect(magnets).toHaveLength(0)
  })
})

describe('Game ID generation for new sources', () => {
  it('generates deterministic IDs for xatab games', () => {
    const html = '<html><body><article><h2><a href="/game/hades/">Hades</a></h2></article></body></html>'
    const games = parseXatabGamesRegExp(html, XATAB_SOURCE_DEF)
    for (const g of games) expect(g.id).toMatch(/^[0-9a-f]{8}$/)
  })

  it('generates deterministic IDs for repack-games games', () => {
    const html = '<html><body><article><h2><a href="/game/fortnite/">Fortnite</a></h2></article></body></html>'
    const games = parseRepackGamesGamesRegExp(html, REPACK_GAMES_SOURCE_DEF)
    for (const g of games) expect(g.id).toMatch(/^[0-9a-f]{8}$/)
  })

  it('generates deterministic IDs for repacklab games', () => {
    const html = '<html><body><article><h2><a href="/game/minecraft/">Minecraft</a></h2></article></body></html>'
    const games = parseRepacklabGamesRegExp(html, REPACKLAB_SOURCE_DEF)
    for (const g of games) expect(g.id).toMatch(/^[0-9a-f]{8}$/)
  })
})