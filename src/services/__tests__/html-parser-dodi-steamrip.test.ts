import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Game } from '../../domain/models'
import type { SourceDefinition } from '../../domain/catalog/types'
import { createGameID, parseSize, extractGameId, DODI_SOURCE_DEF, STEAMRIP_SOURCE_DEF, buildMockGame } from './html-parser-test-util'

function parseDodiArticle(article: string, source: SourceDefinition): Game | null {
  const titleMatch = article.match(/<h[12][^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h[12]>/i)
  if (!titleMatch) return null
  const url = titleMatch[1] ?? ''
  const name = titleMatch[2]?.trim() ?? ''
  if (!name || !url) return null
  const sizeMatch = article.match(/Size[:\s]*([^<]*)(?:<|$)/i)
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

function parseDodiGamesRegExp(rawHtml: string, source: SourceDefinition): Game[] {
  const articleRegex = /<article[^>]*>.*?<\/article>/gis
  return (rawHtml.match(articleRegex) ?? []).map(a => parseDodiArticle(a, source)).filter((g): g is Game => g !== null)
}

function parseSteamripArticle(article: string, source: SourceDefinition): Game | null {
  const titleMatch = article.match(/<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h2>/i)
  if (!titleMatch) return null
  const url = titleMatch[1] ?? ''
  const name = titleMatch[2]?.trim() ?? ''
  if (!name || !url) return null
  const sizeMatch = article.match(/<span[^>]*class="[^"]*post-size[^"]*"[^>]*>([^<]*)<\/span>/i)
  const sizeStr = sizeMatch?.[1]?.trim() ?? ''
  const sizeBytes = parseSize(sizeStr)
  const descMatch = article.match(/<p[^>]*>([^<]*)<\/p>/i)
  const description = descMatch?.[1]?.trim() ?? ''
  const imageMatch = article.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
  const imageUrl = imageMatch?.[1]
  const dateMatch = article.match(/<time[^>]*class="[^"]*entry-date[^"]*"[^>]*datetime="([^"]*)"/i)
  const lastUpdated = dateMatch?.[1] ?? new Date().toISOString()
  const tagMatches = article.matchAll(/<a[^>]*rel="tag"[^>]*>([^<]*)<\/a>/gi)
  const tags = Array.from(tagMatches).map(m => m[1]?.trim()).filter((t): t is string => !!t)
  return buildMockGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}

function parseSteamripGamesRegExp(rawHtml: string, source: SourceDefinition): Game[] {
  const articleRegex = /<article[^>]*>.*?<\/article>/gis
  return (rawHtml.match(articleRegex) ?? []).map(a => parseSteamripArticle(a, source)).filter((g): g is Game => g !== null)
}

const dodiParser = { parseDodiGames: parseDodiGamesRegExp }
const steamripParser = { parseSteamripGames: parseSteamripGamesRegExp }

describe('parseDodiGames regex fallback', () => {
  let html: string

  beforeAll(() => {
    html = readFileSync(resolve(__dirname, '../../../tests/fixtures/source-pages/dodi-sample.html'), 'utf-8')
  })

  it('parses 3 games from sample HTML', () => {
    expect(dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)).toHaveLength(3)
  })

  it('extracts game names correctly', () => {
    const games = dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)
    expect(games[0]?.name).toBe('Cyberpunk 2077')
    expect(games[1]?.name).toBe('Red Dead Redemption 2')
    expect(games[2]?.name).toBe('Stardew Valley')
  })

  it('extracts URLs', () => {
    const games = dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)
    expect(games[0]?.url).toContain('cyberpunk-2077')
    expect(games[1]?.url).toContain('red-dead-redemption-2')
  })

  it('parses sizes correctly', () => {
    const games = dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)
    expect(games[0]?.sizeBytes).toBeGreaterThan(50 * 1024 ** 3)
    expect(games[0]?.size).toBe('62.4 GB')
    expect(games[2]?.sizeBytes).toBeLessThan(2 * 1024 ** 3)
  })

  it('assigns correct source ID', () => {
    for (const game of dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)) expect(game.sourceId).toBe('dodi')
  })

  it('parses tags', () => {
    const games = dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)
    expect(games[0]?.tags).toContain('action')
    expect(games[0]?.tags).toContain('open-world')
    expect(games[1]?.tags).toContain('adventure')
  })

  it('parses dates', () => {
    expect(dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)[0]?.lastUpdated).toBe('2025-03-10T14:00:00Z')
  })

  it('handles containers without image or tags', () => {
    const games = dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)
    expect(games[2]?.imageUrl).toBeUndefined()
    expect(games[2]?.tags).toEqual([])
  })

  it('generates deterministic game IDs', () => {
    for (const game of dodiParser.parseDodiGames(html, DODI_SOURCE_DEF)) expect(game.id).toMatch(/^[0-9a-f]{8}$/)
  })

  it('returns empty array for empty HTML string', () => {
    expect(dodiParser.parseDodiGames('', DODI_SOURCE_DEF)).toEqual([])
  })

  it('handles HTML with no article tags', () => {
    expect(dodiParser.parseDodiGames('<html><body><p>no games</p></body></html>', DODI_SOURCE_DEF)).toEqual([])
  })

  it('handles containers without title links', () => {
    expect(dodiParser.parseDodiGames('<html><body><article><h2>No Link</h2></article></body></html>', DODI_SOURCE_DEF)).toEqual([])
  })
})

describe('parseSteamripGames regex fallback', () => {
  let html: string

  beforeAll(() => {
    html = readFileSync(resolve(__dirname, '../../../tests/fixtures/source-pages/steamrip-sample.html'), 'utf-8')
  })

  it('parses 3 games from sample HTML', () => {
    expect(steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)).toHaveLength(3)
  })

  it('extracts game names correctly', () => {
    const games = steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)
    expect(games[0]?.name).toBe('Hogwarts Legacy')
    expect(games[1]?.name).toBe('God of War')
    expect(games[2]?.name).toBe('Undertale')
  })

  it('extracts URLs', () => {
    expect(steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)[0]?.url).toContain('hogwarts-legacy')
  })

  it('parses sizes from post-size span', () => {
    const games = steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)
    expect(games[0]?.size).toBe('74.3 GB')
    expect(games[0]?.sizeBytes).toBeGreaterThan(70 * 1024 ** 3)
    expect(games[2]?.size).toBe('200 MB')
    expect(games[2]?.sizeBytes).toBe(200 * 1024 ** 2)
  })

  it('assigns correct source ID', () => {
    for (const game of steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)) expect(game.sourceId).toBe('steamrip')
  })

  it('parses tags', () => {
    const games = steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)
    expect(games[0]?.tags).toContain('RPG')
    expect(games[0]?.tags).toContain('Open World')
  })

  it('parses dates from entry-date time tag', () => {
    expect(steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)[0]?.lastUpdated).toBe('2025-04-01T12:00:00Z')
  })

  it('handles games without image', () => {
    expect(steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)[2]?.imageUrl).toBeUndefined()
  })

  it('generates valid game IDs', () => {
    for (const game of steamripParser.parseSteamripGames(html, STEAMRIP_SOURCE_DEF)) expect(game.id).toMatch(/^[0-9a-f]{8}$/)
  })

  it('returns empty array for empty HTML', () => {
    expect(steamripParser.parseSteamripGames('', STEAMRIP_SOURCE_DEF)).toEqual([])
  })

  it('handles malformed HTML gracefully', () => {
    expect(steamripParser.parseSteamripGames('<article><h2 class="entry-title"><a href="/g/">Game</a></h2>', STEAMRIP_SOURCE_DEF)).toHaveLength(0)
  })
})
