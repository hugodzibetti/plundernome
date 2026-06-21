import { _t } from '../domain/i18n';
import { createButton } from './factory';

const { Adw, Gtk, Gdk } = imports.gi;

export interface ErrorDialogOptions {
  parent: GtkWidget;
  title: string;
  message: string;
  stackTrace?: string;
  onRetry?: () => void;
  onMirrorRetry?: () => void;
  gameId?: string;
}

export function showRetryWithMirrorDialog(
  parent: GtkWidget,
  gameId: string,
  currentUrl: string,
  mirrors: string[],
  onRetry: () => void,
): void {
  const remaining = mirrors.length;
  const body = _t('error.retry-mirror-body').replace('{url}', currentUrl).replace('{count}', String(remaining));
  const dialogProps: Record<string, unknown> = {
    heading: _t('error.download-failed'),
    body,
    transient_for: parent,
    close_response: 'cancel',
  };
  const dialog = new Adw.MessageDialog(dialogProps);
  dialog.add_css_class('error-dialog');
  dialog.add_response('cancel', _t('common.cancel'));
  dialog.add_response('retry', _t('error.retry-mirror'));
  dialog.set_response_appearance('retry', Adw.ResponseAppearance.SUGGESTED);
  dialog.connect('response', (_d: unknown, response: string) => {
    if (response === 'retry') {
      onRetry();
    }
  });
  dialog.present();
}

export function showErrorDialog(opts: ErrorDialogOptions): void {
  const { parent, title, message, stackTrace, onRetry, onMirrorRetry, gameId } = opts;

  const body = message;

  const dialogProps: Record<string, unknown> = {
    heading: title,
    body,
    transient_for: parent,
    close_response: 'ok',
  };
  const dialog = new Adw.MessageDialog(dialogProps);
  dialog.add_css_class('error-dialog');
  dialog.add_response('ok', _t('common.ok'));

  const actions = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, halign: Gtk.Align.END });
  actions.add_css_class('error-dialog-actions');

  if (onRetry) {
    const retryBtn = createButton({
      label: _t('error.retry-step'),
      cssClass: 'error-retry-btn',
      onClick: () => {
        dialog.close();
        onRetry();
      },
    });
    actions.append(retryBtn);
  }
  if (onMirrorRetry) {
    const mirBtn = createButton({
      label: _t('error.try-mirror'),
      cssClass: 'error-mirror-btn',
      onClick: () => {
        dialog.close();
        onMirrorRetry();
      },
    });
    actions.append(mirBtn);
  }

  const reportBtn = createButton({
    label: _t('error.report'),
    cssClass: 'error-report-btn',
    onClick: () => {
      const display = Gdk.Display.get_default();
      if (display) {
        Gtk.show_uri(display, 'https://github.com/anomalyco/plundernome/issues/new', Gdk.CURRENT_TIME);
      }
    },
  });
  actions.append(reportBtn);

  const copyBtn = createButton({
    label: _t('error.copy-details'),
    cssClass: 'error-copy-btn',
    onClick: () => {
      const clipboard = Gdk.Display.get_default()?.get_clipboard();
      if (clipboard) {
        const detail = `[Plundernome Error]\nTitle: ${title}\nMessage: ${message}${gameId ? `\nGame ID: ${gameId}` : ''}${stackTrace ? `\n\nStack:\n${stackTrace}` : ''}`;
        clipboard.set_text(detail);
      }
    },
  });
  actions.append(copyBtn);

  const extraContent = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
  extraContent.append(actions);

  if (stackTrace) {
    const expander = new Gtk.Expander({ label: _t('error.stack-trace'), expanded: false });
    expander.add_css_class('error-stack-expander');
    const clamp = new Adw.ClampScrollable();
    clamp.add_css_class('error-stack-clamp');
    clamp.set_maximum_size(480);
    const stackLabel = new Gtk.Label({
      label: stackTrace,
      selectable: true,
      wrap: true,
      xalign: 0,
      yalign: 0,
    });
    stackLabel.add_css_class('error-stack-trace');
    clamp.set_child(stackLabel);
    expander.set_child(clamp);
    extraContent.append(expander);
  }

  dialog.set_extra_child(extraContent);
  dialog.present();
}
