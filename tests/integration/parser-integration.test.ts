import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HtmlParserService } from '../../src/services/html-parser';
import { HtmlParserServiceNew2 } from '../../src/services/html-parser-new2';
import type { SourceDefinition } from '../../src/domain/catalog/types';

const FITGIRL: SourceDefinition = {
  id: 'fitgirl',
  name: 'FitGirl Repacks',
  baseUrl: 'https://fitgirl-repacks.site',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

const DODI: SourceDefinition = {
  id: 'dodi',
  name: 'DODI Repacks',
  baseUrl: 'https://dodi-repacks.site',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

const XATAB: SourceDefinition = {
  id: 'xatab',
  name: 'Xatab Repack',
  baseUrl: 'https://xatab-repack.com',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

const REPACK_GAMES: SourceDefinition = {
  id: 'repack-games',
  name: 'Repack Games',
  baseUrl: 'https://repack-games.com',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

const REPACKLAB: SourceDefinition = {
  id: 'repacklab',
  name: 'RepackLab',
  baseUrl: 'https://repacklab.com',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

const ELAMIGOS: SourceDefinition = {
  id: 'elamigos',
  name: 'ElAmigos Games',
  baseUrl: 'https://www.elamigosgamez.net',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

const GLOAD: SourceDefinition = {
  id: 'gload',
  name: 'GLOAD.to',
  baseUrl: 'https://gload.to',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

const OVAGAMES: SourceDefinition = {
  id: 'ovagames',
  name: 'Ova Games',
  baseUrl: 'https://www.ovagames.com',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
};

for (const [label, ParserCtor] of [
  ['HtmlParserService', HtmlParserService],
  ['HtmlParserServiceNew2', HtmlParserServiceNew2],
] as const) {
  describe(`${label} with fallback DOM`, () => {
    const parser = new ParserCtor();

    it('parses FitGirl sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/fitgirl-sample.html'), 'utf-8');
      const games = parser.parseGames('fitgirl', html, FITGIRL);
      console.log(`[${label}] FitGirl games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses DODI sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/dodi-sample.html'), 'utf-8');
      const games = parser.parseGames('dodi', html, DODI);
      console.log(`[${label}] DODI games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses SteamRIP sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/steamrip-sample.html'), 'utf-8');
      const games = parser.parseGames('steamrip', html, { ...FITGIRL, id: 'steamrip' });
      console.log(`[${label}] SteamRIP games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses OnlineFix sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/onlinefix-sample.html'), 'utf-8');
      const games = parser.parseGames('onlinefix', html, { ...FITGIRL, id: 'onlinefix' });
      console.log(`[${label}] OnlineFix games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses GOGGames sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/goggames-sample.html'), 'utf-8');
      const games = parser.parseGames('goggames', html, { ...FITGIRL, id: 'goggames' });
      console.log(`[${label}] GOGGames games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses Xatab sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/xatab-sample.html'), 'utf-8');
      const games = parser.parseGames('xatab', html, XATAB);
      console.log(`[${label}] Xatab games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses Repack Games sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/repack-games-sample.html'), 'utf-8');
      const games = parser.parseGames('repack-games', html, REPACK_GAMES);
      console.log(`[${label}] Repack Games games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses RepackLab sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/repacklab-sample.html'), 'utf-8');
      const games = parser.parseGames('repacklab', html, REPACKLAB);
      console.log(`[${label}] RepackLab games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses ElAmigos sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/elamigos-sample.html'), 'utf-8');
      const games = parser.parseGames('elamigos', html, ELAMIGOS);
      console.log(`[${label}] ElAmigos games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses GLOAD sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/gload-sample.html'), 'utf-8');
      const games = parser.parseGames('gload', html, GLOAD);
      console.log(`[${label}] GLOAD games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });

    it('parses OvaGames sample HTML', () => {
      const html = readFileSync(resolve(__dirname, '../fixtures/source-pages/ovagames-sample.html'), 'utf-8');
      const games = parser.parseGames('ovagames', html, OVAGAMES);
      console.log(`[${label}] OvaGames games:`, games.length);
      for (const g of games) console.log(`  "${g.name}" url=${g.url}`);
      expect(games.length).toBeGreaterThan(0);
    });
  });
}
