import type { Game } from '../../domain/models';
import type { SourceDefinition } from '../../domain/catalog/types';
import { createGameID } from '../../domain/identity';
import { parseSize } from '../../domain/catalog/parsers/shared';
import { parseHtmlFallback } from './html-dom-fallback';

function getGXml(): any | null {
  try {
    const gi = typeof imports !== 'undefined' && imports && (imports as any).gi ? (imports as any).gi : null;
    if (!gi) return null;
    if (!gi.versions) return null;
    if ((gi as any).GXml) return (gi as any).GXml;
    return null;
  } catch {
    return null;
  }
}

export function extractGameId(url: string): string {
  const match = url.match(/\/([^/]+)\/?$/);
  return match?.[1] ?? url;
}

export function getTagName(el: any): string {
  return el.get_tag_name?.() ?? el.tagName?.toLowerCase() ?? '';
}

export function getAttr(el: any, name: string): string | null {
  return el.get_attribute?.(name) ?? el.getAttribute?.(name) ?? null;
}

export function getText(el: any): string {
  return el.get_text_content?.()?.trim() ?? el.textContent?.trim() ?? '';
}

export function getElementsByTag(root: any, tag: string): any[] {
  const list = root.get_elements_by_tag_name?.(tag) ?? root.getElementsByTagName?.(tag) ?? [];
  const result: any[] = [];
  for (let item = list; item != null; item = item.next) {
    if (item.data) result.push(item.data);
  }
  return result;
}

export function childrenByTag(el: any, tag: string): any[] {
  const result: any[] = [];
  const childEls = el.get_child_elements?.() ?? el.children ?? [];
  for (let item = childEls; item != null; item = item.next) {
    const child = item.data ?? item;
    if (getTagName(child) === tag) result.push(child);
  }
  return result;
}

export function hasClass(el: any, cls: string): boolean {
  const classAttr = getAttr(el, 'class');
  return classAttr?.split(/\s+/).includes(cls) ?? false;
}

export function findLinkTitle(container: any): { name: string; url: string } | null {
  for (const tag of ['h1', 'h2', 'h3']) {
    const headers = getElementsByTag(container, tag);
    for (const h of headers) {
      const links = getElementsByTag(h, 'a');
      for (const link of links) {
        const url = getAttr(link, 'href');
        const name = getText(link);
        if (name && url) return { name, url };
      }
    }
  }
  return null;
}

export function parseHtml(html: string, baseUrl: string): any | null {
  try {
    const GXml = getGXml();
    if (GXml) {
      const parser = GXml.html_document_new_from_string;
      if (parser) return parser(html, baseUrl);
    }
  } catch {
    /* fall through to fallback */
  }
  try {
    return parseHtmlFallback(html, baseUrl);
  } catch {
    return null;
  }
}

export function getDocumentElement(doc: any): any | null {
  try {
    return doc?.get_document_element?.() ?? doc?.documentElement ?? null;
  } catch {
    return null;
  }
}

export function buildGame(
  name: string,
  url: string,
  sizeStr: string,
  sizeBytes: number,
  description: string,
  lastUpdated: string,
  imageUrl: string | undefined,
  tags: string[],
  source: SourceDefinition,
): Game {
  const sourceGameId = extractGameId(url);
  const gameId = createGameID(source.id, sourceGameId);
  return {
    id: gameId,
    name,
    sourceId: source.id,
    sourceGameId,
    url,
    description,
    size: sizeStr,
    sizeBytes,
    lastUpdated,
    downloadType: 'torrent',
    imageUrl,
    tags,
  };
}

export { parseSize };
