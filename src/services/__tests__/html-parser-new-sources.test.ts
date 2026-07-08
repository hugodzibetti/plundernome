// @ts-nocheck
import { describe, it, expect } from 'vitest';
import type { Game } from '../../domain/models';
import type { SourceDefinition } from '../../domain/catalog/types';
import { createGameID } from '../../domain/identity';
import {
  extractElAmigosDownloadLinks,
  extractGloadDownloadLinks,
  extractOvaGamesDownloadLinks,
} from '../parser/html-parser-download-links';

const elamigosSource = {
  id: 'elamigos',
  name: 'ElAmigos Games',
  baseUrl: 'https://www.elamigosgamez.net',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
} as const satisfies SourceDefinition;

const gloadSource = {
  id: 'gload',
  name: 'GLOAD.to',
  baseUrl: 'https://gload.to',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
} as const satisfies SourceDefinition;

const ovaSource = {
  id: 'ovagames',
  name: 'Ova Games',
  baseUrl: 'https://www.ovagames.com',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
} as const satisfies SourceDefinition;

const cardRegex = /<div[^>]*class="[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
const postWrapRegex = /<div[^>]*class="[^"]*home-post-wrap[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;

function parseElAmigosArticle(article: string, source: SourceDefinition): Game | null {
  const linkMatch = article.match(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/);
  if (!linkMatch) return null;
  const url = linkMatch[1]!;
  const name = linkMatch[2]!.trim();
  if (!name || !url) return null;
  const sizeMatch = article.match(/<small[^>]*class="[^"]*text-body-secondary[^"]*"[^>]*>([^<]+)<\/small>/);
  const sizeStr = sizeMatch ? sizeMatch[1]!.trim() : '';
  const sizeMatchNum = sizeStr.match(/^([\d.]+)\s*(GB|MB|KB)$/i);
  const sizeBytes = sizeMatchNum
    ? Math.round(
        parseFloat(sizeMatchNum[1]!) * { GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024 }[sizeMatchNum[2]!.toUpperCase()]!,
      )
    : 0;
  const imgMatch = article.match(/<img[^>]*src="([^"]+)"[^>]*>/);
  const imageUrl = imgMatch && !imgMatch[1].includes('banner') ? imgMatch[1] : undefined;
  const sourceGameId = url.match(/\/([^/]+)\/?$/)?.[1] ?? url;
  return {
    id: createGameID(source.id, sourceGameId),
    name,
    sourceId: source.id,
    sourceGameId,
    url,
    description: '',
    size: sizeStr,
    sizeBytes,
    lastUpdated: new Date().toISOString(),
    downloadType: 'torrent',
    imageUrl,
    tags: [],
  };
}

function parseGloadArticle(article: string, source: SourceDefinition): Game | null {
  const linkMatch = article.match(/<a[^>]*href="([^"]+)"[^>]*>/);
  if (!linkMatch) return null;
  const url = linkMatch[1];
  const titleMatch = article.match(/<h2[^>]*class="[^"]*card-title[^"]*"[^>]*>([^<]+)<\/h2>/);
  const name = titleMatch ? titleMatch[1].trim() : '';
  if (!name || !url) return null;
  const sizeMatch = article.match(/<div[^>]*class="[^"]*card-size[^"]*"[^>]*>([^<]+)<\/div>/);
  const sizeStr = sizeMatch ? sizeMatch[1].trim() : '';
  const sizeMatchNum = sizeStr.match(/([\d.,]+)\s*(GB|MB|KB)/i);
  const num = sizeMatchNum ? parseFloat(sizeMatchNum[1].replace(',', '.')) : 0;
  const unit = sizeMatchNum ? sizeMatchNum[2].toUpperCase() : '';
  const mults: Record<string, number> = { GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024 };
  const sizeBytes = Math.round(num * (mults[unit] ?? 1));
  const imgMatch = article.match(/<img[^>]*src="([^"]+)"[^>]*>/);
  const imageUrl = imgMatch && !imgMatch[1].includes('logo') ? imgMatch[1] : undefined;
  const dateMatch = article.match(/<div[^>]*class="[^"]*card-date[^"]*"[^>]*>([^<]+)<\/div>/);
  const lastUpdated = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
  const genreMatch = article.match(/genre-(\S+)/);
  const tags = genreMatch ? [genreMatch[1]] : [];
  const sourceGameId = url.match(/\/([^/]+)\/?$/)?.[1] ?? url;
  return {
    id: createGameID(source.id, sourceGameId),
    name,
    sourceId: source.id,
    sourceGameId,
    url,
    description: '',
    size: sizeStr,
    sizeBytes,
    lastUpdated,
    downloadType: 'torrent',
    imageUrl,
    tags,
  };
}

function parseOvaGamesPost(post: string, source: SourceDefinition): Game | null {
  const linkMatch = post.match(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/);
  if (!linkMatch) return null;
  const url = linkMatch[1];
  const name = linkMatch[2].trim();
  if (!name || !url) return null;
  const imgMatch = post.match(/<img[^>]*src="([^"]+)"[^>]*>/);
  const imageUrl =
    imgMatch && !imgMatch[1].includes('readmore') && !imgMatch[1].includes('logo') ? imgMatch[1] : undefined;
  const sourceGameId = url.match(/\/([^/]+)\/?$/)?.[1] ?? url;
  return {
    id: createGameID(source.id, sourceGameId),
    name,
    sourceId: source.id,
    sourceGameId,
    url,
    description: '',
    size: '',
    sizeBytes: 0,
    lastUpdated: new Date().toISOString(),
    downloadType: 'torrent',
    imageUrl,
    tags: [],
  };
}

const testParsers = {
  parseElAmigosGames: (html: string, source: SourceDefinition): Game[] => {
    const cards = html.match(cardRegex) ?? [];
    return cards.map((c) => parseElAmigosArticle(c, source)).filter((g): g is Game => g !== null);
  },
  parseGloadGames: (html: string, source: SourceDefinition): Game[] => {
    const articleRe = /<article[\s\S]*?<\/article>/gi;
    const articles = html.match(articleRe) ?? [];
    return articles.map((a) => parseGloadArticle(a, source)).filter((g): g is Game => g !== null);
  },
  parseOvaGamesGames: (html: string, source: SourceDefinition): Game[] => {
    const posts = html.match(postWrapRegex) ?? [];
    return posts.map((p) => parseOvaGamesPost(p, source)).filter((g): g is Game => g !== null);
  },
};

describe('parseElAmigosGames regex fallback', () => {
  const html = `<div class="row">
    <div class="col-lg-2 col-md-3 col-sm-5 portfolio-item">
      <div class="card h-1">
        <a href="https://www.elamigosgamez.net/games/humanitz-p"><img class="card-img-top" src="/storage/games_tumbl/humanitz-cover-uuh.webp" alt="HumanitZ"></a>
        <div class="card-body">
          <h6 class="card-title"><a href="https://www.elamigosgamez.net/games/humanitz-p">HumanitZ</a></h6>
          <small>[Update 1.05.A]</small>
          <small class="text-body-secondary">14.12GB</small>
        </div>
      </div>
    </div>
    <div class="col-lg-2 col-md-3 col-sm-5 portfolio-item">
      <div class="card h-1">
        <a href="https://www.elamigosgamez.net/games/blasphemous-2-pc"><img class="card-img-top" src="/storage/games_tumbl/blasphemous-2-cover-178.webp" alt="Blasphemous 2"></a>
        <div class="card-body">
          <h6 class="card-title"><a href="https://www.elamigosgamez.net/games/blasphemous-2-pc">Blasphemous 2</a></h6>
          <small>[Update 3.0.0]</small>
          <small class="text-body-secondary">1.91GB</small>
        </div>
      </div>
    </div>
    <div class="col-lg-2 col-md-3 col-sm-5 portfolio-item">
      <div class="card h-1">
        <a href="https://www.elamigosgamez.net/games/core-keeper-p"><img class="card-img-top" src="/storage/games_tumbl/core-keeper-cover-krk.webp" alt="Core Keeper"></a>
        <div class="card-body">
          <h6 class="card-title"><a href="https://www.elamigosgamez.net/games/core-keeper-p">Core Keeper</a></h6>
          <small>[Update 1.2.1.2]</small>
          <small class="text-body-secondary">0.42GB</small>
        </div>
      </div>
    </div>
  </div>`;

  it('parses 3 game cards from HTML', () => {
    expect(testParsers.parseElAmigosGames(html, elamigosSource)).toHaveLength(3);
  });

  it('extracts correct game name and URL', () => {
    const games = testParsers.parseElAmigosGames(html, elamigosSource);
    expect(games[0]?.name).toBe('HumanitZ');
    expect(games[0]?.url).toContain('humanitz-p');
  });

  it('parses size from text-body-secondary', () => {
    const games = testParsers.parseElAmigosGames(html, elamigosSource);
    expect(games[0]?.sizeBytes).toBe(Math.round(14.12 * 1024 * 1024 * 1024));
    expect(games[2]?.sizeBytes).toBe(Math.round(0.42 * 1024 * 1024 * 1024));
  });

  it('all games have correct sourceId', () => {
    for (const game of testParsers.parseElAmigosGames(html, elamigosSource)) {
      expect(game.sourceId).toBe('elamigos');
    }
  });

  it('all games have valid MD5-like id', () => {
    for (const game of testParsers.parseElAmigosGames(html, elamigosSource)) {
      expect(game.id).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it('returns empty for empty string', () => {
    expect(testParsers.parseElAmigosGames('', elamigosSource)).toEqual([]);
  });

  it('skips cards without valid links', () => {
    const badHtml = '<div class="card h-1"><div class="card-body"><h6>No Link</h6></div></div>';
    expect(testParsers.parseElAmigosGames(badHtml, elamigosSource)).toEqual([]);
  });
});

describe('parseGloadGames regex fallback', () => {
  const article1 =
    '<article id="post-83273" class="game-archive-card post-83273 category-pc genre-action">' +
    '<a href="https://gload.to/a-a-u-black-site-early-access-p2p/" class="card-link-wrapper">' +
    '<div class="card-header"><div class="card-titles">' +
    '<h2 class="card-title">A A U Black Site Early Access</h2>' +
    '</div><div class="card-date">08.06.2026</div></div>' +
    '<div class="card-main"><div class="card-content">' +
    '<div class="card-left"><div class="card-cover">' +
    '<picture><img src="https://gload.to/wp-content/uploads/2026/06/A.A.U.-Black-Site.jpg" alt="Cover"></picture>' +
    '</div></div>' +
    '<div class="card-right"><div class="card-excerpt">Infos zum Spiel</div></div>' +
    '</div>' +
    '<div class="card-meta-bottom"><div class="card-meta-left">' +
    '<div class="card-size">13,83 GB</div>' +
    '</div></div></div></a></article>';
  const article2 =
    '<article id="post-83270" class="game-archive-card post-83270 category-pc genre-simulation genre-sport">' +
    '<a href="https://gload.to/undisputed-rune/" class="card-link-wrapper">' +
    '<div class="card-header"><div class="card-titles">' +
    '<h2 class="card-title">Undisputed</h2>' +
    '</div><div class="card-date">08.06.2026</div></div>' +
    '<div class="card-main"><div class="card-content">' +
    '<div class="card-left"><div class="card-cover">' +
    '<picture><img src="https://gload.to/wp-content/uploads/2026/06/Undisputed.jpg" alt="Cover"></picture>' +
    '</div></div></div></div>' +
    '<div class="card-meta-bottom"><div class="card-meta-left">' +
    '<div class="card-size">35.20 GB</div>' +
    '</div></div></div></a></article>';
  const html = article1 + article2;

  it('parses 2 game articles from HTML', () => {
    expect(testParsers.parseGloadGames(html, gloadSource)).toHaveLength(2);
  });

  it('extracts correct game name and URL', () => {
    const games = testParsers.parseGloadGames(html, gloadSource);
    expect(games[0]?.name).toBe('A A U Black Site Early Access');
    expect(games[0]?.url).toContain('a-a-u-black-site-early-access-p2p');
  });

  it('parses size from card-size div', () => {
    const games = testParsers.parseGloadGames(html, gloadSource);
    expect(games[0]?.sizeBytes).toBe(Math.round(13.83 * 1024 * 1024 * 1024));
    expect(games[1]?.sizeBytes).toBe(Math.round(35.2 * 1024 * 1024 * 1024));
  });

  it('all games have correct sourceId', () => {
    for (const game of testParsers.parseGloadGames(html, gloadSource)) {
      expect(game.sourceId).toBe('gload');
    }
  });

  it('extracts image URL', () => {
    const games = testParsers.parseGloadGames(html, gloadSource);
    expect(games[0]?.imageUrl).toContain('A.A.U.-Black-Site.jpg');
  });

  it('returns empty for empty string', () => {
    expect(testParsers.parseGloadGames('', gloadSource)).toEqual([]);
  });
});

describe('parseOvaGamesGames regex fallback', () => {
  const html = `<div class="home-post-wrap">
    <div class="home-post-titles">
      <h2><a href="https://www.ovagames.com/f1-25-iconic-edition-multi11-elamigos.html" title="F1 25">F1 25 Iconic Edition MULTi11-ElAmigos</a></h2>
    </div>
    <div class="post-inside">
      <a href="https://www.ovagames.com/f1-25-iconic-edition-multi11-elamigos.html"><img src="https://blogger.googleusercontent.com/img.jpg" class="thumbnail" alt="F1 25" /></a>
    </div>
  </div>
  <div class="home-post-wrap">
    <div class="home-post-titles">
      <h2><a href="https://www.ovagames.com/blasphemous-2-multi11-elamigos.html">Blasphemous 2 MULTi11-ElAmigos</a></h2>
    </div>
    <div class="post-inside">
      <img src="https://1.bp.blogspot.com/blasphemous.jpg" class="thumbnail" alt="Blasphemous 2" />
    </div>
  </div>
  <div class="home-post-wrap">
    <div class="home-post-titles">
      <h2><a href="https://www.ovagames.com/arma-reforger-multi12-elamigos.html">Arma Reforger MULTi12-ElAmigos</a></h2>
    </div>
  </div>`;

  it('parses 3 game posts from HTML', () => {
    expect(testParsers.parseOvaGamesGames(html, ovaSource)).toHaveLength(3);
  });

  it('extracts correct game name', () => {
    const games = testParsers.parseOvaGamesGames(html, ovaSource);
    expect(games[0]?.name).toBe('F1 25 Iconic Edition MULTi11-ElAmigos');
    expect(games[1]?.name).toBe('Blasphemous 2 MULTi11-ElAmigos');
  });

  it('extracts game URL', () => {
    const games = testParsers.parseOvaGamesGames(html, ovaSource);
    expect(games[0]?.url).toContain('f1-25-iconic-edition');
    expect(games[2]?.url).toContain('arma-reforger');
  });

  it('all games have correct sourceId', () => {
    for (const game of testParsers.parseOvaGamesGames(html, ovaSource)) {
      expect(game.sourceId).toBe('ovagames');
    }
  });

  it('extracts cover images', () => {
    const games = testParsers.parseOvaGamesGames(html, ovaSource);
    expect(games[0]?.imageUrl).toBe('https://blogger.googleusercontent.com/img.jpg');
  });

  it('returns empty for empty string', () => {
    expect(testParsers.parseOvaGamesGames('', ovaSource)).toEqual([]);
  });

  it('handles posts with no links gracefully', () => {
    const badHtml = '<div class="home-post-wrap"><h2>No Link</h2></div>';
    expect(testParsers.parseOvaGamesGames(badHtml, ovaSource)).toEqual([]);
  });
});

describe('extractElAmigosDownloadLinks', () => {
  it('extracts mega.nz links', () => {
    const html = '<a href="https://mega.nz/file/abc123">Download</a>';
    expect(extractElAmigosDownloadLinks(html)).toEqual(['https://mega.nz/file/abc123']);
  });

  it('extracts google drive links', () => {
    const html = '<a href="https://drive.google.com/file/d/123/view">GD</a>';
    expect(extractElAmigosDownloadLinks(html)).toEqual(['https://drive.google.com/file/d/123/view']);
  });

  it('extracts mediafire links', () => {
    const html = '<a href="https://www.mediafire.com/file/abc">MF</a>';
    expect(extractElAmigosDownloadLinks(html)).toEqual(['https://www.mediafire.com/file/abc']);
  });

  it('deduplicates links', () => {
    const html = '<a href="https://mega.nz/file/abc">M1</a><a href="https://mega.nz/file/abc">M2</a>';
    expect(extractElAmigosDownloadLinks(html)).toHaveLength(1);
  });

  it('returns empty for html with no links', () => {
    expect(extractElAmigosDownloadLinks('<p>No links here</p>')).toEqual([]);
  });
});

describe('extractGloadDownloadLinks', () => {
  it('extracts magnet links', () => {
    const html = '<a href="magnet:?xt=urn:btih:abc">Magnet</a>';
    expect(extractGloadDownloadLinks(html)).toEqual(['magnet:?xt=urn:btih:abc']);
  });

  it('extracts torrent file links', () => {
    const html = '<a href="https://gload.to/files/game.torrent">Torrent</a>';
    const links = extractGloadDownloadLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('.torrent');
  });

  it('extracts upload links', () => {
    const html = '<a href="https://mega.nz/file/xyz">Mega</a>';
    const links = extractGloadDownloadLinks(html);
    expect(links).toContain('https://mega.nz/file/xyz');
  });

  it('deduplicates', () => {
    const html = '<a href="magnet:?xt=abc">A</a><a href="magnet:?xt=abc">B</a>';
    expect(extractGloadDownloadLinks(html)).toHaveLength(1);
  });

  it('returns empty when no download links', () => {
    expect(extractGloadDownloadLinks('<p>Nothing</p>')).toEqual([]);
  });
});

describe('extractOvaGamesDownloadLinks', () => {
  it('extracts mega.nz links', () => {
    const html = '<a href="https://mega.nz/file/abc">ME</a>';
    expect(extractOvaGamesDownloadLinks(html)).toContain('https://mega.nz/file/abc');
  });

  it('extracts mediafire links', () => {
    const html = '<a href="https://www.mediafire.com/file/xyz">MF</a>';
    expect(extractOvaGamesDownloadLinks(html)).toContain('https://www.mediafire.com/file/xyz');
  });

  it('extracts google drive links', () => {
    const html = '<a href="https://drive.google.com/file/d/xyz/view">GD</a>';
    expect(extractOvaGamesDownloadLinks(html)).toContain('https://drive.google.com/file/d/xyz/view');
  });

  it('extracts magnet links', () => {
    const html = '<a href="magnet:?xt=urn:btih:xyz">MAG</a>';
    expect(extractOvaGamesDownloadLinks(html)).toContain('magnet:?xt=urn:btih:xyz');
  });

  it('returns empty for no matches', () => {
    expect(extractOvaGamesDownloadLinks('<p>test</p>')).toEqual([]);
  });
});
