const { Gtk, Adw } = imports.gi;

export function createScrollContent(
  child: GtkWidget,
  opts?: { maxHeight?: number; expand?: boolean },
): AdwClampScrollable {
  const vp = new Gtk.Viewport();
  vp.set_child(child);
  const clamp = new Adw.ClampScrollable();
  clamp.add_css_class('templates-scroll');
  if (opts?.expand) clamp.set_vexpand(true);
  if (opts?.maxHeight) {
    clamp.set_size_request(0, opts.maxHeight);
  }
  clamp.set_child(vp);
  return clamp;
}
