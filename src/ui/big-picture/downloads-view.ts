import type { Download } from '../../domain/models'

const { Gtk, Adw, GObject } = imports.gi

export const BigDownloadsView = GObject.registerClass({
  GTypeName: 'BigDownloadsView',
}, class BigDownloadsView extends Adw.Bin {
  private activeList: GtkListBox
  private completedList: GtkListBox
  private stack: GtkStack

  constructor() {
    super()
    this.add_css_class('big-downloads')

    const outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
    outer.set_margin_top(12)
    outer.set_margin_bottom(12)
    outer.set_margin_start(12)
    outer.set_margin_end(12)

    const activeGroup = new Adw.PreferencesGroup({ title: 'Active Downloads' })
    this.activeList = new Gtk.ListBox({ css_classes: ['boxed-list'] })
    activeGroup.add(this.activeList)
    outer.append(activeGroup)

    const completedGroup = new Adw.PreferencesGroup({ title: 'Completed' })
    this.completedList = new Gtk.ListBox({ css_classes: ['boxed-list'] })
    completedGroup.add(this.completedList)
    outer.append(completedGroup)

    const emptyPage = this.buildEmptyState()

    this.stack = new Gtk.Stack()
    const scroll = new Adw.ClampScrollable()
    scroll.set_child(outer)
    scroll.set_vexpand(true)
    this.stack.add_named(scroll, 'content')
    this.stack.add_named(emptyPage, 'empty')
    this.stack.set_visible_child_name('empty')
    this.set_child(this.stack)
  }

  private buildEmptyState(): GtkBox {
    const page = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER })
    page.add_css_class('empty-state')
    const icon = new Gtk.Label({ label: '📥' })
    icon.add_css_class('empty-icon')
    const title = new Gtk.Label({ label: 'No active downloads', xalign: 0 })
    title.add_css_class('empty-title')
    const desc = new Gtk.Label({ label: 'Downloaded games will appear here', xalign: 0, wrap: true })
    desc.add_css_class('empty-desc')
    page.append(icon)
    page.append(title)
    page.append(desc)
    return page
  }

  private buildDownloadRow(download: Download): GtkWidget {
    const row = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 })
    row.add_css_class('big-downloads-progress')
    row.set_margin_top(6)
    row.set_margin_bottom(6)
    row.set_margin_start(12)
    row.set_margin_end(12)

    const nameLbl = new Gtk.Label({ label: download.name, xalign: 0, css_classes: ['title-4'] })
    row.append(nameLbl)

    const progress = new Gtk.ProgressBar()
    progress.set_fraction(download.progress / 100)
    progress.set_hexpand(true)
    row.append(progress)

    const pctLbl = new Gtk.Label({ label: `${Math.round(download.progress)}%`, xalign: 0, css_classes: ['big-downloads-pct'] })
    row.append(pctLbl)

    const speedLbl = new Gtk.Label({ label: this.formatSpeed(download.speed), xalign: 0, css_classes: ['dim-label'] })
    row.append(speedLbl)

    return row
  }

  private formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec <= 0) return ''
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    let i = 0
    let val = bytesPerSec
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++ }
    return `${val.toFixed(1)} ${units[i]!}`
  }

  addDownload(download: Download): void {
    this.stack.set_visible_child_name('content')
    this.activeList.append(this.buildDownloadRow(download))
  }

  updateDownload(download: Download): void {
    let child = this.activeList.get_first_child() as GtkWidget | null
    while (child) {
      const row = child as unknown as GtkBox
      const firstChild = row.get_first_child()
      if (!firstChild) { child = (child as GtkWidget).get_next_sibling() as GtkWidget | null; continue }
      const progress = (firstChild as GtkBox).get_next_sibling() as GtkProgressBar | null
      if (progress) progress.set_fraction(download.progress / 100)
      child = (child as GtkWidget).get_next_sibling() as GtkWidget | null
    }
  }
})
