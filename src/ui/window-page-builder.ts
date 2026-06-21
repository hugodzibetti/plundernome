import { PAGE_DEFS } from './window-page-defs'
import type { ICatalogView, ILibraryView, IDownloadsView, ISettingsView } from '../controller/view-interfaces'

const { Gtk } = imports.gi

export type PageBuilderResult = {
  sidebar: GtkListBox
  stack: GtkStack
  catalogView: ICatalogView | null
  libraryView: ILibraryView | null
  downloadsView: IDownloadsView | null
  settingsView: ISettingsView | null
}

export function buildSidebarAndPages(
  navigateTo: (id: string) => void,
): PageBuilderResult {
  const sidebar = new Gtk.ListBox()
  sidebar.add_css_class('navigation-sidebar')
  sidebar.set_selection_mode(Gtk.SelectionMode.SINGLE)

  const stack = new Gtk.Stack()
  stack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT_RIGHT)
  stack.set_hexpand(true); stack.set_vexpand(true)

  let catalogView: ICatalogView | null = null
  let libraryView: ILibraryView | null = null
  let downloadsView: IDownloadsView | null = null
  let settingsView: ISettingsView | null = null

  for (const def of PAGE_DEFS) {
    const row = new Gtk.ListBoxRow({ css_classes: ['sidebar-row'], name: def.id })
    const hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, margin_start: 4 })
    hbox.append(new Gtk.Image({ icon_name: def.iconName, pixel_size: 16 }))
    hbox.append(new Gtk.Label({ label: def.label, xalign: 0 }))
    row.set_child(hbox); sidebar.append(row)

    const view = def.factory()
    if (def.id === 'catalog') {
      catalogView = view as ICatalogView
      catalogView.onOpenSettings(() => navigateTo('settings'))
    } else if (def.id === 'downloads') {
      downloadsView = view as IDownloadsView
      downloadsView.onBrowseCatalog(() => navigateTo('catalog'))
    } else if (def.id === 'settings') {
      settingsView = view as ISettingsView
    } else if (def.id === 'library') {
      libraryView = view as ILibraryView
      libraryView.onOpenCatalog(() => navigateTo('catalog'))
    }
    stack.add_named(view, def.id)
  }

  return { sidebar, stack, catalogView, libraryView, downloadsView, settingsView }
}
