const { Gtk, Adw } = imports.gi

export function createScrollContent(child: GtkWidget): AdwClampScrollable {
  const clamp = new Adw.ClampScrollable()
  clamp.set_vexpand(true)
  clamp.add_css_class('templates-scroll')
  const vp = new Gtk.Viewport()
  vp.set_child(child)
  clamp.set_child(vp)
  return clamp
}
