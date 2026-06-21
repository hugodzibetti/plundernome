import { describe, it, expect } from 'vitest'
import { parseSize, extractGameId, extractDownloadLinks } from '../catalog/parsers/shared'

describe('parseSize', () => {
  it('parses "1 GB"', () => {
    expect(parseSize('1 GB')).toBe(1024 ** 3)
  })

  it('parses "500 MB"', () => {
    expect(parseSize('500 MB')).toBe(500 * 1024 ** 2)
  })

  it('parses "2.5 TB"', () => {
    expect(parseSize('2.5 TB')).toBe(Math.round(2.5 * 1024 ** 4))
  })

  it('parses "0 B"', () => {
    expect(parseSize('0 B')).toBe(0)
  })

  it('parses "1 KB"', () => {
    expect(parseSize('1 KB')).toBe(1024)
  })

  it('parses without unit defaults to bytes', () => {
    expect(parseSize('42')).toBe(42)
  })

  it('parses with lowercase unit', () => {
    expect(parseSize('2 gb')).toBe(2 * 1024 ** 3)
  })

  it('parses with space between number and unit', () => {
    expect(parseSize('1GB')).toBe(1024 ** 3)
  })

  it('returns 0 for invalid string', () => {
    expect(parseSize('not-a-size')).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parseSize('')).toBe(0)
  })

  it('returns 0 for string with only letters', () => {
    expect(parseSize('abc')).toBe(0)
  })

  it('parses decimal without unit', () => {
    expect(parseSize('3.14')).toBe(3)
  })

  it('parses "1.5 MB"', () => {
    expect(parseSize('1.5 MB')).toBe(Math.round(1.5 * 1024 ** 2))
  })

  it('parses large number "999 GB"', () => {
    expect(parseSize('999 GB')).toBe(999 * 1024 ** 3)
  })
})

describe('extractGameId', () => {
  it('extracts from simple URL', () => {
    expect(extractGameId('https://example.com/hades')).toBe('hades')
  })

  it('extracts from URL with trailing slash', () => {
    expect(extractGameId('https://example.com/hades/')).toBe('hades')
  })

  it('extracts from URL with path segments', () => {
    expect(extractGameId('https://example.com/games/hades')).toBe('hades')
  })

  it('extracts from URL with trailing slash after path', () => {
    expect(extractGameId('https://example.com/games/hades/')).toBe('hades')
  })

  it('returns last path segment when no path beyond host', () => {
    expect(extractGameId('https://example.com')).toBe('example.com')
  })

  it('returns last path segment when only trailing slash', () => {
    expect(extractGameId('https://example.com/')).toBe('example.com')
  })

  it('extracts from URL with query params', () => {
    expect(extractGameId('https://example.com/game?id=123')).toBe('game?id=123')
  })

  it('extracts from URL with fragment', () => {
    expect(extractGameId('https://example.com/game#section')).toBe('game#section')
  })

  it('extracts from URL with dots in the id', () => {
    expect(extractGameId('https://example.com/game.name')).toBe('game.name')
  })

  it('returns empty string when URL is empty', () => {
    expect(extractGameId('')).toBe('')
  })

  it('extracts from URL with numbers', () => {
    expect(extractGameId('https://store.steampowered.com/app/1234560')).toBe('1234560')
  })
})

describe('extractDownloadLinks', () => {
  const html = `
    <a href="magnet:?xt=urn:btih:abc">Magnet 1</a>
    <a href="magnet:?xt=urn:btih:def">Magnet 2</a>
    <a href="https://example.com/game.torrent">Torrent</a>
    <a href="https://example.com/game2.torrent">Torrent 2</a>
    <a href="https://example.com/readme.txt">Text</a>
  `

  it('extracts magnet links', () => {
    const links = extractDownloadLinks(html, 'magnet')
    expect(links).toHaveLength(2)
    expect(links[0]).toBe('magnet:?xt=urn:btih:abc')
    expect(links[1]).toBe('magnet:?xt=urn:btih:def')
  })

  it('extracts .torrent links', () => {
    const links = extractDownloadLinks(html, 'torrent')
    expect(links).toHaveLength(2)
    expect(links[0]).toBe('https://example.com/game.torrent')
  })

  it('extracts both magnet and torrent links', () => {
    const links = extractDownloadLinks(html, 'magnet,torrent')
    expect(links).toHaveLength(4)
  })

  it('returns empty array when no matches', () => {
    const links = extractDownloadLinks('<p>No links here</p>', 'torrent')
    expect(links).toEqual([])
  })

  it('deduplicates identical links', () => {
    const htmlWithDup = `
      <a href="magnet:?xt=urn:btih:abc">Magnet</a>
      <a href="magnet:?xt=urn:btih:abc">Same Magnet</a>
    `
    const links = extractDownloadLinks(htmlWithDup, 'magnet')
    expect(links).toHaveLength(1)
  })

  it('returns empty array for empty HTML', () => {
    expect(extractDownloadLinks('', 'magnet')).toEqual([])
  })

  it('extracts torrent links with uppercase file extension (case-insensitive)', () => {
    const htmlUpper = '<a href="https://example.com/game.TORRENT">Torrent</a>'
    const links = extractDownloadLinks(htmlUpper, 'torrent')
    expect(links).toHaveLength(1)
  })

  it('handles selector without matching keyword', () => {
    const links = extractDownloadLinks(html, 'nosuch')
    expect(links).toEqual([])
  })

  it('extracts magnet links with complex URN', () => {
    const magnetHtml = '<a href="magnet:?xt=urn:btih:abc123&dn=game&tr=udp://tracker">Magnet</a>'
    const links = extractDownloadLinks(magnetHtml, 'magnet')
    expect(links).toHaveLength(1)
    expect(links[0]).toBe('magnet:?xt=urn:btih:abc123&dn=game&tr=udp://tracker')
  })
})