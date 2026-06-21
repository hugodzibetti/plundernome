import type { PipelineOrchestrator } from '../services'
import type { PipelineEvent } from '../services/pipeline-types'
import type { IWindow, ILibraryView } from './view-interfaces'
import type { DatabaseService } from '../services/database'
import type { SourceDefinition } from '../domain/catalog/types'
import type { NotificationService } from '../services/notifications'
import { showErrorDialog, showRetryWithMirrorDialog } from '../ui/error-dialog'

export function wirePipelineEvents(
  pipeline: PipelineOrchestrator,
  db: DatabaseService,
  window: IWindow,
  libraryView: ILibraryView,
  notifications: NotificationService,
  sources: SourceDefinition[],
  refreshLibrary: () => void,
): void {
  pipeline.onEvent(async (evt: PipelineEvent) => {
    if (evt.type === 'error' && evt.gameId) {
      const gameRow = await db.getGame(evt.gameId)
      const source = gameRow ? sources.find(s => s.id === gameRow.sourceId) : null
      const mirrors = source?.mirrors ?? []
      if (evt.step === 'downloading' && mirrors.length > 0) {
        showRetryWithMirrorDialog(
          window as unknown as GtkWidget,
          evt.gameId,
          gameRow?.url ?? '',
          mirrors,
          () => pipeline.retryMirror(evt.gameId),
        )
      } else {
        const onMirrorRetry = mirrors.length > 0 ? () => pipeline.retryMirror(evt.gameId) : undefined
        showErrorDialog({
          parent: window as unknown as GtkWidget,
          title: 'Pipeline Error',
          message: evt.error ?? 'Unknown error',
          gameId: evt.gameId,
          onRetry: () => pipeline.retryStep(evt.gameId!),
          onMirrorRetry,
        })
      }
    }
    if (evt.type === 'complete') {
      const gameRow = await db.getGame(evt.gameId)
      const gameName = gameRow?.name ?? 'Unknown'
      window.showToastWithAction(`Installation complete: ${gameName}`, 'Launch', () => libraryView.triggerPlay(evt.gameId))
      notifications.showDownloadCompleteWithActions(evt.gameId, gameName, [
        { label: 'Launch Now', callback: () => libraryView.triggerPlay(evt.gameId) },
        { label: 'Show in App', callback: () => window.navigateTo('library') },
      ])
      refreshLibrary()
    }
  })
}
