import type { Game } from '../../domain/models';
import type { SourceDefinition } from '../../domain/catalog/types';
import type { ParserConfig } from './html-parser-config';
import {
  getElementsByTag,
  childrenByTag,
  hasClass,
  getAttr,
  getText,
  findLinkTitle,
  buildGame,
  parseSize,
} from './html-parser-helpers';
import { extractSizeFromContainer, extractSimpleSize, extractTagsFromContainer } from './html-parser-extractors';

export function parseContainer(container: any, config: ParserConfig, source: SourceDefinition): Game | null {
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