import type { Game } from '../domain/models';
import type { SourceDefinition } from '../domain/catalog/types';
import type { IHTMLParserService } from './html-parser-types';
import {
  getElementsByTag,
  getAttr,
  findLinkTitle,
  parseHtml,
  getDocumentElement,
} from './html-parser-helpers';
import { PARSER_CONFIGS } from './html-parser-config';
import { EXTRA_PARSER_CONFIGS } from './html-parser-config-extra';
import { parseContainer } from './html-parser-parsers';
import {
  extractElAmigosDownloadLinks,
  extractGloadDownloadLinks,
  extractOvaGamesDownloadLinks,
} from './html-parser-download-links';

const ALL_PARSER_CONFIGS = { ...EXTRA_PARSER_CONFIGS, ...PARSER_CONFIGS };

export class HtmlParserService implements IHTMLParserService {
  parseGames(sourceId: string, html: string, source: SourceDefinition): Game[] {
    const config = ALL_PARSER_CONFIGS[sourceId];
    if (!config) return [];

    const doc = parseHtml(html, source.baseUrl);
    if (!doc) return [];
    const root = getDocumentElement(doc);
    if (!root) return [];

    const games: Game[] = [];
    const seen = new Set<string>();

    for (const containerCfg of config.containers) {
      const selParts = containerCfg.selector.split('.');
      const tag = selParts[0] || '*';
      const cls = selParts.slice(1).join(' ') || '';
      const els = getElementsByTag(root, tag);
      for (const el of els) {
        if (cls) {
          const elCls = getAttr(el, 'class') ?? '';
          if (!cls.split(' ').every((c) => elCls.includes(c))) continue;
        } else if (containerCfg.extraSelectors) {
          const elCls = getAttr(el, 'class') ?? '';
          const matches = containerCfg.extraSelectors.some((ec) => elCls.includes(ec));
          if (!matches) continue;
        }
        const link = findLinkTitle(el);
        if (link && seen.has(link.url)) continue;
        const game = parseContainer(el, config, source);
        if (game) {
          seen.add(game.url);
          games.push(game);
        }
      }
    }

    return games;
  }
}
