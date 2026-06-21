import type { SourceDefinition } from '../domain/catalog/types'

export const XATAB_SOURCE = {
  id: 'xatab',
  name: 'Xatab Repacks',
  baseUrl: 'https://byxatab.com',
  mirrors: [],
  scrapeType: 'html',
  selectors: {
    gameContainer: 'article, .post',
    title: 'h2 a, h3 a',
    link: 'h2 a, h3 a',
    size: 'p, .post-info',
    description: 'p',
    image: 'img',
    date: 'time, .post-date',
    tags: 'a[rel=tag], .category a',
  },
  downloadLinkSelector: "a[href*='magnet:']",
  downloadLinkType: 'magnet',
  downloadLinkContainer: '.entry-content, .post-content',
  downloadType: 'torrent',
  updateIntervalMinutes: 360,
  enabled: true,
} as const satisfies SourceDefinition