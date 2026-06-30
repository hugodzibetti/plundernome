import type {
  IHomeView, ICatalogView, ILibraryView, IDownloadsView, ISettingsView, IWindow, IEmulatorView, IDiscoverView,
} from './view-interfaces'
import type { IDialogService, ILaunchOptionsEditor } from './types-dialog'

export interface IAppController {
  init(): Promise<void>
  shutdown(): Promise<void>
}

export interface ControllerDeps {
  homeView: IHomeView
  catalogView: ICatalogView
  libraryView: ILibraryView
  downloadsView: IDownloadsView
  settingsView: ISettingsView
  window: IWindow
  emulatorsView: IEmulatorView
  discoverView: IDiscoverView
  dialogService: IDialogService
  launchOptionsEditor: ILaunchOptionsEditor
}
