import type { PipelineOrchestrator } from '../services'
import type { PipelineEvent } from '../services/pipeline-types'
import type { IWindow } from './view-interfaces'
import type { IDialogService } from './types-dialog'
import type { DatabaseService } from '../services/database'
import type { SourceDefinition } from '../domain/catalog/types'
import type { NotificationService } from '../services/notifications'

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
      const source = gameRow ? sources.find(s => s.id === gameRow.sourceId) : null
      const mirrors = source?.mirrors ?? []
      if (evt.step === 'downloading' && mirrors.length > 0) {
        const selectedMirror = await dialogService.showRetryWithMirrorDialog(
          'Download Failed',
          evt.error ?? 'Unknown error',
          mirrors,
        )
        if (selectedMirror) pipeline.retryMirror(evt.gameId)
      } else {
        dialogService.showError('Pipeline Error', evt.error ?? 'Unknown error')
      }
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
