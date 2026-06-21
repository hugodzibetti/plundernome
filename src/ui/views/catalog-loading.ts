import { _t } from '../../domain/i18n'
import { createButton } from '../factory'

const { Gtk, Adw } = imports.gi

export function setViewLoading(mainStack: GtkStack, overlay: GtkBox | null, loading: boolean): GtkBox | null {
  if (loading) {
    if (!overlay) overlay = buildLoadingOverlay()
    mainStack.add_named(overlay, 'loading')
    mainStack.set_visible_child_name('loading')
  } else if (overlay) {
    mainStack.remove(overlay)
    overlay = null
  }
  return overlay
}

export function setViewError(mainStack: GtkStack, errorPage: AdwStatusPage | null, msg: string): AdwStatusPage | null {
  if (!errorPage) {
    errorPage = buildErrorPage(msg)
    mainStack.add_named(errorPage, 'error')
  }
  errorPage.set_description(msg)
  mainStack.set_visible_child_name('error')
  return errorPage
}

export function buildLoadingOverlay(): GtkBox {
  const overlay = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
  overlay.add_css_class('loading-overlay')
  const spinner = new Gtk.Spinner()
  spinner.start()
  overlay.append(spinner)
  return overlay
}

export function buildErrorPage(message: string): AdwStatusPage {
  const page = new Adw.StatusPage({
    title: _t('catalog.error.title'),
    description: message,
    icon_name: 'dialog-error-symbolic',
  })
  return page
}

export function updateEmptyState(mainStack: GtkStack, emptyPage: GtkBox, searchEntry: GtkSearchEntry, n: number): void {
  if (n > 0) {
    mainStack.set_visible_child_name('content')
    return
  }
  const q = searchEntry.get_text().toLowerCase()
  let child: unknown = emptyPage.get_first_child()
  let idx = 0
  while (child) {
    if (idx === 1 && child instanceof Gtk.Label)
      child.set_label(q ? _t('catalog.empty.title') : _t('catalog.empty.title-empty'))
    if (idx === 2 && child instanceof Gtk.Label)
      child.set_label(q ? _t('catalog.empty.no-results').replace('{0}', q) : _t('catalog.empty.description-empty'))
    child = (child as GtkWidget).get_next_sibling()
    idx++
  }
  mainStack.set_visible_child_name('empty')
}

export function buildEmptyPage(openSettings: () => void): GtkBox {
  const icon = new Gtk.Label({ label: '🎮' }); icon.add_css_class('empty-icon')
  const title = new Gtk.Label({ label: _t('catalog.empty.title'), xalign: 0 }); title.add_css_class('empty-title')
  const desc = new Gtk.Label({ label: _t('catalog.empty.no-results').replace('{0}', ''), xalign: 0, wrap: true })
  desc.add_css_class('empty-desc')
  const page = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER })
  page.add_css_class('empty-state')
  page.append(icon); page.append(title); page.append(desc)
  const btn = createButton({ label: _t('catalog.empty.action'), onClick: openSettings })
  btn.add_css_class('suggested-action'); page.append(btn)
  return page
}
