import { CatalogView } from './views/catalog-view'
import { DownloadsView } from './views/downloads-view'
import { LibraryView } from './views/library-view'
import { SettingsView } from './views/settings-view'
import type { ICatalogView, ILibraryView, IWindow } from '../controller/view-interfaces'
import { createButton, createToggleButton } from './factory'

const { Gtk } = imports.gi

export type PageDef = {
  label: string; id: string; iconName: string; factory: () => unknown
  headerSuffix?: (win: IWindow) => unknown
}

export function buildCatalogViewToggle(catalogView: ICatalogView | null): unknown {
  const box = new Gtk.Box({ spacing: 4 })
  const gb = createToggleButton({ iconName: 'view-grid-symbolic', active: true, onToggle: () => catalogView?.setViewMode('grid') })
  const lb = createToggleButton({ iconName: 'view-list-symbolic', group: gb, onToggle: () => catalogView?.setViewMode('list') })
  box.append(gb); box.append(lb)
  return box
}

export function buildLibraryImportBtn(libraryView: ILibraryView | null): unknown {
  const box = new Gtk.Box({ spacing: 4 })
  box.append(createButton({ iconName: 'folder-open-symbolic', tooltip: 'Import Folder', onClick: () => libraryView?.showImportDialog() }))
  box.append(createButton({ iconName: 'view-refresh-symbolic', tooltip: 'Refresh Library', onClick: () => libraryView?.refreshLibrary?.() }))
  return box
}

export const PAGE_DEFS: PageDef[] = [
  { label: 'Catalog', id: 'catalog', iconName: 'package-x-generic-symbolic',
    factory: () => new CatalogView(),
    headerSuffix: (win) => buildCatalogViewToggle(win.getCatalogView()) },
  { label: 'Downloads', id: 'downloads', iconName: 'folder-download-symbolic',
    factory: () => new DownloadsView() },
  { label: 'Library', id: 'library', iconName: 'folder-documents-symbolic',
    factory: () => new LibraryView(),
    headerSuffix: (win) => buildLibraryImportBtn(win.getLibraryView()) },
  { label: 'Settings', id: 'settings', iconName: 'preferences-system-symbolic',
    factory: () => new SettingsView() },
]
