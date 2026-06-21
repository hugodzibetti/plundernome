import type { GameID, SourceID } from './models';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function createGameID(sourceId: SourceID, sourceGameId: string): GameID {
  return simpleHash(`${sourceId}:${sourceGameId}`);
}

export function isValidGameID(id: string): id is GameID {
  return /^[0-9a-f]{8}$/.test(id);
}
