import { _t } from '../../domain/i18n'
import { createButton } from '../factory'

const { Gtk } = imports.gi

export function createDownloadsEmptyState(
  browseCatalogHandler: (() => void) | null,
): GtkBox {
  const emptyIcon = new Gtk.Label({ label: '📥' })
  emptyIcon.add_css_class('empty-icon')
  const emptyTitle = new Gtk.Label({ label: _t('downloads.empty.title'), xalign: 0 })
  emptyTitle.add_css_class('empty-title')
  const emptyDesc = new Gtk.Label({ label: _t('downloads.empty.description'), xalign: 0, wrap: true })
  emptyDesc.add_css_class('empty-desc')
  const emptyPage = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER })
  emptyPage.add_css_class('empty-state')
  emptyPage.append(emptyIcon)
  emptyPage.append(emptyTitle)
  emptyPage.append(emptyDesc)
  const catalogBtn = createButton({ label: _t('downloads.empty.action'), onClick: () => browseCatalogHandler?.() })
  catalogBtn.add_css_class('suggested-action')
  emptyPage.append(catalogBtn)
  return emptyPage
}
