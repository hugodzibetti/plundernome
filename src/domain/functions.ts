import type { Game, GameID, Result } from './models';

export function validateGame(game: Game): Result<Game> {
  if (!game.name) return { ok: false, error: 'Game name is required' };
  if (!game.sourceId) return { ok: false, error: 'Source ID is required' };
  if (!/^[0-9a-f]{8}$/.test(game.id)) return { ok: false, error: `Invalid GameID: ${game.id}` };
  if (game.sizeBytes < 0 || Number.isNaN(game.sizeBytes)) return { ok: false, error: 'sizeBytes must be non-negative' };
  return { ok: true, value: game };
}
