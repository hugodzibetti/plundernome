import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Game } from '../../domain/models'
import type { SourceDefinition } from '../../domain/catalog/types'
import { createGameID, parseSize, extractGameId, ONLINEFIX_SOURCE_DEF, GOGGAMES_SOURCE_DEF, buildMockGame } from './html-parser-test-util'

function parseOnlinefixArticle(container: string, source: SourceDefinition): Game | null {
  const titleMatch = container.match(/<h[12][^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h[12]>/i)
  if (!titleMatch) return null
  const url = titleMatch[1] ?? ''
  const name = titleMatch[2]?.trim() ?? ''
  if (!name || !url) return null
  const sizeMatch = container.match(/Size[:\s]*([^<]*)(?:<|$)/i)
  const sizeStr = sizeMatch?.[1]?.trim() ?? ''
  const sizeBytes = parseSize(sizeStr)
  const descMatch = container.match(/<p[^>]*>([^<]*)<\/p>/i)
  const description = descMatch?.[1]?.trim() ?? ''
  const imageMatch = container.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
  const imageUrl = imageMatch?.[1]
  const dateMatch = container.match(/<time[^>]*datetime="([^"]*)"/i)
  const postDateMatch = !dateMatch ? container.match(/<span[^>]*class="[^"]*post-date[^"]*"[^>]*>([^<]*)<\/span>/i) : null
  const lastUpdated = dateMatch?.[1] ?? (postDateMatch ? new Date(postDateMatch[1]?.trim() ?? '').toISOString() : new Date().toISOString())
  const tagMatchesA = container.matchAll(/<a[^>]*rel="tag"[^>]*>([^<]*)<\/a>/gi)
  const tagMatchesSpan = container.matchAll(/<span[^>]*class="[^"]*tag[^"]*"[^>]*>\s*<a[^>]*>([^<]*)<\/a>\s*<\/span>/gi)
  const tags = [...Array.from(tagMatchesA), ...Array.from(tagMatchesSpan)].map(m => m[1]?.trim()).filter((t): t is string => !!t)
  return buildMockGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}

function parseOnlinefixGamesRegExp(rawHtml: string, source: SourceDefinition): Game[] {
  const articleRegex = /<article[^>]*>.*?<\/article>/gis
  const divPostRegex = /<div[^>]*class="[^"]*post[^"]*"[^>]*>.*?<\/div>/gis
  const containers = [...(rawHtml.match(articleRegex) ?? []), ...(rawHtml.match(divPostRegex) ?? [])]
  return containers.map(c => parseOnlinefixArticle(c, source)).filter((g): g is Game => g !== null)
}

function parseGoggamesArticle(container: string, source: SourceDefinition): Game | null {
  const titleMatch = container.match(/<(?:h2[^>]*|div[^>]*class="[^"]*game-title[^"]*"[^>]*)>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/(?:h2|div)>/i)
  if (!titleMatch) return null
  const url = titleMatch[1] ?? ''
  const name = titleMatch[2]?.trim() ?? ''
  if (!name || !url) return null
  const sizeMatch = container.match(/<(?:span|td)[^>]*class="[^"]*size[^"]*"[^>]*>([^<]*)<\/(?:span|td)>/i)
  const sizeStr = sizeMatch?.[1]?.trim() ?? ''
  const sizeBytes = parseSize(sizeStr)
  const descMatch = container.match(/<p[^>]*>([^<]*)<\/p>/i)
  const description = descMatch?.[1]?.trim() ?? ''
  const imageMatch = container.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
  const imageUrl = imageMatch?.[1]
  const dateMatch = container.match(/<(?:span|td)[^>]*class="[^"]*date[^"]*"[^>]*>([^<]*)<\/(?:span|td)>/i)
  const lastUpdated = dateMatch?.[1]?.trim() ?? new Date().toISOString()
  const tagMatches = container.matchAll(/<a[^>]*class="[^"]*genre[^"]*"[^>]*>([^<]*)<\/a>/gi)
  const tags = Array.from(tagMatches).map(m => m[1]?.trim()).filter((t): t is string => !!t)
  return buildMockGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source)
}

function parseGoggamesGamesRegExp(rawHtml: string, source: SourceDefinition): Game[] {
  const gameItemRegex = /<div[^>]*class="[^"]*game-item[^"]*"[^>]*>.*?<\/div>/gis
  const gameRowRegex = /<tr[^>]*class="[^"]*game-row[^"]*"[^>]*>.*?<\/tr>/gis
  const containers = [...(rawHtml.match(gameItemRegex) ?? []), ...(rawHtml.match(gameRowRegex) ?? [])]
  return containers.map(c => parseGoggamesArticle(c, source)).filter((g): g is Game => g !== null)
}

const onlineParser = { parseOnlinefixGames: parseOnlinefixGamesRegExp }
const gogParser = { parseGoggamesGames: parseGoggamesGamesRegExp }

describe('parseOnlinefixGames regex fallback', () => {
  let html: string

  beforeAll(() => {
    html = readFileSync(resolve(__dirname, '../../../tests/fixtures/source-pages/onlinefix-sample.html'), 'utf-8')
  })

  it('parses 3 games from sample HTML', () => {
    expect(onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)).toHaveLength(3)
  })

  it('extracts game names correctly', () => {
    const games = onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)
    expect(games[0]?.name).toBe('Payday 2')
    expect(games[1]?.name).toBe('PlateUp!')
    expect(games[2]?.name).toBe('Risk of Rain 2')
  })

  it('extracts URLs', () => {
    const games = onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)
    expect(games[0]?.url).toContain('payday-2')
    expect(games[2]?.url).toContain('risk-of-rain-2')
  })

  it('parses sizes', () => {
    const games = onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)
    expect(games[0]?.size).toBe('31.5 GB')
    expect(games[1]?.size).toBe('1.5 GB')
    expect(games[2]?.size).toBe('2.8 GB')
  })

  it('assigns correct source ID', () => {
    for (const game of onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)) expect(game.sourceId).toBe('onlinefix')
  })

  it('parses tags from a[rel=tag] and span.tag a', () => {
    const games = onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)
    expect(games[0]?.tags).toContain('action')
    expect(games[0]?.tags).toContain('co-op')
    expect(games[0]?.tags).toContain('shooter')
    expect(games[2]?.tags).toContain('roguelike')
    expect(games[2]?.tags).toContain('action')
  })

  it('parses dates from time[datetime] and span.post-date', () => {
    expect(onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)[0]?.lastUpdated).toBe('2025-05-12T16:00:00Z')
  })

  it('handles games without tags', () => {
    expect(onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)[1]?.tags).toEqual([])
  })

  it('generates valid game IDs', () => {
    for (const game of onlineParser.parseOnlinefixGames(html, ONLINEFIX_SOURCE_DEF)) expect(game.id).toMatch(/^[0-9a-f]{8}$/)
  })

  it('returns empty array for empty HTML', () => {
    expect(onlineParser.parseOnlinefixGames('', ONLINEFIX_SOURCE_DEF)).toEqual([])
  })

  it('handles containers without title links', () => {
    expect(onlineParser.parseOnlinefixGames('<html><body><article><h2>No Link</h2></article></body></html>', ONLINEFIX_SOURCE_DEF)).toEqual([])
  })
})

describe('parseGoggamesGames regex fallback', () => {
  let html: string

  beforeAll(() => {
    html = readFileSync(resolve(__dirname, '../../../tests/fixtures/source-pages/goggames-sample.html'), 'utf-8')
  })

  it('parses 3 games from sample HTML', () => {
    expect(gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)).toHaveLength(3)
  })

  it('extracts game names correctly', () => {
    const games = gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)
    expect(games[0]?.name).toBe('The Witcher 3: Wild Hunt')
    expect(games[1]?.name).toBe('Hollow Knight')
    expect(games[2]?.name).toBe('Disco Elysium')
  })

  it('extracts URLs', () => {
    const games = gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)
    expect(games[0]?.url).toContain('the-witcher-3')
    expect(games[1]?.url).toContain('hollow-knight')
    expect(games[2]?.url).toContain('disco-elysium')
  })

  it('parses sizes from span.size and td.size', () => {
    const games = gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)
    expect(games[0]?.size).toBe('35.8 GB')
    expect(games[1]?.size).toBe('6.4 GB')
    expect(games[2]?.size).toBe('8.7 GB')
  })

  it('assigns correct source ID', () => {
    for (const game of gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)) expect(game.sourceId).toBe('goggames')
  })

  it('parses tags from a.genre links', () => {
    const games = gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)
    expect(games[0]?.tags).toContain('RPG')
    expect(games[0]?.tags).toContain('Action')
    expect(games[2]?.tags).toContain('RPG')
  })

  it('parses dates from span.date and td.date', () => {
    const games = gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)
    expect(games[0]?.lastUpdated).toBe('2025-06-01')
    expect(games[1]?.lastUpdated).toBe('2025-02-14')
    expect(games[2]?.lastUpdated).toBe('2025-04-12')
  })

  it('generates valid game IDs', () => {
    for (const game of gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)) expect(game.id).toMatch(/^[0-9a-f]{8}$/)
  })

  it('returns empty array for empty HTML', () => {
    expect(gogParser.parseGoggamesGames('', GOGGAMES_SOURCE_DEF)).toEqual([])
  })

  it('handles containers without title links', () => {
    expect(gogParser.parseGoggamesGames('<html><body><div class="game-item"><h2>No Link</h2></div></body></html>', GOGGAMES_SOURCE_DEF)).toEqual([])
  })

  it('handles games without image or tags', () => {
    const games = gogParser.parseGoggamesGames(html, GOGGAMES_SOURCE_DEF)
    expect(games[1]?.imageUrl).toBeUndefined()
    expect(games[1]?.tags).toEqual([])
  })
})
