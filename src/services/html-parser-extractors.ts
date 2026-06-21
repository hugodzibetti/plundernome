import type { ParserConfig } from './html-parser-config';
import {
  getElementsByTag,
  hasClass,
  getAttr,
  getText,
  parseSize,
} from './html-parser-helpers';

export function extractSizeFromContainer(container: any, pattern: string): { sizeStr: string; sizeBytes: number } {
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

export function extractSimpleSize(container: any, selector: string): { sizeStr: string; sizeBytes: number } {
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

export function extractTagsFromContainer(container: any, config: ParserConfig): string[] {
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
