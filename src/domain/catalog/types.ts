import type { SourceID, Game } from '../models'

export interface SourceDefinition {
  id: SourceID
  name: string
  baseUrl: string
  mirrors?: string[]
  scrapeType: 'rss' | 'html' | 'api'
  selectors?: ScrapeSelectors
  downloadLinkSelector?: string
  downloadLinkType?: 'magnet' | 'torrent' | 'direct' | 'page'
  downloadLinkContainer?: string
  downloadType?: 'torrent' | 'direct' | 'magnet'
  updateIntervalMinutes: number
  enabled: boolean
  schemaVersion?: number
}

export interface ScrapeSelectors {
  gameContainer: string
  title: string
  link: string
  size: string
  description: string
  image: string
  date: string
  tags: string
}

export interface ICatalogSource {
  readonly definition: SourceDefinition

  scrape(rawHtml: string, sourceId: SourceID): Game[]
  normalize(raw: unknown): Game
}

export interface CatalogConfig {
  sources: SourceDefinition[]
  cacheTtlMinutes: number
  maxConcurrentScrapes: number
}
