import type { Game } from '../domain/models';
import type { SourceDefinition } from '../domain/catalog/types';
import type { IHTMLParserService } from './html-parser-types';
import type { ParserConfig } from './html-parser-config';
import {
  getElementsByTag,
  childrenByTag,
  hasClass,
  getAttr,
  getText,
  findLinkTitle,
  parseHtml,
  getDocumentElement,
  buildGame,
  parseSize,
} from './html-parser-helpers';
import { PARSER_CONFIGS } from './html-parser-config';
import {
  extractElAmigosDownloadLinks,
  extractGloadDownloadLinks,
  extractOvaGamesDownloadLinks,
} from './html-parser-download-links';

function extractSizeFromContainer(container: any, pattern: string): { sizeStr: string; sizeBytes: number } {
  let sizeStr = '';
  let sizeBytes = 0;
  for (const tag of ['p', 'span', 'div', 'li']) {
    const els = getElementsByTag(container, tag);
    for (const el of els) {
      const txt = getText(el);
      const re = new RegExp(pattern, 'i');
      if (re.test(txt)) {
        const val = txt.replace(re, '').trim();
        sizeStr = val;
        sizeBytes = parseSize(val);
        break;
      }
    }
    if (sizeStr) break;
  }
  return { sizeStr, sizeBytes };
}

function extractSimpleSize(container: any, selector: string): { sizeStr: string; sizeBytes: number } {
  let sizeStr = '';
  let sizeBytes = 0;
  const selParts = selector.replace(/^\./, '').split(' ');
  const tag = selParts[0] || '*';
  const cls = selParts.length > 1 ? selParts[selParts.length - 1] : '';
  const els = getElementsByTag(container, tag);
  for (const el of els) {
    if (!cls || hasClass(el, cls)) {
      sizeStr = getText(el);
      sizeBytes = parseSize(sizeStr);
      if (sizeBytes > 0) break;
    }
  }
  return { sizeStr, sizeBytes };
}

function extractTagsFromContainer(container: any, config: ParserConfig): string[] {
  const tags: string[] = [];
  const tagCfg = config.fields.tags;
  if (!tagCfg.selector) return tags;

  const selParts = tagCfg.selector.split('[');
  const baseSel = selParts[0]!;
  const attrFilter = selParts[1]?.replace(']', '') ?? '';

  const els = getElementsByTag(container, baseSel);
  for (const el of els) {
    let match = false;
    if (attrFilter) {
      const [attr, val] = attrFilter.split('=');
      const av = getAttr(el, attr!);
      if (val) {
        match = av === val.replace(/['"]/g, '');
      } else {
        match = av != null;
      }
    } else {
      match = true;
    }
    if (match) {
      const t = getText(el);
      if (t && !tags.includes(t)) tags.push(t);
    }
  }

  if (config.tagsFromSpanClass) {
    const spans = getElementsByTag(container, 'span');
    for (const span of spans) {
      if (hasClass(span, config.tagsFromSpanClass)) {
        const links = getElementsByTag(span, 'a');
        for (const a of links) {
          const t = getText(a);
          if (t && !tags.includes(t)) tags.push(t);
        }
      }
    }
  }

  return tags;
}

function parseContainer(container: any, config: ParserConfig, source: SourceDefinition): Game | null {
  const titleInfo = findLinkTitle(container);
  if (!titleInfo) return null;
  const { name, url } = titleInfo;

  let sizeStr = '';
  let sizeBytes = 0;
  const sizeCfg = config.fields.size;
  if (sizeCfg.extract === 'text-after-label') {
    if (config.sizeContainerFallback) {
      const r = extractSizeFromContainer(container, sizeCfg.labelPattern ?? '^size');
      sizeStr = r.sizeStr;
      sizeBytes = r.sizeBytes;
    } else {
      const els = getElementsByTag(container, sizeCfg.selector || 'p');
      for (const el of els) {
        const txt = getText(el);
        const re = new RegExp(sizeCfg.labelPattern ?? '^size', 'i');
        if (re.test(txt)) {
          const val = txt.replace(re, '').trim();
          sizeStr = val;
          sizeBytes = parseSize(val);
          break;
        }
      }
    }
  } else if (sizeCfg.selector) {
    const r = extractSimpleSize(container, sizeCfg.selector);
    sizeStr = r.sizeStr;
    sizeBytes = r.sizeBytes;
  }

  let description = '';
  const descCfg = config.fields.description;
  if (descCfg.selector) {
    const selParts = descCfg.selector.split(' ');
    if (selParts.length === 1) {
      const tag = selParts[0]!;
      const ps = getElementsByTag(container, tag);
      for (const p of ps) {
        const txt = getText(p);
        if (txt.length > 0) {
          const links = getElementsByTag(p, 'a');
          if (links.length === 0) {
            const sizeRe = /size|размер/i;
            if (!sizeRe.test(txt)) {
              description = txt;
              break;
            }
          }
        }
      }
    } else {
      const tag = selParts[0]!;
      const cls = selParts[1]?.replace(/^\./, '') ?? '';
      const el = container;
      const children = getElementsByTag(el, tag) || childrenByTag(el, tag);
      for (const child of children) {
        if (!cls || hasClass(child, cls)) {
          const grandChildren = getElementsByTag(child, selParts[2] || '*');
          for (const gc of grandChildren) {
            const txt = getText(gc);
            if (txt.length > 0) {
              description = txt;
              break;
            }
          }
          if (description) break;
        }
      }
    }
  }

  let imageUrl: string | undefined;
  const imgCfg = config.fields.image;
  if (imgCfg.selector) {
    const selParts = imgCfg.selector.split('.');
    const tag = selParts[0] || 'img';
    const cls = selParts[1] || '';
    const imgs = getElementsByTag(container, tag);
    for (const img of imgs) {
      const src = getAttr(img, 'src');
      if (
        src &&
        !src.includes('banner') &&
        !src.includes('logo') &&
        !src.includes('button') &&
        !src.includes('readmore')
      ) {
        if (!cls || hasClass(img, cls)) {
          imageUrl = src;
          break;
        }
      }
    }
  }

  let lastUpdated = new Date().toISOString();
  const dateCfg = config.fields.date;
  if (dateCfg.selector === 'time' && dateCfg.extract === 'attr') {
    const times = getElementsByTag(container, 'time');
    if (times.length > 0) {
      const dt = getAttr(times[0], 'datetime');
      if (dt) lastUpdated = dt;
    }
  } else if (dateCfg.selector) {
    const selParts = dateCfg.selector.replace(/^\./, '').split('.');
    const tag = selParts[0] || 'span';
    const cls = selParts[selParts.length - 1] || '';
    const els = getElementsByTag(container, tag);
    for (const el of els) {
      if (!cls || hasClass(el, cls)) {
        const txt = getText(el);
        if (txt) {
          try {
            lastUpdated = new Date(txt).toISOString();
          } catch {
            lastUpdated = txt;
          }
          break;
        }
      }
    }
  }
  if (!lastUpdated || lastUpdated === new Date().toISOString()) {
    const times = getElementsByTag(container, 'time');
    if (times.length > 0) {
      const dt = getAttr(times[0], 'datetime');
      if (dt) lastUpdated = dt;
    }
  }

  const tags = extractTagsFromContainer(container, config);

  return buildGame(name, url, sizeStr, sizeBytes, description, lastUpdated, imageUrl, tags, source);
}

export class HtmlParserService implements IHTMLParserService {
  parseGames(sourceId: string, html: string, source: SourceDefinition): Game[] {
    const config = PARSER_CONFIGS[sourceId];
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
