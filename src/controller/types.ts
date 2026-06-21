import type {
  ICatalogView, ILibraryView, IDownloadsView, ISettingsView, IWindow,
} from './view-interfaces'

export interface IAppController {
  init(): Promise<void>
  shutdown(): Promise<void>
}

export interface ControllerDeps {
  catalogView: ICatalogView
  libraryView: ILibraryView
  downloadsView: IDownloadsView
  settingsView: ISettingsView
  window: IWindow
  emulatorsView: import('./view-interfaces').IEmulatorView
}
