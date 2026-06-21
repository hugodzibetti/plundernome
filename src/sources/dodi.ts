import type { SourceDefinition } from '../domain/catalog/types'

export const DODI_SOURCE = {
  id: 'dodi',
  name: 'DODI Repacks',
  baseUrl: 'https://dodi-repacks.site',
  mirrors: [],
  scrapeType: 'html',
  selectors: {
    gameContainer: 'article',
    title: 'h1 a, h2 a',
    link: 'h1 a, h2 a',
    size: "p:contains('Size')",
    description: 'p:not(:has(a))',
    image: 'img',
    date: 'time',
    tags: 'a[rel=tag]',
  },
  downloadLinkSelector: "a[href*='magnet:']",
  downloadLinkType: 'magnet',
  downloadLinkContainer: '.entry-content',
  downloadType: 'torrent',
  updateIntervalMinutes: 360,
  enabled: true,
} as const satisfies SourceDefinition
