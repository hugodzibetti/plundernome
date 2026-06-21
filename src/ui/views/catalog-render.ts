import { GameCard } from '../widgets/game-card'
import type { Game } from '../../domain/models'
import { _t } from '../../domain/i18n'
import { createButton } from '../factory'

const { Gtk, Adw } = imports.gi

export function renderGamesToBoxes(
  games: Game[], flowBox: GtkFlowBox, listBox: GtkListBox,
  downloadHandler: ((gameId: string) => void) | null,
  detailHandler?: ((gameId: string) => void) | null,
  getCoverPath?: ((gameId: string) => string | undefined) | null,
  range?: { start: number; end: number },
  wishlistHandler?: ((gameId: string, wishlisted: boolean) => void) | null,
): void {
  let child: unknown = flowBox.get_child_at_index(0)
  while (child) { flowBox.remove(child); child = flowBox.get_child_at_index(0) }

  let row = listBox.get_first_child() as GtkWidget | null
  while (row) { const next = row.get_next_sibling(); listBox.remove(row); row = next as GtkWidget | null }

  const slice = range ? games.slice(range.start, range.end) : games

  for (const game of slice) {
    const coverPath = getCoverPath?.(game.id)
    const card = new GameCard(game, coverPath)
    card.connect('play-game', (_w: unknown, id: unknown) => downloadHandler?.(id as string))
    card.connect('show-detail', (_w: unknown, id: unknown) => detailHandler?.(id as string))
    if (wishlistHandler) card.onToggleWishlist((id, wl) => wishlistHandler(id, wl))
    flowBox.append(card)

    const listRow = new Adw.ActionRow({ title: game.name, subtitle: game.size })
    listRow.connect('activated', () => downloadHandler?.(game.id))
    const dlBtn = createButton({ iconName: 'folder-download-symbolic', tooltip: _t('common.download'), onClick: () => downloadHandler?.(game.id) })
    listRow.add_suffix(dlBtn)
    const sourceLabel = new Gtk.Label({ label: game.sourceId })
    sourceLabel.add_css_class('badge')
    listRow.add_suffix(sourceLabel)
    listBox.append(listRow)
  }
}
