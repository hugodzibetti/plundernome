import type { Download } from '../../domain/models'
import { formatSpeed, formatTime } from '../helpers'
import { _t } from '../../domain/i18n'

const { Gtk } = imports.gi

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
