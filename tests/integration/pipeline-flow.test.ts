import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createGameID } from '../../src/domain/identity';
import { validateGame } from '../../src/domain/functions';
import { createInitialPipelineState, isValidPipelineTransition } from '../../src/domain/pipeline';
import { parseSize, extractDownloadLinks } from '../../src/domain/catalog/parsers/shared';
import { reducePipeline, getPipelineSteps } from '../../src/domain/pipeline';
import { deduplicateGames } from '../../src/domain/dedup';
import type { Game, PipelineState, PipelineStep } from '../../src/domain/models';
import type { SourceDefinition } from '../../src/domain/catalog/types';
import { detectCompat } from '../../src/domain/compat/detector';
import { WINDOWS_GAME_FILES, NO_DEPS_FILES, STEAM_STUB_FILES, LINUX_GAME_FILES } from '../fixtures/game-samples';

const FITGIRL_DEF: SourceDefinition = {
  id: 'fitgirl',
  name: 'FitGirl Repacks',
  baseUrl: 'https://fitgirl-repacks.site',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

function extractGameId(url: string): string {
  const match = url.match(/\/([^/]+)\/?$/);
  return match?.[1] ?? url;
}

function parseFitGirlPage(html: string, source: SourceDefinition): Game[] {
  const games: Game[] = [];
  const articleRe = /<article[^>]*>.*?<\/article>/gis;
  const articles = html.match(articleRe) ?? [];
  for (const article of articles) {
    const titleMatch = article.match(/<h[12][^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h[12]>/i);
    if (!titleMatch) continue;
    const url = titleMatch[1] ?? '';
    const name = titleMatch[2]?.trim() ?? '';
    if (!name || !url) continue;
    const sizeMatch = article.match(/Size[:\s]*([^<]*)(?:<|$)/i);
    const sizeStr = sizeMatch?.[1]?.trim() ?? '';
    const sizeBytes = parseSize(sizeStr);
    const descMatch = article.match(/<p[^>]*>([^<]*)<\/p>/i);
    const description = descMatch?.[1]?.trim() ?? '';
    const imageMatch = article.match(/<img[^>]*src="([^"]*)"[^>]*>/i);
    const imageUrl = imageMatch?.[1];
    const dateMatch = article.match(/<time[^>]*datetime="([^"]*)"/i);
    const lastUpdated = dateMatch?.[1] ?? new Date().toISOString();
    const tagMatches = article.matchAll(/<a[^>]*rel="tag"[^>]*>([^<]*)<\/a>/gi);
    const tags = Array.from(tagMatches)
      .map((m) => m[1]?.trim())
      .filter((t): t is string => !!t);
    const sourceGameId = extractGameId(url);
    const gameId = createGameID(source.id, sourceGameId);
    games.push({
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
    });
  }
  return games;
}

describe('pipeline: scrape → validate → pipeline init → compat', () => {
  let games: Game[];

  beforeAll(() => {
    const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/fitgirl-sample.html'), 'utf-8');
    games = parseFitGirlPage(html, FITGIRL_DEF);
  });

  it('scrape produces valid games', () => {
    expect(games.length).toBeGreaterThan(0);
  });

  it('every game passes validation', () => {
    for (const game of games) {
      const result = validateGame(game);
      expect(result.ok).toBe(true);
    }
  });

  it('game IDs are deterministic', () => {
    const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/fitgirl-sample.html'), 'utf-8');
    const pass2 = parseFitGirlPage(html, FITGIRL_DEF);
    for (let i = 0; i < games.length; i++) {
      expect(pass2[i]?.id).toBe(games[i]?.id);
    }
  });

  it('createInitialPipelineState works with game ID', () => {
    const state = createInitialPipelineState(games[0]!.id);
    expect(state.gameId).toBe(games[0]!.id);
    expect(state.step).toBe('downloading');
    expect(state.status).toBe('idle');
  });

  it('valid pipeline transitions', () => {
    expect(isValidPipelineTransition('downloading', 'verifying')).toBe(true);
    expect(isValidPipelineTransition('extracting', 'detecting-deps')).toBe(true);
    expect(isValidPipelineTransition('registering', 'completed')).toBe(true);
  });

  it('invalid pipeline transitions', () => {
    expect(isValidPipelineTransition('downloading', 'completed')).toBe(false);
    expect(isValidPipelineTransition('verifying', 'downloading')).toBe(false);
  });

  it('validateGame rejects missing name', () => {
    const bad = { ...games[0]!, name: '' };
    expect(validateGame(bad).ok).toBe(false);
  });

  it('validateGame rejects negative sizeBytes', () => {
    const bad = { ...games[0]!, sizeBytes: -1 };
    expect(validateGame(bad).ok).toBe(false);
  });
});

describe('createGameID', () => {
  it('produces 8-char hex hash', () => {
    const id = createGameID('fitgirl', 'hades');
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it('same inputs produce same ID', () => {
    const a = createGameID('fitgirl', 'hades');
    const b = createGameID('fitgirl', 'hades');
    expect(a).toBe(b);
  });

  it('different inputs produce different IDs', () => {
    const a = createGameID('fitgirl', 'hades');
    const b = createGameID('dodi', 'hades');
    expect(a).not.toBe(b);
  });
});

describe('detectCompat integration', () => {
  it('detects Windows game needs wine', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades');
    expect(profile.needsWine).toBe(true);
    expect(profile.isLinuxNative).toBe(false);
  });

  it('detects game without deps', () => {
    const profile = detectCompat(NO_DEPS_FILES, 'Game');
    expect(profile.deps).toEqual([]);
  });

  it('detects linux-native game', () => {
    const profile = detectCompat(LINUX_GAME_FILES, 'Hades');
    expect(profile.isLinuxNative).toBe(true);
    expect(profile.needsWine).toBe(false);
  });

  it('detects steam stub triggers proton', () => {
    const profile = detectCompat(STEAM_STUB_FILES, 'Game');
    expect(profile.needsProton).toBe(true);
  });

  it('finds main executable', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades');
    expect(profile.mainExecutable).toBeDefined();
    expect(profile.mainExecutable?.endsWith('.exe')).toBe(true);
  });

  it('detects windows redist dependencies', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades');
    expect(profile.deps.length).toBeGreaterThan(0);
    expect(profile.deps.some((d) => d.type === 'vcredist')).toBe(true);
  });
});

describe('reducePipeline full flow', () => {
  let state: PipelineState;

  beforeAll(() => {
    state = createInitialPipelineState('test-game-id');
  });

  it('starts pipeline', () => {
    const result = reducePipeline(state, { type: 'START' });
    expect(result.ok).toBe(true);
    if (result.ok) state = result.value;
  });

  it('advances through all valid steps', () => {
    const steps: PipelineStep[] = [
      'verifying',
      'extracting',
      'detecting-deps',
      'installing-deps',
      'finding-exe',
      'registering',
      'completed',
    ];
    for (const nextStep of steps) {
      const result = reducePipeline(state, { type: 'ADVANCE', to: nextStep });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.step).toBe(nextStep);
        expect(result.value.status).toBe('running');
        state = result.value;
      }
    }
  });

  it('ends at completed step with progress 100', () => {
    expect(state.step).toBe('completed');
    expect(state.progress).toBe(100);
  });

  it('cannot advance past completed', () => {
    const result = reducePipeline(state, { type: 'ADVANCE', to: 'downloading' });
    expect(result.ok).toBe(false);
  });
});

describe('reducePipeline error handling', () => {
  it('fails mid-pipeline and preserves error message', () => {
    let s = createInitialPipelineState('err-game');
    const start1 = reducePipeline(s, { type: 'START' });
    expect(start1.ok).toBe(true);
    if (!start1.ok) return;
    s = start1.value;

    const advanced = reducePipeline(s, { type: 'ADVANCE', to: 'verifying' });
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    s = advanced.value;

    const failed = reducePipeline(s, { type: 'FAIL', error: 'Corrupt download' });
    expect(failed.ok).toBe(true);
    if (failed.ok) {
      expect(failed.value.status).toBe('failed');
      expect(failed.value.errorMessage).toBe('Corrupt download');
    }
  });

  it('resets failed pipeline and starts fresh', () => {
    let s: PipelineState = {
      ...createInitialPipelineState('retry-game'),
      status: 'failed',
      errorMessage: 'Network error',
    };
    const reset = reducePipeline(s, { type: 'RESET' });
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    s = reset.value;
    expect(s.status).toBe('idle');
    expect(s.step).toBe('downloading');

    const start = reducePipeline(s, { type: 'START' });
    expect(start.ok).toBe(true);
    if (start.ok) expect(start.value.status).toBe('running');
  });
});

describe('getPipelineSteps', () => {
  it('returns all 8 steps in order', () => {
    const steps = getPipelineSteps();
    expect(steps).toHaveLength(8);
    expect(steps).toEqual([
      'downloading',
      'verifying',
      'extracting',
      'detecting-deps',
      'installing-deps',
      'finding-exe',
      'registering',
      'completed',
    ]);
  });
});

describe('extractDownloadLinks', () => {
  it('extracts magnet links from html', () => {
    const html = '<a href="magnet:?xt=urn:btih:abc123">magnet</a> <a href="magnet:?xt=urn:btih:def456">magnet2</a>';
    const links = extractDownloadLinks(html, 'magnet');
    expect(links).toHaveLength(2);
    expect(links[0]).toContain('magnet:');
  });

  it('extracts torrent file links', () => {
    const html =
      '<a href="https://example.com/game.torrent">torrent</a> <a href="https://example.com/patch.torrent">patch</a>';
    const links = extractDownloadLinks(html, 'torrent');
    expect(links).toHaveLength(2);
    expect(links[0]).toContain('.torrent');
  });

  it('deduplicates links', () => {
    const html = '<a href="magnet:?xt=urn:btih:abc">dup</a> <a href="magnet:?xt=urn:btih:abc">dup</a>';
    const links = extractDownloadLinks(html, 'magnet');
    expect(links).toHaveLength(1);
  });

  it('returns empty list for no matches', () => {
    const html = '<p>No links here</p>';
    const links = extractDownloadLinks(html, 'torrent');
    expect(links).toEqual([]);
  });
});

describe('dedup after scrape', () => {
  let scraped: Game[];

  beforeAll(() => {
    const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/fitgirl-sample.html'), 'utf-8');
    const articleRe = /<article[^>]*>.*?<\/article>/gis;
    const articles = html.match(articleRe) ?? [];
    scraped = [];
    for (const article of articles) {
      const titleMatch = article.match(/<h[12][^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h[12]>/i);
      if (!titleMatch) continue;
      const url = titleMatch[1] ?? '';
      const name = titleMatch[2]?.trim() ?? '';
      if (!name || !url) continue;
      const sourceGameId = extractGameId(url);
      scraped.push({
        id: createGameID('fitgirl', sourceGameId),
        name,
        sourceId: 'fitgirl',
        sourceGameId,
        url,
        description: article.match(/<p[^>]*>([^<]*)<\/p>/i)?.[1]?.trim() ?? '',
        size: '',
        sizeBytes: 0,
        lastUpdated: new Date().toISOString(),
        downloadType: 'torrent',
        tags: [],
      });
    }
  });

  it('scraped games are valid', () => {
    for (const game of scraped) {
      expect(validateGame(game).ok).toBe(true);
    }
  });

  it('dedup returns same number for unique games', () => {
    const result = deduplicateGames(scraped);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(scraped.length);
    }
  });

  it('dedup removes duplicates when same game appears', () => {
    const duped = [...scraped, ...scraped.slice(0, 2)];
    const result = deduplicateGames(duped);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(scraped.length);
    }
  });
});
