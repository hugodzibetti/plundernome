import type { Game } from '../domain/models';
import type { SourceDefinition } from '../domain/catalog/types';

export interface IHTMLParserService {
  parseGames(sourceId: string, html: string, source: SourceDefinition): Game[];
}
