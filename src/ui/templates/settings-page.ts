import { createScrollContent } from './scroll-content'

const { Gtk, Adw } = imports.gi

export function createSettingsPage(): {
  page: AdwPreferencesPage
  container: AdwClampScrollable
} {
  const page = new Adw.PreferencesPage()
  page.add_css_class('templates-settings-page')
  const container = createScrollContent(page)
  container.add_css_class('templates-settings')
  return { page, container }
}

export function createSettingsGroup(title: string): AdwPreferencesGroup {
  return new Adw.PreferencesGroup({ title })
}
