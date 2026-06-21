import type { SourceDefinition } from '../domain/catalog/types'

export const OVAGAMES_SOURCE = {
  id: 'ovagames',
  name: 'Ova Games',
  baseUrl: 'https://www.ovagames.com',
  mirrors: [],
  scrapeType: 'html',
  selectors: {
    gameContainer: '.home-post-wrap',
    title: '.home-post-titles h2 a',
    link: '.home-post-titles h2 a',
    size: '',
    description: '',
    image: 'img.thumbnail',
    date: '',
    tags: '',
  },
  downloadLinkSelector: "a[href*='mega.nz'], a[href*='mediafire'], a[href*='drive.google'], a[href*='torrent'], a[href*='magnet:']",
  downloadLinkType: 'direct',
  downloadLinkContainer: '.entry-content',
  downloadType: 'direct',
  updateIntervalMinutes: 360,
  enabled: true,
} as const satisfies SourceDefinition