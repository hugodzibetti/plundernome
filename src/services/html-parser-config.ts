import type { SourceID } from '../domain/models';

export interface ParserContainerConfig {
  selector: string;
  extraSelectors?: string[];
}

export interface ParserFieldConfig {
  selector: string;
  attr?: string;
  extract?: 'text' | 'text-after-label' | 'class-text' | 'attr';
  labelPattern?: string;
  fallbackSelector?: string;
  fallbackClass?: string;
}

export interface ParserConfig {
  containers: ParserContainerConfig[];
  fields: {
    title: ParserFieldConfig;
    link: ParserFieldConfig;
    size: ParserFieldConfig;
    description: ParserFieldConfig;
    image: ParserFieldConfig;
    date: ParserFieldConfig;
    tags: ParserFieldConfig;
  };
  sizeContainerFallback?: boolean;
  tagsFromSpanClass?: string;
}

export const PARSER_CONFIGS: Partial<Record<SourceID, ParserConfig>> = {
  fitgirl: {
    containers: [{ selector: 'article' }],
    fields: {
      title: { selector: 'h1 a, h2 a, h3 a', extract: 'text' },
      link: { selector: 'h1 a, h2 a, h3 a', extract: 'attr', attr: 'href' },
      size: { selector: 'p', extract: 'text-after-label', labelPattern: '^size' },
      description: { selector: 'p' },
      image: { selector: 'img', extract: 'attr', attr: 'src' },
      date: { selector: 'time', extract: 'attr', attr: 'datetime' },
      tags: { selector: 'a[rel=tag]', extract: 'text' },
    },
  },
  dodi: {
    containers: [{ selector: 'article' }],
    fields: {
      title: { selector: 'h1 a, h2 a, h3 a', extract: 'text' },
      link: { selector: 'h1 a, h2 a, h3 a', extract: 'attr', attr: 'href' },
      size: { selector: 'p', extract: 'text-after-label', labelPattern: '^size' },
      description: { selector: 'p' },
      image: { selector: 'img', extract: 'attr', attr: 'src' },
      date: { selector: 'time', extract: 'attr', attr: 'datetime' },
      tags: { selector: 'a[rel=tag]', extract: 'text' },
    },
  },
  steamrip: {
    containers: [{ selector: 'article' }],
    fields: {
      title: { selector: 'h1 a, h2 a, h3 a', extract: 'text' },
      link: { selector: 'h1 a, h2 a, h3 a', extract: 'attr', attr: 'href' },
      size: { selector: 'span.post-size', extract: 'text' },
      description: { selector: 'div.entry-content p' },
      image: { selector: 'img', extract: 'attr', attr: 'src' },
      date: { selector: 'time.entry-date', extract: 'attr', attr: 'datetime' },
      tags: { selector: 'a[rel=tag]', extract: 'text' },
    },
  },
  onlinefix: {
    containers: [{ selector: 'article' }, { selector: 'div', extraSelectors: ['post', 'hentry'] }],
    fields: {
      title: { selector: 'h1 a, h2 a, h3 a', extract: 'text' },
      link: { selector: 'h1 a, h2 a, h3 a', extract: 'attr', attr: 'href' },
      size: { selector: 'p', extract: 'text-after-label', labelPattern: '^size' },
      description: { selector: 'div.entry-content p' },
      image: { selector: 'img', extract: 'attr', attr: 'src' },
      date: { selector: 'time', extract: 'attr', attr: 'datetime' },
      tags: { selector: 'a[rel=tag]', extract: 'text' },
    },
    sizeContainerFallback: true,
    tagsFromSpanClass: 'tag',
  },
  goggames: {
    containers: [{ selector: 'div.game-item' }, { selector: 'tr.game-row' }],
    fields: {
      title: { selector: 'h2 a, div.game-title a', extract: 'text' },
      link: { selector: 'h2 a, div.game-title a', extract: 'attr', attr: 'href' },
      size: { selector: 'span.size, td.size', extract: 'text' },
      description: { selector: 'p' },
      image: { selector: 'img', extract: 'attr', attr: 'src' },
      date: { selector: 'span.date, td.date', extract: 'text' },
      tags: { selector: 'a.genre', extract: 'text' },
    },
  },
  xatab: {
    containers: [{ selector: 'article' }, { selector: 'div', extraSelectors: ['post', 'game-item'] }],
    fields: {
      title: { selector: 'h1 a, h2 a, h3 a', extract: 'text' },
      link: { selector: 'h1 a, h2 a, h3 a', extract: 'attr', attr: 'href' },
      size: { selector: 'p, span, div', extract: 'text-after-label', labelPattern: '^(size|размер)' },
      description: { selector: 'p' },
      image: { selector: 'img', extract: 'attr', attr: 'src' },
      date: { selector: 'time', extract: 'attr', attr: 'datetime' },
      tags: { selector: 'a[rel=tag]', extract: 'text' },
    },
    sizeContainerFallback: true,
  },
  repacklab: {
    containers: [{ selector: 'article' }, { selector: 'div', extraSelectors: ['post', 'hentry', 'game'] }],
    fields: {
      title: { selector: 'h1 a, h2 a, h3 a, div.post-title a, div.game-title a, div.entry-title a', extract: 'text' },
      link: {
        selector: 'h1 a, h2 a, h3 a, div.post-title a, div.game-title a, div.entry-title a',
        extract: 'attr',
        attr: 'href',
      },
      size: { selector: 'span.size, p', extract: 'text-after-label', labelPattern: '^size' },
      description: { selector: 'p' },
      image: { selector: 'img', extract: 'attr', attr: 'src' },
      date: { selector: 'time', extract: 'attr', attr: 'datetime' },
      tags: { selector: 'a[rel=tag]', extract: 'text' },
    },
    sizeContainerFallback: true,
  },
  elamigos: {
    containers: [{ selector: 'div.card' }],
    fields: {
      title: { selector: 'a', extract: 'text' },
      link: { selector: 'a', extract: 'attr', attr: 'href' },
      size: { selector: '.text-body-secondary', extract: 'text' },
      description: { selector: 'small', extract: 'text' },
      image: { selector: 'img.card-img-top', extract: 'attr', attr: 'src' },
      date: { selector: '', extract: 'text' },
      tags: { selector: '', extract: 'text' },
    },
  },
  gload: {
    containers: [{ selector: 'article.game-archive-card' }],
    fields: {
      title: { selector: 'h2.card-title, h3.list-title', extract: 'text' },
      link: { selector: 'a.card-link-wrapper', extract: 'attr', attr: 'href' },
      size: { selector: '.card-size, .list-size', extract: 'text' },
      description: { selector: '.card-excerpt', extract: 'text' },
      image: { selector: 'picture img', extract: 'attr', attr: 'src' },
      date: { selector: '.card-date, .list-date', extract: 'text' },
      tags: { selector: '.card-genre', extract: 'text' },
    },
  },
};
