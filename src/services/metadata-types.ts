export interface IMetadataService {
  enrich(gameId: string, name: string, sourceGameId?: string): Promise<import('../domain/metadata/types').EnrichedMetadata | null>
  getCached(gameId: string): Promise<import('../domain/metadata/types').EnrichedMetadata | null>
}
