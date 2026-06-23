import type {
  ICatalogView, ILibraryView, IDownloadsView, ISettingsView, IWindow, IEmulatorView,
} from './view-interfaces'
import type { IDialogService, ILaunchOptionsEditor } from './types-dialog'

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
  emulatorsView: IEmulatorView
  dialogService: IDialogService
  launchOptionsEditor: ILaunchOptionsEditor
}
