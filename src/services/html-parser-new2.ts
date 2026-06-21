import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import type { IHTMLParserService } from './html-parser-types'
import { getElementsByTag, getAttr, hasClass, parseHtml, getDocumentElement } from './html-parser-helpers'
import { parseXatabContainer } from './html-parser-sources-xatab'
import { parseRepackGamesContainer, parseRepacklabContainer } from './html-parser-sources-repack'
import { HtmlParserService } from './html-parser'

export class HtmlParserServiceNew2 extends HtmlParserService implements IHTMLParserService {
  parseXatabGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const games: Game[] = []
    const articles = getElementsByTag(root, 'article')
    for (const article of articles) {
      const game = parseXatabContainer(article, source)
      if (game) games.push(game)
    }
    const divs = getElementsByTag(root, 'div')
    for (const div of divs) {
      if (hasClass(div, 'post') || hasClass(div, 'game-item')) {
        const game = parseXatabContainer(div, source)
        if (game) games.push(game)
      }
    }
    return games
  }

  parseRepackGamesGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const games: Game[] = []
    const articles = getElementsByTag(root, 'article')
    for (const article of articles) {
      const game = parseRepackGamesContainer(article, source)
      if (game) games.push(game)
    }
    const divs = getElementsByTag(root, 'div')
    for (const div of divs) {
      if (hasClass(div, 'post') || hasClass(div, 'game-listing')) {
        const game = parseRepackGamesContainer(div, source)
        if (game) games.push(game)
      }
    }
    return games
  }

  parseRepacklabGames(html: string, source: SourceDefinition): Game[] {
    const doc = parseHtml(html, source.baseUrl)
    if (!doc) return []
    const root = getDocumentElement(doc)
    if (!root) return []
    const games: Game[] = []
    const articles = getElementsByTag(root, 'article')
    for (const article of articles) {
      const game = parseRepacklabContainer(article, source)
      if (game) games.push(game)
    }
    const divs = getElementsByTag(root, 'div')
    for (const div of divs) {
      const cls = getAttr(div, 'class')
      if (cls && (cls.includes('post') || cls.includes('hentry') || cls.includes('game'))) {
        const game = parseRepacklabContainer(div, source)
        if (game) games.push(game)
      }
    }
    return games
  }
}