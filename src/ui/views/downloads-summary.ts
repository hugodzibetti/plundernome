import type { Download } from '../../domain/models'
import { formatSpeed, formatTime } from '../helpers'
import { _t } from '../../domain/i18n'
import { createButton } from '../factory'
import { createDownloadsEmptyState } from './downloads-empty-state'
import { createScrollContent } from '../templates/scroll-content'

const { Gtk, Adw } = imports.gi

export function buildDownloadsPage(
  clearCompleted: () => void,
  browseCatalogHandler: (() => void) | null,
): {
  activeList: GtkListBox;
  completedList: GtkListBox;
  summaryBox: GtkBox;
  summaryLabel: GtkLabel;
  speedLabel: GtkLabel;
  stack: GtkStack;
} {
  const summaryBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 })
  const summaryLabel = new Gtk.Label({ label: _t('downloads.summary.active').replace('{0}', '0'), xalign: 0 })
  const speedLabel = new Gtk.Label({ label: '', xalign: 1 })
  summaryBox.append(summaryLabel)
  summaryBox.append(speedLabel)

  const page = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 })
  page.append(summaryBox)

  const activeList = new Gtk.ListBox({ css_classes: ['boxed-list'] })
  const activeGroup = new Adw.PreferencesGroup({ title: _t('downloads.active') })
  activeGroup.add(activeList)
  page.append(activeGroup)

  const completedList = new Gtk.ListBox({ css_classes: ['boxed-list'] })
  const completedGroup = new Adw.PreferencesGroup({ title: _t('downloads.completed') })
  completedGroup.add(completedList)
  completedGroup.add(
    createButton({
      label: _t('downloads.clear-completed'),
      tooltip: _t('downloads.clear-completed'),
      onClick: () => clearCompleted(),
    }),
  )
  page.append(completedGroup)

  const emptyPage = createDownloadsEmptyState(browseCatalogHandler)

  const stack = new Gtk.Stack()
  stack.add_named(createScrollContent(page, { expand: true }), 'content')
  stack.add_named(emptyPage, 'empty')

  return { activeList, completedList, summaryBox, summaryLabel, speedLabel, stack }
}

export function updateDownloadsSummary(
  activeDownloads: Download[],
  summaryLabel: GtkLabel,
  speedLabel: GtkLabel,
  activeList: GtkListBox,
  completedList: GtkListBox,
  stack: GtkStack,
): void {
  const active = activeDownloads.filter(d => d.status === 'downloading')
  const totalSpeed = active.reduce((sum, d) => sum + d.speed, 0)
  const totalRemaining = activeDownloads
    .filter(d => d.status === 'downloading' && d.totalBytes > 0)
    .reduce((sum, d) => sum + (d.totalBytes - d.bytesDownloaded), 0)
  const queueEta = totalSpeed > 0 && totalRemaining > 0
    ? formatTime(totalRemaining / totalSpeed)
    : ''
  summaryLabel.add_css_class('downloads-summary')
  summaryLabel.set_label(
    _t('downloads.summary.active').replace('{0}', String(activeDownloads.length)) +
    (queueEta ? ` \u2022 ${queueEta}` : ''),
  )
  speedLabel.set_label(totalSpeed > 0 ? formatSpeed(totalSpeed) : '')
  const hasContent = activeList.get_row_at_index(0) !== null || completedList.get_row_at_index(0) !== null
  stack.set_visible_child_name(hasContent ? 'content' : 'empty')
}

export function clearGtkListBox(list: GtkListBox): void {
  let row = list.get_row_at_index(0)
  while (row) { list.remove(row); row = list.get_row_at_index(0) }
}
