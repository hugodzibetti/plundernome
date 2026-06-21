import { DownloadRowWidget } from '../widgets/download-row';
import { buildCompletedRow } from './downloads-completed-row';
import { buildDownloadsPage, updateDownloadsSummary, clearGtkListBox } from './downloads-summary';
import { setPipelineSteps, removePipelineTimeline } from './downloads-timeline';
import type { Download, QueueAction } from '../../domain/models';
import { reorderDownloads } from '../../domain/queue';
import { _t } from '../../domain/i18n';
import type { StepDisplay } from '../widgets/pipeline-timeline';

const { Gtk, Adw, GObject } = imports.gi;

export const DownloadsView = GObject.registerClass(
  {
    GTypeName: 'DownloadsView',
  },
  class DownloadsView extends Adw.Bin {
    private activeList: GtkListBox;
    private completedList: GtkListBox;
    private stack: GtkStack;
    private summaryBox: GtkBox;
    private summaryLabel: GtkLabel;
    private speedLabel: GtkLabel;
    private activeDownloads: Download[] = [];
    private widgetMap: Map<string, unknown> = new Map();
    private onAction: ((action: QueueAction, downloadId: string) => void) | null = null;
    private retryHandler: ((downloadId: string) => void) | null = null;
    private timelineMap = new Map<string, unknown>();
    private browseCatalogHandler: (() => void) | null = null;

    constructor() {
      super();
      this.add_css_class('downloads-view');
      const built = buildDownloadsPage(
        () => this.clearCompletedDownloads(),
        this.browseCatalogHandler,
      );
      this.summaryBox = built.summaryBox;
      this.summaryLabel = built.summaryLabel;
      this.speedLabel = built.speedLabel;
      this.activeList = built.activeList;
      this.completedList = built.completedList;
      this.stack = built.stack;
      this.set_child(built.stack);
      this.updateSummary();
    }

    onQueueAction(cb: (action: QueueAction, downloadId: string) => void): void {
      this.onAction = cb;
    }

    onRetryDownload(cb: (downloadId: string) => void): void {
      this.retryHandler = cb;
    }

    onBrowseCatalog(cb: () => void): void {
      this.browseCatalogHandler = cb;
    }

    clearCompletedDownloads(): void {
      clearGtkListBox(this.completedList);
      this.updateSummary();
    }

    private handleAction = (action: QueueAction, downloadId: string, extra?: number) => {
      if (action === 'reorder' && extra !== undefined) {
        const idx = this.activeDownloads.findIndex((d) => d.id === downloadId);
        if (idx === -1) return;
        const toIndex = idx + extra;
        const reordered = reorderDownloads(this.activeDownloads, idx, toIndex);
        if (reordered !== this.activeDownloads) {
          this.activeDownloads = reordered;
          clearGtkListBox(this.activeList);
          this.widgetMap.clear();
          for (const dl of this.activeDownloads) {
            const row = new DownloadRowWidget(dl, this.handleAction);
            this.widgetMap.set(dl.id, row);
            this.activeList.append(row);
          }
        }
      }
      this.onAction?.(action, downloadId);
    };

    addDownload(download: Download): void {
      this.stack.set_visible_child_name('content');
      if (['queued', 'downloading', 'verifying', 'paused', 'resuming'].includes(download.status)) {
        this.activeDownloads.push(download);
        this.activeList.append(new DownloadRowWidget(download, this.handleAction));
        this.widgetMap.set(download.id, this.activeList.get_last_child());
      } else {
        this.completedList.append(buildCompletedRow(download, this.retryHandler));
      }
      this.updateSummary();
    }

    updateDownload(download: Download): void {
      const widget = this.widgetMap.get(download.id);
      if (!widget) return;
      if (['completed', 'failed'].includes(download.status)) {
        this.activeList.remove(widget);
        this.widgetMap.delete(download.id);
        this.activeDownloads = this.activeDownloads.filter((d) => d.id !== download.id);
        this.completedList.append(buildCompletedRow(download, this.retryHandler));
      } else {
        const idx = this.activeDownloads.findIndex((d) => d.id === download.id);
        if (idx !== -1) this.activeDownloads[idx] = download;
        (widget as { update(dl: Download): void }).update(download);
      }
      this.updateSummary();
    }

    removeDownload(id: string): void {
      const widget = this.widgetMap.get(id);
      if (widget) {
        this.activeList.remove(widget);
        this.widgetMap.delete(id);
      }
      this.activeDownloads = this.activeDownloads.filter((d) => d.id !== id);
      removePipelineTimeline(id, this.timelineMap);
      this.updateSummary();
    }

    setPipelineSteps(downloadId: string, steps: StepDisplay[]): void {
      setPipelineSteps(downloadId, steps, this.timelineMap, this.widgetMap);
    }

    getActiveDownloads(): Download[] {
      return [...this.activeDownloads];
    }

    private updateSummary(): void {
      updateDownloadsSummary(
        this.activeDownloads,
        this.summaryLabel,
        this.speedLabel,
        this.activeList,
        this.completedList,
        this.stack,
      );
    }
  },
);
