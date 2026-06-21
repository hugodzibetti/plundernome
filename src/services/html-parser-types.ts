import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'

export interface IHTMLParserService {
  parseFitGirlGames(html: string, source: SourceDefinition): Game[]
  parseDodiGames(html: string, source: SourceDefinition): Game[]
  parseSteamripGames(html: string, source: SourceDefinition): Game[]
  parseOnlinefixGames(html: string, source: SourceDefinition): Game[]
  parseGoggamesGames(html: string, source: SourceDefinition): Game[]
  parseXatabGames(html: string, source: SourceDefinition): Game[]
  parseRepackGamesGames(html: string, source: SourceDefinition): Game[]
  parseRepacklabGames(html: string, source: SourceDefinition): Game[]
  parseElAmigosGames(html: string, source: SourceDefinition): Game[]
  parseGloadGames(html: string, source: SourceDefinition): Game[]
  parseOvaGamesGames(html: string, source: SourceDefinition): Game[]
}
