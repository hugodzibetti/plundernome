import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import type { IHTMLParserService } from '../services/html-parser-types'

type ParserFn = (html: string, source: SourceDefinition) => Game[]

export function buildParsersMap(htmlParser: IHTMLParserService): Record<string, ParserFn> {
  return {
    fitgirl: (h, s) => htmlParser.parseFitGirlGames(h, s),
    dodi: (h, s) => htmlParser.parseDodiGames(h, s),
    steamrip: (h, s) => htmlParser.parseSteamripGames(h, s),
    onlinefix: (h, s) => htmlParser.parseOnlinefixGames(h, s),
    goggames: (h, s) => htmlParser.parseGoggamesGames(h, s),
    elamigos: (h, s) => htmlParser.parseElAmigosGames(h, s),
    gload: (h, s) => htmlParser.parseGloadGames(h, s),
    ovagames: (h, s) => htmlParser.parseOvaGamesGames(h, s),
    xatab: (h, s) => htmlParser.parseXatabGames(h, s),
    'repack-games': (h, s) => htmlParser.parseRepackGamesGames(h, s),
    repacklab: (h, s) => htmlParser.parseRepacklabGames(h, s),
  }
}
