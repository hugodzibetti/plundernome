import { CompatBadge } from './compat-badge'
import type { Game, CompatProfile } from '../../domain/models'
import type { ProtonDBRating } from '../../services/protondb'
import { _t } from '../../domain/i18n'
import { createButton, createAlertDialog, createMenuPopover } from '../factory'

const { Gtk, Adw } = imports.gi

export function buildGameRow(
  game: Game & { installPath?: string }, profile: CompatProfile,
  playtime: number | undefined, launchOptionsHandler: (gameId: string) => void,
  playHandler: (gameId: string) => void, removeHandler: (gameId: string) => void,
  protonRating?: ProtonDBRating,
  addToAppMenuHandler?: (gameId: string) => void,
  removeFromAppMenuHandler?: (gameId: string) => void,
): AdwActionRow {
  const row = new Adw.ActionRow({ title: game.name })
  row.set_data('gameId', game.id)
  const pic = new Gtk.Picture()
  pic.set_size_request(48, 48); pic.add_css_class('library-cover')
  pic.set_content_fit(Gtk.ContentFit.COVER)
  if (game.imageUrl) pic.set_filename(game.imageUrl)
  row.add_prefix(pic)
  if (game.sourceId === 'imported') {
    const badge = new Gtk.Label({ label: _t('library.imported') })
    badge.add_css_class('badge'); row.add_suffix(badge)
  }
  const parts: string[] = []
  if (game.installPath) parts.push(game.installPath)
  if (playtime !== undefined && playtime > 0) {
    const h = Math.floor(playtime / 3600), m = Math.floor((playtime % 3600) / 60)
    parts.push(h > 0 ? `${h}h ${m}m` : `${m}m`)
  }
  if (parts.length > 0) row.set_subtitle(parts.join(' \u2014 '))
row.add_suffix(new CompatBadge(profile, protonRating))
  row.add_suffix(createButton({ iconName: 'settings-symbolic', tooltip: _t('library.launch-options'), onClick: () => launchOptionsHandler(game.id) }))
  row.add_suffix(createButton({ iconName: 'media-playback-start-symbolic', tooltip: _t('library.play'), cssClass: 'suggested-action', onClick: () => playHandler(game.id) }))
  const removeBtn = createButton({ iconName: 'user-trash-symbolic', tooltip: _t('library.remove'), cssClass: 'destructive-action', onClick: () => {
    const win = row.get_native()
    if (!win) { removeHandler(game.id); return }
    createAlertDialog({
      heading: _t('library.remove.confirm.title').replace('{0}', game.name), body: _t('library.remove.confirm.body'),
      confirmLabel: _t('library.remove'), confirmStyle: 'destructive',
      onConfirm: () => removeHandler(game.id),
      parent: win as GtkWidget,
    })
  }})
  row.add_suffix(removeBtn)
  if ((addToAppMenuHandler || removeFromAppMenuHandler) && game.installPath) {
    const gesture = new Gtk.GestureClick()
    gesture.set_button(3)
    gesture.connect('pressed', () => {
      const items: Array<{ label: string; onClick: () => void }> = []
      if (addToAppMenuHandler) items.push({ label: 'Add to Applications Menu', onClick: () => addToAppMenuHandler(game.id) })
      if (removeFromAppMenuHandler) items.push({ label: 'Remove from Applications Menu', onClick: () => removeFromAppMenuHandler(game.id) })
      const popover = createMenuPopover(items, row)
      popover.popup()
    })
    row.add_controller(gesture)
  }
  return row
}
