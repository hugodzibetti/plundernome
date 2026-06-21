const { Gtk, Adw } = imports.gi;

export function createScrollContent(
  child: GtkWidget,
  opts?: { maxHeight?: number; expand?: boolean },
): AdwClampScrollable {
  const clamp = new Adw.ClampScrollable();
  clamp.add_css_class('templates-scroll');
  if (opts?.expand) clamp.set_vexpand(true);
  if (opts?.maxHeight) {
    const prov = new Gtk.CssProvider();
    prov.load_from_string(`.templates-scroll { max-height: ${opts.maxHeight}px; }`);
    clamp.get_style_context().add_provider(prov, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
  }
  clamp.set_child(child);
  return clamp;
}
