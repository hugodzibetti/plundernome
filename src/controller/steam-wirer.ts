import type { SteamService } from '../services/steam/steam-service'
import type { IDatabaseService } from '../services/types'
import type { ILibraryView } from './view-interfaces'

export function wireSteamImport(
  steamService: SteamService,
  libraryView: ILibraryView,
  db: IDatabaseService
): void {
  libraryView.onSteamImport(async () => {
    const folders = await steamService.scanLibrary()
    for (const folder of folders) {
      for (const app of folder.apps) {
        const gameId = `steam-${app.appId}`
        await steamService.importApp(gameId, app.appId)
      }
    }
    libraryView.refreshLibrary()
  })
}
