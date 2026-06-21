import type { Game, CompatProfile } from '../domain/models'
import { _t } from '../domain/i18n'
import { createButton } from './factory'

const { Adw, Gtk } = imports.gi

export function showGameDetail(game: Game, compat?: CompatProfile, parent?: GtkWidget, onDownload?: (id: string) => void): void {
  const btn = createButton({
    label: _t('common.download'),
    cssClass: 'suggested-action',
    onClick: () => { onDownload?.(game.id) },
  })

  const dialog = new Adw.MessageDialog({
    heading: game.name,
    body: `${game.sourceId} — ${game.size || _t('common.unknown-size')}${compat ? ' | ' + compat.launcherType : ''}`,
    close_response: 'cancel',
    transient_for: parent,
  })
  dialog.add_response('cancel', _t('common.close'))
  dialog.add_response('download', _t('common.download'))
  dialog.set_response_appearance('download', Adw.ResponseAppearance.SUGGESTED)
  dialog.set_extra_child(btn)

  dialog.connect('response', (_d: unknown, resp: string) => {
    if (resp === 'download') onDownload?.(game.id)
    dialog.destroy()
  })
  dialog.present()
}

export { showGameDetail as GameDetailDialog }
