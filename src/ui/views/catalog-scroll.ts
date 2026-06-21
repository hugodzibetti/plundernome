import { createScrollContent } from '../templates/scroll-content';

const { Gtk, Adw } = imports.gi;

export const CHUNK_SIZE = 50;

export class ScrollManager {
  renderedCount: number = CHUNK_SIZE;

  connectScroll(sw: AdwClampScrollable, cb: () => void): void {
    sw.connect('map', () => {
      const adj = sw.get_vadjustment();
      if (!adj) return;
      adj.connect('value-changed', () => {
        const atEnd = adj.get_value() + adj.get_page_size() >= adj.get_upper() - 300;
        if (atEnd) cb();
      });
    });
  }

  loadMore(): void {
    this.renderedCount += CHUNK_SIZE;
  }
  reset(): void {
    this.renderedCount = CHUNK_SIZE;
  }
  getRange(): { start: number; end: number } {
    return { start: 0, end: this.renderedCount };
  }
}

export function buildFlowView(box: GtkFlowBox): { clamp: AdwClampScrollable } {
  const clamp = createScrollContent(box, { expand: true });
  clamp.add_css_class('catalog-scroll-clamp');
  return { clamp };
}

export function buildListView(box: GtkListBox): { clamp: AdwClampScrollable } {
  const clamp = createScrollContent(box, { expand: true });
  clamp.add_css_class('catalog-scroll-clamp');
  return { clamp };
}
