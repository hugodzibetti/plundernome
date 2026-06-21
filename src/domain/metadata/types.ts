export interface MetadataProvider {
  gameName: string
  sourceGameId?: string
}

export interface EnrichedMetadata {
  gameId: string
  name: string
  description?: string
  coverUrl?: string
  backgroundUrl?: string
  screenshots?: string[]
  genres?: string[]
  releaseDate?: string
  developer?: string
  publisher?: string
  igdbId?: number
  steamGridDbId?: number
}

export interface ICoverProvider {
  search(query: string): Promise<CoverResult[]>
  getCover(url: string): Promise<ArrayBuffer | null>
}

export interface CoverResult {
  url: string
  width: number
  height: number
  type: 'cover' | 'background' | 'logo' | 'icon'
}

export interface IMetadataService {
  enrich(gameId: string, name: string, sourceGameId?: string): Promise<EnrichedMetadata | null>
  getCached(gameId: string): Promise<EnrichedMetadata | null>
}
