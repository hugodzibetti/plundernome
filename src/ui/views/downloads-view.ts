import type { Download } from '../../domain/models'
import { createButton } from '../factory'
import { buildEmptyState } from '../templates/empty-state'
import { createListContent } from '../templates'

const { Gtk, Adw, GObject } = imports.gi

export const DownloadsView = GObject.registerClass(
  { GTypeName: 'DownloadsView' },
  class DownloadsView extends Adw.Bin {
    private activeList: GtkListBox
    private completedList: GtkListBox
    private stack: GtkStack
    private activeRows = new Map<string, { widget: GtkWidget; update: (d: Download) => void }>()
    private actionHandler: ((action: string, downloadId: string) => void) | null = null
    private retryHandler: ((downloadId: string) => void) | null = null
    private browseHandler: (() => void) | null = null

    constructor() {
      super()
      this.add_css_class('downloads-view')

      this.activeList = createListContent()
      this.activeList.add_css_class('downloads-active-list')
      this.completedList = createListContent()
      this.completedList.add_css_class('downloads-completed-list')

      const activeGroup = new Adw.PreferencesGroup({ title: 'Active Downloads' })
      activeGroup.add(this.activeList)
      const completedGroup = new Adw.PreferencesGroup({ title: 'Completed' })
      completedGroup.add(this.completedList)

      const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
      content.append(activeGroup)
      content.append(completedGroup)
      content.add_css_class('downloads-content')

      const emptyPage = buildEmptyState({
        icon: '📥',
        title: 'No active downloads',
        description: 'Downloaded games will appear here',
        actionLabel: 'Browse Catalog',
        onAction: () => this.browseHandler?.(),
      })

      this.stack = new Gtk.Stack()
      this.stack.set_vexpand(true)
      this.stack.add_named(content, 'content')
      this.stack.add_named(emptyPage, 'empty')
      this.stack.set_visible_child_name('empty')
      this.set_child(this.stack)
    }

    addDownload(download: Download): void {
      const { widget, update } = this.buildActiveRow(download)
      this.activeRows.set(download.id, { widget, update })
      this.activeList.append(widget)
      this.stack.set_visible_child_name('content')
    }

    updateDownload(download: Download): void {
      const existing = this.activeRows.get(download.id)
      if (existing) {
        if (['completed', 'failed'].includes(download.status)) {
          this.activeList.remove(existing.widget)
          this.activeRows.delete(download.id)
          this.addCompletedRow(download)
        } else {
          existing.update(download)
        }
      }
    }

    removeDownload(downloadId: string): void {
      const existing = this.activeRows.get(downloadId)
      if (existing) {
        this.activeList.remove(existing.widget)
        this.activeRows.delete(downloadId)
      }
    }

    private buildActiveRow(download: Download): { widget: GtkWidget; update: (d: Download) => void } {
      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 })
      box.add_css_class('downloads-active-row')
      const nameLbl = new Gtk.Label({ label: download.name, xalign: 0 })
      nameLbl.add_css_class('title-4')
      box.append(nameLbl)
      const progressBar = new Gtk.ProgressBar()
      progressBar.add_css_class('downloads-progress')
      progressBar.set_fraction(download.progress)
      box.append(progressBar)
      const infoBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 })
      const pctLbl = new Gtk.Label({ label: `${Math.round(download.progress * 100)}%`, xalign: 0 })
      pctLbl.add_css_class('caption')
      infoBox.append(pctLbl)
      const speedLbl = new Gtk.Label({ label: this.formatSpeed(download.speed), xalign: 1 })
      speedLbl.add_css_class('caption')
      infoBox.append(speedLbl)
      box.append(infoBox)
      return {
        widget: box,
        update: (d: Download) => {
          progressBar.set_fraction(d.progress)
          pctLbl.set_label(`${Math.round(d.progress * 100)}%`)
          speedLbl.set_label(this.formatSpeed(d.speed))
        },
      }
    }

    private addCompletedRow(download: Download): void {
      const row = new Adw.ActionRow({ title: download.name, subtitle: download.status })
      row.add_css_class('downloads-completed-row')
      if (download.status === 'failed') {
        row.add_suffix(createButton({
          iconName: 'view-refresh-symbolic',
          tooltip: 'Retry',
          onClick: () => this.retryHandler?.(download.id),
        }))
      }
      this.completedList.append(row)
    }

    private formatSpeed(bytesPerSec: number): string {
      if (bytesPerSec === 0) return ''
      if (bytesPerSec > 1e6) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`
      if (bytesPerSec > 1e3) return `${(bytesPerSec / 1e3).toFixed(0)} KB/s`
      return `${bytesPerSec} B/s`
    }

    clearCompletedDownloads(): void {
      let child = this.completedList.get_first_child() as GtkWidget | null
      while (child) {
        const next = child.get_next_sibling() as GtkWidget | null
        this.completedList.remove(child)
        child = next
      }
    }

    onQueueAction(cb: (action: string, downloadId: string) => void): void { this.actionHandler = cb }
    onRetryDownload(cb: (downloadId: string) => void): void { this.retryHandler = cb }
    onBrowseCatalog(cb: () => void): void { this.browseHandler = cb }
  },
)
