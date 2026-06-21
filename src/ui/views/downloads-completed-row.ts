import type { Download } from '../../domain/models'
import { formatBytes, formatDate } from '../helpers'
import { _t } from '../../domain/i18n'
import { createButton } from '../factory'

const { Gtk, Adw } = imports.gi

export function buildCompletedRow(
  download: Download,
  retryHandler: ((downloadId: string) => void) | null,
): AdwActionRow {
  const iconName = download.status === 'completed' ? 'object-select-symbolic' : 'dialog-error-symbolic'
  const row = new Adw.ActionRow({
    title: download.name,
    subtitle: `${formatBytes(download.totalBytes)} — ${formatDate(download.completedAt)}`,
  })
  row.add_prefix(new Gtk.Image({ icon_name: iconName }))
  if (download.status === 'failed') {
    row.add_css_class('error-row')
    row.add_suffix(createButton({ iconName: 'view-refresh-symbolic', tooltip: _t('downloads.retry'), onClick: () => retryHandler?.(download.id) }))
  }
  return row
}
