import { _t } from '../../domain/i18n'
import { createButton } from '../factory'

const { Gtk, Adw } = imports.gi

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
