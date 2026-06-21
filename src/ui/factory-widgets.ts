import { _t } from '../domain/i18n';
import { createButton } from './factory';

const { Gtk, Adw } = imports.gi;

export function createEntryRow(props: {
  title: string;
  subtitle?: string;
  value: string;
  placeholder?: string;
  browseLabel?: string;
  onChanged?: (text: string) => void;
  onBrowse?: () => void;
}): AdwActionRow {
  const entryProps: Record<string, unknown> = { text: props.value };
  if (props.placeholder) entryProps.placeholder_text = props.placeholder;
  const entry = new Gtk.Entry(entryProps);
  entry.set_hexpand(true);
  const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
  box.add_css_class('entry-row-box');
  box.append(entry);
  if (props.browseLabel) {
    const browseBtn = createButton({ label: props.browseLabel, cssClass: 'flat', onClick: () => props.onBrowse?.() });
    box.append(browseBtn);
  }
  const rowProps: Record<string, unknown> = { title: props.title };
  if (props.subtitle) rowProps.subtitle = props.subtitle;
  const row = new Adw.ActionRow(rowProps);
  row.add_suffix(box);
  row.set_activatable_widget(box);
  if (props.onChanged) {
    entry.connect('changed', () => props.onChanged!(entry.get_text()));
  }
  return row;
}

export function createSpinRow(props: {
  title: string;
  subtitle?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChanged?: (value: number) => void;
}): AdwActionRow {
  const adj = new Gtk.Adjustment({
    lower: props.min,
    upper: props.max,
    step_increment: props.step ?? 1,
    value: props.value,
  });
  const spin = new Gtk.SpinButton({ adjustment: adj, numeric: true });
  const rowProps: Record<string, unknown> = { title: props.title };
  if (props.subtitle) rowProps.subtitle = props.subtitle;
  const row = new Adw.ActionRow(rowProps);
  row.add_suffix(spin);
  row.set_activatable_widget(spin);
  if (props.onChanged) {
    spin.connect('value-changed', () => props.onChanged!(spin.get_value()));
  }
  return row;
}

export function createDetailDialog(props: {
  gameName: string;
  gameInfo: string;
  description?: string;
  tags?: string[];
  downloadLabel?: string;
  onDownload: () => void;
  parent?: GtkWidget;
}): void {
  let body = props.gameInfo;
  if (props.description) body += '\n\n' + props.description;
  if (props.tags && props.tags.length > 0) body += '\n\nTags: ' + props.tags.join(', ');
  const dialogProps: Record<string, unknown> = { heading: props.gameName, body, close_response: 'cancel' };
  if (props.parent) dialogProps.transient_for = props.parent;
  const dialog = new Adw.MessageDialog(dialogProps);
  dialog.add_response('cancel', _t('common.cancel'));
  dialog.add_response('download', props.downloadLabel ?? _t('common.download'));
  dialog.set_response_appearance('download', Adw.ResponseAppearance.SUGGESTED);
  dialog.connect('response', (_d: unknown, resp: string) => {
    if (resp === 'download') props.onDownload();
    dialog.destroy();
  });
  dialog.present();
}

export function createCoverImage(props: {
  filename?: string;
  width?: number;
  height?: number;
  cssClass?: string;
}): GtkPicture {
  const w = props.width ?? 200;
  const h = props.height ?? 128;
  const picProps: Record<string, unknown> = { content_fit: Gtk.ContentFit.COVER };
  if (props.filename) picProps.filename = props.filename;
  const pic = new Gtk.Picture(picProps);
  if (w === 200 && h === 128) {
    pic.add_css_class('sizing-cover-pic');
  } else {
    pic.set_size_request(w, h);
  }
  if (props.cssClass) pic.add_css_class(props.cssClass);
  return pic;
}

export function createMenuPopover(
  items: Array<{
    label: string;
    onClick: () => void;
  }>,
  parent: GtkWidget,
): GtkPopoverMenu {
  const popover = new Gtk.PopoverMenu();
  popover.add_css_class('menu-popover');
  const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
  box.add_css_class('menu-popover-box');
  for (const item of items) {
    const btn = createButton({
      label: item.label,
      cssClass: 'flat',
      onClick: () => {
        item.onClick();
        popover.popdown();
      },
    });
    box.append(btn);
  }
  popover.set_child(box);
  popover.set_parent(parent);
  return popover;
}
