import type { PipelineOrchestrator } from '../services'
import type { PipelineEvent } from '../services/pipeline-types'
import type { IWindow } from './view-interfaces'
import type { IDialogService } from './types-dialog'
import type { DatabaseService } from '../services/database'
import type { SourceDefinition } from '../domain/catalog/types'
import type { NotificationService } from '../services/notifications'
import type { PipelineStep } from '../domain/models'
import { mapPipelineError } from '../domain/error-messages'
import { showPipelineErrorDialog } from '../ui/widgets/pipeline-error-dialog'

const { Gtk } = imports.gi

export function wirePipelineEvents(
  pipeline: PipelineOrchestrator,
  db: DatabaseService,
  window: IWindow,
  dialogService: IDialogService,
  notifications: NotificationService,
  sources: SourceDefinition[],
  refreshLibrary: () => void,
  playGame?: (gameId: string) => void,
): void {
  pipeline.onEvent(async (evt: PipelineEvent) => {
    if (evt.type === 'error' && evt.gameId) {
      const gameRow = await db.getGame(evt.gameId)
      const gameName = gameRow?.name ?? 'Unknown'
      const userError = mapPipelineError(evt.step ?? 'downloading' as PipelineStep, evt.error ?? '')
      const source = gameRow ? sources.find(s => s.id === gameRow.sourceId) : null
      const mirrors = source?.mirrors ?? []

      showPipelineErrorDialog(
        window as unknown as GtkWidget,
        gameName,
        userError,
        (action: string) => {
          if (action === 'retry') pipeline.retryStep(evt.gameId)
          if (action === 'retry-mirror') pipeline.retryMirror(evt.gameId)
          if (action === 'skip' && pipeline.skipStep) pipeline.skipStep(evt.gameId)
          if (action === 'open-settings') window.navigateTo('settings')
        },
      )
      return
    }
    if (evt.type === 'complete') {
      const gameRow = await db.getGame(evt.gameId)
      const gameName = gameRow?.name ?? 'Unknown'
      const launch = () => playGame?.(evt.gameId)
      window.showToastWithAction(`Installation complete: ${gameName}`, 'Launch', launch)
      notifications.showDownloadCompleteWithActions(evt.gameId, gameName, [
        { label: 'Launch Now', callback: launch },
        { label: 'Show in App', callback: () => window.navigateTo('library') },
      ])
      refreshLibrary()
    }
  })
}
