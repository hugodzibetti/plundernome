import { createGameID } from '../../domain/identity';
import { parseSize } from '../../domain/catalog/parsers/shared';
import type { Game } from '../../domain/models';
import type { SourceDefinition } from '../../domain/catalog/types';

export function extractGameId(url: string): string {
  const match = url.match(/\/([^/]+)\/?$/);
  return match?.[1] ?? url;
}

export { createGameID, parseSize };

export const FITGIRL_SOURCE_DEF: SourceDefinition = {
  id: 'fitgirl',
  name: 'FitGirl Repacks',
  baseUrl: 'https://fitgirl-repacks.site',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

export const DODI_SOURCE_DEF: SourceDefinition = {
  id: 'dodi',
  name: 'DODI Repacks',
  baseUrl: 'https://dodi-repacks.site',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

export const STEAMRIP_SOURCE_DEF: SourceDefinition = {
  id: 'steamrip',
  name: 'SteamRIP',
  baseUrl: 'https://steamrip.com',
  scrapeType: 'html',
  updateIntervalMinutes: 720,
  enabled: true,
};

export const ONLINEFIX_SOURCE_DEF: SourceDefinition = {
  id: 'onlinefix',
  name: 'Online-Fix',
  baseUrl: 'https://online-fix.me',
  scrapeType: 'html',
  updateIntervalMinutes: 720,
  enabled: true,
};

export const GOGGAMES_SOURCE_DEF: SourceDefinition = {
  id: 'goggames',
  name: 'GOG-Games',
  baseUrl: 'https://gog-games.to',
  scrapeType: 'html',
  updateIntervalMinutes: 720,
  enabled: true,
};

export function buildMockGame(
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
