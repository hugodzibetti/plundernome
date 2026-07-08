import type { Game } from '../domain/models';
import type { SourceDefinition } from '../domain/catalog/types';
import type { IHTMLParserService } from '../services/parser/html-parser-types';

type ParserFn = (html: string, source: SourceDefinition) => Game[];

export function buildParsersMap(htmlParser: IHTMLParserService): Record<string, ParserFn> {
  const sourceIds = [
    'fitgirl',
    'dodi',
    'steamrip',
    'onlinefix',
    'goggames',
    'elamigos',
    'gload',
    'ovagames',
    'xatab',
    'repack-games',
    'repacklab',
    'kaoskrew',
    'mercs213',
    'torrminatorr',
    'gamecopyworld',
    'tinrepacks',
    'tapochek',
    'rgmechanics',
    'chovka',
    'blackbox',
    'scooter',
  ] as const;
  const map: Record<string, ParserFn> = {};
  for (const id of sourceIds) {
    map[id] = (h, s) => htmlParser.parseGames(id, h, s);
  }
  return map;
}
