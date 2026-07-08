import type { UserFacingError } from '../../domain/error-messages'

const { Adw, Gtk } = imports.gi

export function showPipelineErrorDialog(
  parent: GtkWidget,
  gameName: string,
  error: UserFacingError,
  onAction: (action: string) => void,
): void {
  const dialog = new Adw.AlertDialog({
    heading: error.title,
    body: `${gameName}\n\n${error.description}`,
  })
  dialog.add_css_class('pipeline-error-dialog')
  if (error.primaryAction) {
    dialog.add_response(error.primaryAction.action, error.primaryAction.label)
    dialog.set_response_appearance(error.primaryAction.action, Adw.ResponseAppearance.SUGGESTED)
  }
  if (error.secondaryAction) {
    dialog.add_response(error.secondaryAction.action, error.secondaryAction.label)
  }
  dialog.add_response('dismiss', 'Dismiss')
  dialog.connect('response', (_d: unknown, responseId: string) => {
    if (responseId !== 'dismiss') onAction(responseId)
  })
  dialog.present(parent)
}
