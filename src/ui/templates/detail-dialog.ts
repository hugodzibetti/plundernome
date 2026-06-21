import { createDetailDialog } from '../factory'
import type { Game } from '../../domain/models'

export interface DetailDialogOptions {
  game: { name: string; sourceId: string; size?: string; description?: string; tags?: string[] }
  onDownload: () => void
  parent?: GtkWidget
}

export function showDetailDialog(opts: DetailDialogOptions): void {
  createDetailDialog({
    gameName: opts.game.name,
    gameInfo: `Source: ${opts.game.sourceId}${opts.game.size ? ` — ${opts.game.size}` : ''}`,
    description: opts.game.description,
    tags: opts.game.tags,
    onDownload: opts.onDownload,
    parent: opts.parent,
  })
}
