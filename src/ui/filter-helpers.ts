const { Gtk } = imports.gi

export function buildJsonFilter(): GtkFileFilter {
  const f = new Gtk.FileFilter()
  f.set_name('JSON Files (*.json)')
  f.add_pattern('*.json')
  return f
}
