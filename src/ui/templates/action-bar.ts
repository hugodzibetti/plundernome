const { Gtk } = imports.gi

export function createActionBar(buttons?: GtkWidget[]): GtkBox {
  const bar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 })
  bar.set_halign(Gtk.Align.START)
  bar.set_valign(Gtk.Align.CENTER)
  bar.add_css_class('action-bar')
  if (buttons) {
    for (const btn of buttons) {
      bar.append(btn)
    }
  }
  return bar
}
