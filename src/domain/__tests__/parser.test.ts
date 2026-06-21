import { describe, it, expect } from 'vitest'
import { parseSize, extractGameId, extractDownloadLinks } from '../catalog/parsers/shared'

describe('parseSize', () => {
  it('parses bytes', () => {
    expect(parseSize('500 B')).toBe(500)
  })

  it('parses KB', () => {
    expect(parseSize('500 KB')).toBe(500 * 1024)
  })

  it('parses MB', () => {
    expect(parseSize('1.5 MB')).toBe(Math.round(1.5 * 1024 ** 2))
  })

  it('parses GB', () => {
    expect(parseSize('14.2 GB')).toBe(Math.round(14.2 * 1024 ** 3))
  })

  it('parses TB', () => {
    expect(parseSize('1 TB')).toBe(1024 ** 4)
  })

  it('returns 0 for unrecognized format', () => {
    expect(parseSize('unknown')).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parseSize('')).toBe(0)
  })
})

describe('extractGameId', () => {
  it('extracts last path segment from URL', () => {
    expect(extractGameId('https://fitgirl-repacks.site/hades/')).toBe('hades')
  })

  it('returns url when no match', () => {
    expect(extractGameId('no-slash')).toBe('no-slash')
  })
})

describe('extractDownloadLinks', () => {
  it('extracts magnet links', () => {
    const html = '<a href="magnet:?xt=urn:btih:abc123">download</a>'
    const links = extractDownloadLinks(html, 'magnet')
    expect(links).toEqual(['magnet:?xt=urn:btih:abc123'])
  })

  it('extracts torrent links', () => {
    const html = '<a href="/file.torrent">torrent</a>'
    const links = extractDownloadLinks(html, 'torrent')
    expect(links).toEqual(['/file.torrent'])
  })

  it('deduplicates links', () => {
    const html = '<a href="magnet:?xt=urn:btih:abc">a</a><a href="magnet:?xt=urn:btih:abc">b</a>'
    const links = extractDownloadLinks(html, 'magnet')
    expect(links).toHaveLength(1)
  })

  it('returns empty when no links', () => {
    const html = '<a href="/page">no download</a>'
    const links = extractDownloadLinks(html, 'torrent')
    expect(links).toEqual([])
  })
})
