import type { IDialogService, ILaunchOptionsEditor } from '../controller/types-dialog'
import type { Game, GameID } from '../domain/models'
import { showErrorDialog } from './error-dialog'
import { showLaunchOptionsEditor } from './widgets/launch-options-editor'

const { Gtk, Adw } = imports.gi

export class DialogServiceImpl implements IDialogService {
  private parent: GtkWidget | null = null

  setParent(widget: GtkWidget): void {
    this.parent = widget
  }

  showError(title: string, message: string): void {
    showErrorDialog({
      parent: this.parent as GtkWidget,
      title,
      message,
    })
  }

  showRetryWithMirrorDialog(
    title: string,
    message: string,
    mirrors: string[],
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const dialogProps: Record<string, unknown> = {
        heading: title,
        body: message,
        close_response: 'cancel',
      }
      if (this.parent) dialogProps.transient_for = this.parent
      const dialog = new Adw.MessageDialog(dialogProps)
      dialog.add_css_class('mirror-select-dialog')

      const list = new Gtk.StringList()
      for (const m of mirrors) list.append(m)
      const dropdownProps: Record<string, unknown> = {
        model: list,
        selected: 0,
      }
      const dropdown = new Gtk.DropDown(dropdownProps)
      dropdown.add_css_class('mirror-dropdown')

      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
      box.append(dropdown)
      dialog.set_extra_child(box)

      dialog.add_response('cancel', 'Cancel')
      dialog.add_response('retry', 'Retry')
      dialog.set_response_appearance('retry', Adw.ResponseAppearance.SUGGESTED)

      dialog.connect('response', (_d: unknown, response: string) => {
        if (response === 'retry') {
          const idx = dropdown.get_selected()
          resolve(mirrors[idx] ?? null)
        } else {
          resolve(null)
        }
        dialog.close()
      })
      dialog.present()
    })
  }
}

export class LaunchOptionsEditorImpl implements ILaunchOptionsEditor {
  show(game: Game, options: { env: Record<string, string>; args: string }, onSave: (gameId: GameID, env: Record<string, string>, args: string) => void): void {
    showLaunchOptionsEditor(game.id, options.env, options.args, onSave)
  }
}
