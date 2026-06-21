import { createButton } from '../factory';

const { Gtk } = imports.gi;

export interface EmptyStateOptions {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function buildEmptyState(opts: EmptyStateOptions): GtkBox {
  const icon = new Gtk.Label({ label: opts.icon });
  icon.add_css_class('empty-icon');

  const title = new Gtk.Label({ label: opts.title, xalign: 0 });
  title.add_css_class('empty-title');

  const desc = new Gtk.Label({ label: opts.description, xalign: 0, wrap: true });
  desc.add_css_class('empty-desc');

  const page = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 12,
    halign: Gtk.Align.CENTER,
    valign: Gtk.Align.CENTER,
  });
  page.add_css_class('empty-state');
  page.append(icon);
  page.append(title);
  page.append(desc);

  if (opts.actionLabel && opts.onAction) {
    page.append(createButton({ label: opts.actionLabel, cssClass: 'suggested-action', onClick: opts.onAction }));
  }

  return page;
}
