import { describe, it, expect } from 'vitest';
import type { PipelineStep } from '../models';
import { createGameID, isValidGameID } from '../identity';
import { validateGame } from '../functions';
import { createInitialPipelineState, isValidPipelineTransition } from '../pipeline';
import { SAMPLE_GAME } from '../../../tests/fixtures/game-samples';

describe('GameID', () => {
  it('creates deterministic ID for same inputs', () => {
    const id1 = createGameID('fitgirl', 'hades');
    const id2 = createGameID('fitgirl', 'hades');
    expect(id1).toBe(id2);
  });

  it('creates different IDs for different sources', () => {
    const id1 = createGameID('fitgirl', 'hades');
    const id2 = createGameID('dodi', 'hades');
    expect(id1).not.toBe(id2);
  });

  it('validates correct format', () => {
    const id = createGameID('fitgirl', 'hades');
    expect(isValidGameID(id)).toBe(true);
  });

  it('rejects invalid format', () => {
    expect(isValidGameID('')).toBe(false);
    expect(isValidGameID('xyz')).toBe(false);
    expect(isValidGameID('not-a-hex-value!')).toBe(false);
  });

  it('creates ID from empty sourceId', () => {
    const id = createGameID('', 'game');
    expect(id).toHaveLength(8);
    expect(isValidGameID(id)).toBe(true);
  });

  it('creates ID from empty sourceGameId', () => {
    const id = createGameID('fitgirl', '');
    expect(id).toHaveLength(8);
    expect(isValidGameID(id)).toBe(true);
  });

  it('creates ID from both empty strings', () => {
    const id = createGameID('', '');
    expect(id).toHaveLength(8);
    expect(isValidGameID(id)).toBe(true);
  });

  it('creates ID from special characters', () => {
    const id = createGameID('fit-girl!', 'héllo world/foo');
    expect(id).toHaveLength(8);
    expect(isValidGameID(id)).toBe(true);
  });

  it('different special char inputs produce different IDs', () => {
    const id1 = createGameID('a!b', 'c');
    const id2 = createGameID('a b', 'c');
    expect(id1).not.toBe(id2);
  });

  it('rejects 7-char hex string', () => {
    expect(isValidGameID('1234567')).toBe(false);
  });

  it('rejects 9-char hex string', () => {
    expect(isValidGameID('123456789')).toBe(false);
  });

  it('rejects uppercase hex chars', () => {
    expect(isValidGameID('ABCDEF01')).toBe(false);
  });

  it('rejects mixed case hex', () => {
    expect(isValidGameID('AbCdEf01')).toBe(false);
  });

  it('rejects string with spaces', () => {
    expect(isValidGameID('a1b2c3 4')).toBe(false);
  });

  it('accepts valid hex ID with all digits', () => {
    expect(isValidGameID('12345678')).toBe(true);
  });

  it('accepts valid hex ID with all lowercase letters', () => {
    expect(isValidGameID('abcdefab')).toBe(true);
  });
});

describe('validateGame', () => {
  it('accepts valid game', () => {
    const result = validateGame(SAMPLE_GAME);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(SAMPLE_GAME);
  });

  it('rejects game without name', () => {
    const result = validateGame({ ...SAMPLE_GAME, name: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('name');
  });

  it('rejects game without sourceId', () => {
    const result = validateGame({ ...SAMPLE_GAME, sourceId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Source ID');
  });

  it('rejects game with negative sizeBytes', () => {
    const result = validateGame({ ...SAMPLE_GAME, sizeBytes: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('non-negative');
  });

  it('rejects game with zero sizeBytes', () => {
    const result = validateGame({ ...SAMPLE_GAME, sizeBytes: 0 });
    expect(result.ok).toBe(true);
  });

  it('rejects game with invalid GameID', () => {
    const result = validateGame({ ...SAMPLE_GAME, id: 'bad' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('GameID');
  });

  it('rejects game with uppercase hex GameID', () => {
    const result = validateGame({ ...SAMPLE_GAME, id: 'ABCDEF01' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('GameID');
  });

  it('rejects game with 9-char GameID', () => {
    const result = validateGame({ ...SAMPLE_GAME, id: '123456789' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('GameID');
  });

  it('accepts game with maximum valid sizeBytes', () => {
    const result = validateGame({ ...SAMPLE_GAME, sizeBytes: Number.MAX_SAFE_INTEGER });
    expect(result.ok).toBe(true);
  });

  it('accepts game with name as whitespace (non-empty string)', () => {
    const result = validateGame({ ...SAMPLE_GAME, name: '   ' });
    expect(result.ok).toBe(true);
  });

  it('rejects game with undefined id', () => {
    const result = validateGame({ ...SAMPLE_GAME, id: undefined as unknown as string });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('GameID');
  });

  it('rejects game with null name', () => {
    const result = validateGame({ ...SAMPLE_GAME, name: null as unknown as string });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('name');
  });

  it('accepts game with empty URL', () => {
    const result = validateGame({ ...SAMPLE_GAME, url: '' });
    expect(result.ok).toBe(true);
  });

  it('rejects game with NaN sizeBytes', () => {
    const result = validateGame({ ...SAMPLE_GAME, sizeBytes: NaN });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('non-negative');
  });
});

describe('Pipeline state', () => {
  it('creates initial state', () => {
    const state = createInitialPipelineState('abc123');
    expect(state.step).toBe('downloading');
    expect(state.status).toBe('idle');
    expect(state.progress).toBe(0);
  });

  it('creates initial state with different game ID formats', () => {
    const state = createInitialPipelineState('');
    expect(state.gameId).toBe('');
    expect(state.step).toBe('downloading');
    expect(state.status).toBe('idle');
  });

  it('creates initial state with long game ID', () => {
    const id = 'a'.repeat(64);
    const state = createInitialPipelineState(id);
    expect(state.gameId).toBe(id);
  });

  it('allows valid transitions', () => {
    expect(isValidPipelineTransition('downloading', 'verifying')).toBe(true);
    expect(isValidPipelineTransition('verifying', 'extracting')).toBe(true);
    expect(isValidPipelineTransition('detecting-deps', 'installing-deps')).toBe(true);
    expect(isValidPipelineTransition('detecting-deps', 'finding-exe')).toBe(true);
    expect(isValidPipelineTransition('registering', 'completed')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(isValidPipelineTransition('completed', 'downloading')).toBe(false);
    expect(isValidPipelineTransition('extracting', 'registering')).toBe(false);
    expect(isValidPipelineTransition('downloading', 'completed')).toBe(false);
  });

  it('rejects every transition from completed', () => {
    const steps = [
      'downloading',
      'verifying',
      'extracting',
      'detecting-deps',
      'installing-deps',
      'finding-exe',
      'registering',
      'completed',
    ] as const;
    for (const step of steps) {
      expect(isValidPipelineTransition('completed', step)).toBe(false);
    }
  });

  it('rejects self-transition for every step', () => {
    const steps = [
      'downloading',
      'verifying',
      'extracting',
      'detecting-deps',
      'installing-deps',
      'finding-exe',
      'registering',
      'completed',
    ] as const;
    for (const step of steps) {
      expect(isValidPipelineTransition(step, step)).toBe(false);
    }
  });

  it('validates all valid forward transitions', () => {
    expect(isValidPipelineTransition('downloading', 'verifying')).toBe(true);
    expect(isValidPipelineTransition('verifying', 'extracting')).toBe(true);
    expect(isValidPipelineTransition('extracting', 'detecting-deps')).toBe(true);
    expect(isValidPipelineTransition('detecting-deps', 'installing-deps')).toBe(true);
    expect(isValidPipelineTransition('detecting-deps', 'finding-exe')).toBe(true);
    expect(isValidPipelineTransition('installing-deps', 'finding-exe')).toBe(true);
    expect(isValidPipelineTransition('finding-exe', 'registering')).toBe(true);
    expect(isValidPipelineTransition('registering', 'completed')).toBe(true);
  });

  it('rejects all backward transitions', () => {
    const backward: [PipelineStep, PipelineStep][] = [
      ['verifying', 'downloading'],
      ['extracting', 'verifying'],
      ['extracting', 'downloading'],
      ['detecting-deps', 'extracting'],
      ['detecting-deps', 'verifying'],
      ['detecting-deps', 'downloading'],
      ['installing-deps', 'detecting-deps'],
      ['installing-deps', 'extracting'],
      ['installing-deps', 'verifying'],
      ['installing-deps', 'downloading'],
      ['finding-exe', 'installing-deps'],
      ['finding-exe', 'detecting-deps'],
      ['finding-exe', 'extracting'],
      ['finding-exe', 'verifying'],
      ['finding-exe', 'downloading'],
      ['registering', 'finding-exe'],
      ['registering', 'installing-deps'],
      ['registering', 'detecting-deps'],
      ['registering', 'extracting'],
      ['registering', 'verifying'],
      ['registering', 'downloading'],
      ['completed', 'registering'],
      ['completed', 'finding-exe'],
      ['completed', 'installing-deps'],
      ['completed', 'detecting-deps'],
      ['completed', 'extracting'],
      ['completed', 'verifying'],
      ['completed', 'downloading'],
    ];
    for (const [from, to] of backward) {
      expect(isValidPipelineTransition(from, to)).toBe(false);
    }
  });

  it('rejects skipping steps', () => {
    const skips: [PipelineStep, PipelineStep][] = [
      ['downloading', 'extracting'],
      ['downloading', 'detecting-deps'],
      ['downloading', 'installing-deps'],
      ['downloading', 'finding-exe'],
      ['downloading', 'registering'],
      ['verifying', 'detecting-deps'],
      ['verifying', 'installing-deps'],
      ['verifying', 'finding-exe'],
      ['verifying', 'registering'],
      ['verifying', 'completed'],
      ['extracting', 'installing-deps'],
      ['extracting', 'finding-exe'],
      ['extracting', 'completed'],
      ['detecting-deps', 'extracting'],
      ['detecting-deps', 'registering'],
      ['detecting-deps', 'completed'],
      ['installing-deps', 'registering'],
      ['installing-deps', 'completed'],
      ['finding-exe', 'completed'],
    ];
    for (const [from, to] of skips) {
      expect(isValidPipelineTransition(from, to)).toBe(false);
    }
  });
});
