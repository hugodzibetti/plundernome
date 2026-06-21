import { DownloadRowWidget } from '../widgets/download-row'
import { buildCompletedRow } from './downloads-completed-row'
import { createDownloadsEmptyState } from './downloads-empty-state'
import { updateDownloadsSummary, clearGtkListBox } from './downloads-summary'
import { setPipelineSteps, removePipelineTimeline } from './downloads-timeline'
import type { Download, QueueAction } from '../../domain/models'
import { reorderDownloads } from '../../domain/queue'
import { _t } from '../../domain/i18n'
import { createButton } from '../factory'
import type { StepDisplay } from '../widgets/pipeline-timeline'
import { createScrollContent } from '../templates/scroll-content'

const { Gtk, Adw, GObject } = imports.gi

export const DownloadsView = GObject.registerClass({
  GTypeName: 'DownloadsView',
}, class DownloadsView extends Adw.Bin {
  private activeList: GtkListBox
  private completedList: GtkListBox
  private stack: GtkStack
  private summaryBox: GtkBox
  private summaryLabel: GtkLabel
  private speedLabel: GtkLabel
  private activeDownloads: Download[] = []
  private widgetMap: Map<string, unknown> = new Map()
  private onAction: ((action: QueueAction, downloadId: string) => void) | null = null
  private retryHandler: ((downloadId: string) => void) | null = null
  private timelineMap = new Map<string, unknown>()
  private browseCatalogHandler: (() => void) | null = null

  constructor() {
    super()
    this.add_css_class('downloads-view')
    const page = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 })

    this.summaryBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 })
    this.summaryLabel = new Gtk.Label({ label: _t('downloads.summary.active').replace('{0}', '0'), xalign: 0 })
    this.speedLabel = new Gtk.Label({ label: '', xalign: 1 })
    this.summaryBox.append(this.summaryLabel); this.summaryBox.append(this.speedLabel)
    page.append(this.summaryBox)

    const activeGroup = new Adw.PreferencesGroup({ title: _t('downloads.active') })
    this.activeList = new Gtk.ListBox({ css_classes: ['boxed-list'] })
    activeGroup.add(this.activeList)
    page.append(activeGroup)

    const completedGroup = new Adw.PreferencesGroup({ title: _t('downloads.completed') })
    this.completedList = new Gtk.ListBox({ css_classes: ['boxed-list'] })
    completedGroup.add(this.completedList)
    completedGroup.add(createButton({ label: _t('downloads.clear-completed'), tooltip: _t('downloads.clear-completed'), onClick: () => this.clearCompletedDownloads() }))
    page.append(completedGroup)

    const emptyPage = createDownloadsEmptyState(this.browseCatalogHandler)

    this.stack = new Gtk.Stack()
    this.stack.add_named(createScrollContent(page), 'content')
    this.stack.add_named(emptyPage, 'empty')
    this.set_child(this.stack)
    this.updateSummary()
  }

  onQueueAction(cb: (action: QueueAction, downloadId: string) => void): void {
    this.onAction = cb
  }

  onRetryDownload(cb: (downloadId: string) => void): void {
    this.retryHandler = cb
  }

  onBrowseCatalog(cb: () => void): void { this.browseCatalogHandler = cb }

  clearCompletedDownloads(): void {
    clearGtkListBox(this.completedList)
    this.updateSummary()
  }

  private handleAction = (action: QueueAction, downloadId: string, extra?: number) => {
    if (action === 'reorder' && extra !== undefined) {
      const idx = this.activeDownloads.findIndex(d => d.id === downloadId)
      if (idx === -1) return
      const toIndex = idx + extra
      const reordered = reorderDownloads(this.activeDownloads, idx, toIndex)
      if (reordered !== this.activeDownloads) {
        this.activeDownloads = reordered
        clearGtkListBox(this.activeList)
        this.widgetMap.clear()
        for (const dl of this.activeDownloads) {
          const row = new DownloadRowWidget(dl, this.handleAction)
          this.widgetMap.set(dl.id, row); this.activeList.append(row)
        }
      }
    }
    this.onAction?.(action, downloadId)
  }

  addDownload(download: Download): void {
    this.stack.set_visible_child_name('content')
    if (['queued', 'downloading', 'verifying', 'paused', 'resuming'].includes(download.status)) {
      this.activeDownloads.push(download)
      this.activeList.append(new DownloadRowWidget(download, this.handleAction))
      this.widgetMap.set(download.id, this.activeList.get_last_child())
    } else {
      this.completedList.append(buildCompletedRow(download, this.retryHandler))
    }
    this.updateSummary()
  }

  updateDownload(download: Download): void {
    const widget = this.widgetMap.get(download.id)
    if (!widget) return
    if (['completed', 'failed'].includes(download.status)) {
      this.activeList.remove(widget)
      this.widgetMap.delete(download.id)
      this.activeDownloads = this.activeDownloads.filter(d => d.id !== download.id)
      this.completedList.append(buildCompletedRow(download, this.retryHandler))
    } else {
      const idx = this.activeDownloads.findIndex(d => d.id === download.id)
      if (idx !== -1) this.activeDownloads[idx] = download
      ;(widget as unknown as { update(dl: Download): void }).update(download)
    }
    this.updateSummary()
  }

  removeDownload(id: string): void {
    const widget = this.widgetMap.get(id)
    if (widget) { this.activeList.remove(widget); this.widgetMap.delete(id) }
    this.activeDownloads = this.activeDownloads.filter(d => d.id !== id)
    removePipelineTimeline(id, this.timelineMap)
    this.updateSummary()
  }

  setPipelineSteps(downloadId: string, steps: StepDisplay[]): void {
    setPipelineSteps(downloadId, steps, this.timelineMap, this.widgetMap)
  }

  getActiveDownloads(): Download[] {
    return [...this.activeDownloads]
  }

  private updateSummary(): void {
    updateDownloadsSummary(this.activeDownloads, this.summaryLabel, this.speedLabel, this.activeList, this.completedList, this.stack)
  }
})
