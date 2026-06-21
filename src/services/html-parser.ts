import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import { getElementsByTag, getAttr, hasClass, findLinkTitle, parseHtml, getDocumentElement } from './html-parser-helpers'
import { parseFitGirlArticle, parseSteamripArticle } from './html-parser-sources'
import { parseOnlinefixContainer } from './html-parser-sources2'
import { parseGoggamesContainer } from './html-parser-sources3'
import { parseElAmigosGame, parseGloadGame, parseOvaGamesGame } from './html-parser-sources-new'
export class HtmlParserService {
  parseFitGirlGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const articles = getElementsByTag(root, 'article')
    const games: Game[] = []
    for (const article of articles) {
      const game = parseFitGirlArticle(article, source)
      if (game) games.push(game)
    }
    return games
  }

  parseDodiGames(html: string, source: SourceDefinition): Game[] { return this.parseFitGirlGames(html, source) }

  parseSteamripGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const articles = getElementsByTag(root, 'article')
    const games: Game[] = []
    for (const article of articles) {
      const game = parseSteamripArticle(article, source)
      if (game) games.push(game)
    }
    return games
  }

  parseOnlinefixGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const games: Game[] = []
    const articles = getElementsByTag(root, 'article')
    for (const article of articles) {
      const game = parseOnlinefixContainer(article, source)
      if (game) games.push(game)
    }
    const divs = getElementsByTag(root, 'div')
    for (const div of divs) {
      const cls = getAttr(div, 'class')
      if (cls && (cls.includes('post') || cls.includes('hentry'))) {
        if (games.some(g => g.url === getAttr(div, 'id') || findLinkTitle(div)?.url === g.url)) continue
        const game = parseOnlinefixContainer(div, source)
        if (game) games.push(game)
      }
    }
    return games
  }

  parseGoggamesGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const games: Game[] = []
    const divs = getElementsByTag(root, 'div')
    for (const div of divs) {
      if (hasClass(div, 'game-item')) {
        const game = parseGoggamesContainer(div, source)
        if (game) games.push(game)
      }
    }
    const trs = getElementsByTag(root, 'tr')
    for (const tr of trs) {
      if (hasClass(tr, 'game-row')) {
        const game = parseGoggamesContainer(tr, source)
        if (game) games.push(game)
      }
    }
    return games
  }

  parseElAmigosGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const games: Game[] = []
    const cards = getElementsByTag(root, 'div')
    for (const card of cards) {
      if (hasClass(card, 'card')) {
        const game = parseElAmigosGame(card, source)
        if (game) games.push(game)
      }
    }
    return games
  }

  parseGloadGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const games: Game[] = []
    const articles = getElementsByTag(root, 'article')
    for (const article of articles) {
      const cls = getAttr(article, 'class')
      if (cls?.includes('game-archive-card')) {
        const game = parseGloadGame(article, source)
        if (game) games.push(game)
      }
    }
    return games
  }

  parseOvaGamesGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const games: Game[] = []
    const divs = getElementsByTag(root, 'div')
    for (const div of divs) {
      if (hasClass(div, 'home-post-wrap')) {
        const game = parseOvaGamesGame(div, source)
        if (game) games.push(game)
      }
    }
    return games
  }
}
