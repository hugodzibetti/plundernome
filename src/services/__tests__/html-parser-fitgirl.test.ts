import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Game } from '../../domain/models'
import type { SourceDefinition } from '../../domain/catalog/types'
import { createGameID, parseSize, extractGameId, FITGIRL_SOURCE_DEF, buildMockGame } from './html-parser-test-util'

function parseFitGirlArticle(article: string, source: SourceDefinition): Game | null {
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

function parseFitGirlGamesRegExp(rawHtml: string, source: SourceDefinition): Game[] {
  const articleRegex = /<article[^>]*>.*?<\/article>/gis
  const articles = rawHtml.match(articleRegex) ?? []
  return articles.map(a => parseFitGirlArticle(a, source)).filter((g): g is Game => g !== null)
}

const parser = { parseFitGirlGames: parseFitGirlGamesRegExp }

describe('parseFitGirlGames regex fallback', () => {
  let html: string

  beforeAll(() => {
    html = readFileSync(resolve(__dirname, '../../../tests/fixtures/source-pages/fitgirl-sample.html'), 'utf-8')
  })

  it('parses games from sample HTML', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games).toHaveLength(3)
  })

  it('extracts game names correctly', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games[0]?.name).toBe('Hades')
    expect(games[1]?.name).toBe("Baldur's Gate 3")
    expect(games[2]?.name).toBe('Celeste')
  })

  it('extracts URLs', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games[0]?.url).toContain('hades')
    expect(games[1]?.url).toContain('baldurs-gate-3')
  })

  it('parses sizes correctly', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games[0]?.sizeBytes).toBeGreaterThan(10 * 1024 ** 3)
    expect(games[0]?.size).toBe('14.2 GB')
    expect(games[2]?.sizeBytes).toBeLessThan(2 * 1024 ** 3)
  })

  it('assigns correct source ID', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    for (const game of games) expect(game.sourceId).toBe('fitgirl')
  })

  it('parses tags', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games[0]?.tags).toContain('action')
    expect(games[0]?.tags).toContain('rpg')
  })

  it('parses dates', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games[0]?.lastUpdated).toBe('2025-01-15T10:00:00Z')
  })

  it('handles articles without images', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games[2]?.imageUrl).toBeUndefined()
  })

  it('generates deterministic game IDs', () => {
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    for (const game of games) expect(game.id).toMatch(/^[0-9a-f]{8}$/)
  })

  it('returns empty array for empty HTML string', () => {
    expect(parser.parseFitGirlGames('', FITGIRL_SOURCE_DEF)).toEqual([])
  })

  it('returns empty array for HTML with no article tags', () => {
    expect(parser.parseFitGirlGames('<html><body><p>No games here</p></body></html>', FITGIRL_SOURCE_DEF)).toEqual([])
  })

  it('handles malformed HTML with unclosed article tags', () => {
    const malformed = '<html><body><article><h2><a href="/game1/">Game1</a></h2></article><article><h2><a href="/game2/">Game2</a></h2>'
    const games = parser.parseFitGirlGames(malformed, FITGIRL_SOURCE_DEF)
    expect(games).toHaveLength(1)
    expect(games[0]?.name).toBe('Game1')
  })

  it('handles HTML with article but no link inside', () => {
    expect(parser.parseFitGirlGames('<html><body><article><h2>No Link Here</h2></article></body></html>', FITGIRL_SOURCE_DEF)).toEqual([])
  })

  it('handles HTML with article and empty href', () => {
    expect(parser.parseFitGirlGames('<html><body><article><h2><a href="">Empty Link</a></h2></article></body></html>', FITGIRL_SOURCE_DEF)).toEqual([])
  })

  it('throws on null HTML string', () => {
    expect(() => parser.parseFitGirlGames(null as unknown as string, FITGIRL_SOURCE_DEF)).toThrow()
  })

  it('throws on undefined HTML string', () => {
    expect(() => parser.parseFitGirlGames(undefined as unknown as string, FITGIRL_SOURCE_DEF)).toThrow()
  })

  it('parses size with KB unit', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><p>Size: 500 KB</p></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.sizeBytes).toBe(500 * 1024)
  })

  it('parses size with MB unit', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><p>Size: 1.5 MB</p></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.sizeBytes).toBe(Math.round(1.5 * 1024 ** 2))
  })

  it('parses size with TB unit', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><p>Size: 1 TB</p></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.sizeBytes).toBe(1024 ** 4)
  })

  it('returns 0 bytes for unrecognized size format', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><p>Size: unknown</p></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.sizeBytes).toBe(0)
  })

  it('parses date from time tag', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><time datetime="2025-06-01T12:00:00Z"></time></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.lastUpdated).toBe('2025-06-01T12:00:00Z')
  })

  it('uses current date when no time tag present', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.lastUpdated).toBeDefined()
  })

  it('parses tags from rel="tag" links', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><a rel="tag" href="/tag/action/">Action</a><a rel="tag" href="/tag/rpg/">RPG</a></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.tags).toEqual(['Action', 'RPG'])
  })

  it('extracts image URL from img tag', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><img src="/images/game.jpg" alt="test"/></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.imageUrl).toBe('/images/game.jpg')
  })

  it('parses size with Bytes unit', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><p>Size: 500 B</p></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.sizeBytes).toBe(500)
  })

  it('handles HTML entities in game title', () => {
    const html = '<html><body><article><h2><a href="/game/">Game &amp; Title &lt;3</a></h2></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.name).toBe('Game &amp; Title &lt;3')
  })

  it('handles article with no size info', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2></article></body></html>'
    const g = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]
    expect(g?.sizeBytes).toBe(0)
    expect(g?.size).toBe('')
  })

  it('handles article with no description paragraph', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><div>No p tag</div></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.description).toBe('')
  })

  it('handles article with img but no src attribute', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><img alt="no src"/></article></body></html>'
    expect(parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]?.imageUrl).toBeUndefined()
  })

  it('handles article with size containing extra text (returns 0)', () => {
    const html = '<html><body><article><h2><a href="/game/">Test Game</a></h2><p>Size: 2.5 GB Repack</p></article></body></html>'
    const g = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)[0]
    expect(g?.sizeBytes).toBe(0)
    expect(g?.size).toBe('2.5 GB Repack')
  })

  it('handles multiple articles with mixed content', () => {
    const html = '<html><body><article><h2><a href="/game1/">Game One</a></h2><p>Size: 1 GB</p></article><article><h2><a href="/game2/">Game Two</a></h2><p>Size: 2 GB</p></article></body></html>'
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games).toHaveLength(2)
    expect(games[0]?.name).toBe('Game One')
    expect(games[1]?.name).toBe('Game Two')
  })

  it('handles article with multiple h2 tags (takes first)', () => {
    const html = '<html><body><article><h2><a href="/game/">First</a></h2><h2><a href="/other/">Second</a></h2></article></body></html>'
    const games = parser.parseFitGirlGames(html, FITGIRL_SOURCE_DEF)
    expect(games).toHaveLength(1)
    expect(games[0]?.name).toBe('First')
  })
})
