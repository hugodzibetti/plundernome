import { _t } from '../../domain/i18n'
import { createButton } from '../factory'
import { buildEmptyState } from '../templates'

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

export function setViewError(mainStack: GtkStack, errorPage: GtkBox | null, msg: string): GtkBox | null {
  if (!errorPage) {
    errorPage = buildErrorPage(msg)
    mainStack.add_named(errorPage, 'error')
  }
  return errorPage
}

export function buildLoadingOverlay(): GtkBox {
  const overlay = buildEmptyState({
    icon: '⏳',
    title: _t('catalog.loading'),
    description: '',
  })
  overlay.add_css_class('loading-overlay')
  return overlay
}

export function buildErrorPage(message: string): GtkBox {
  return buildEmptyState({
    icon: '❌',
    title: _t('catalog.error.title'),
    description: message,
  })
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
  return buildEmptyState({
    icon: '🎮',
    title: _t('catalog.empty.title'),
    description: _t('catalog.empty.no-results').replace('{0}', ''),
    actionLabel: _t('catalog.empty.action'),
    onAction: openSettings,
  })
}
