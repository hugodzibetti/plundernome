import { describe, it, expect } from 'vitest'
import { parseHtmlFallback } from '../html-dom-fallback'

function collectByTag(root: any, tag: string): any[] {
  const list = root.get_elements_by_tag_name(tag)
  const result: any[] = []
  for (let item = list; item != null; item = item.next) {
    if (item.data) result.push(item.data)
  }
  return result
}

function getDocRoot(doc: any): any {
  return doc.get_document_element ? doc.get_document_element() : doc
}

describe('parseHtmlFallback', () => {
  const html = `<html>
<body>
  <article>
    <h1><a href="https://example.com/game1/">Game One</a></h1>
    <time datetime="2025-01-15T10:00:00Z">January 15, 2025</time>
    <p>Description here</p>
    <img src="https://example.com/img.jpg" alt="Game" />
    <p>Size: 14.2 GB</p>
    <a href="https://example.com/tag/action/" rel="tag">action</a>
    <a href="https://example.com/tag/rpg/" rel="tag">rpg</a>
  </article>
  <article>
    <h2><a href="https://example.com/game2/">Game Two</a></h2>
    <time datetime="2025-02-01T08:00:00Z">February 1, 2025</time>
    <p>Another description.</p>
    <p>Size: 124.8 GB</p>
  </article>
</body>
</html>`

  it('parses document element', () => {
    const doc = parseHtmlFallback(html, 'https://example.com')
    expect(doc).not.toBeNull()
    const root = (doc as any).get_document_element()
    expect(root).not.toBeNull()
  })

  it('finds articles by tag name', () => {
    const doc = parseHtmlFallback(html, 'https://example.com')
    const root = getDocRoot(doc)
    const articles = collectByTag(root, 'article')
    expect(articles).toHaveLength(2)
  })

  it('extracts link from first article', () => {
    const doc = parseHtmlFallback(html, 'https://example.com')
    const root = getDocRoot(doc)
    const articles = collectByTag(root, 'article')
    const links = collectByTag(articles[0], 'a')
    expect(links.length).toBeGreaterThan(0)
    const href = links[0].get_attribute('href')
    expect(href).toBe('https://example.com/game1/')
  })

  it('extracts text from article', () => {
    const doc = parseHtmlFallback(html, 'https://example.com')
    const root = getDocRoot(doc)
    const articles = collectByTag(root, 'article')
    const links = collectByTag(articles[0], 'a')
    const text = links[0].get_text_content()
    expect(text).toBe('Game One')
  })

  it('handles empty input', () => {
    const doc = parseHtmlFallback('', 'https://example.com')
    expect(doc).not.toBeNull()
    const root = getDocRoot(doc)
    const articles = collectByTag(root, 'article')
    expect(articles).toHaveLength(0)
  })
})
