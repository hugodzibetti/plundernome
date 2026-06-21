const { Gtk, GLib, Gio } = imports.gi

export function loadAppCss(display: GdkDisplay): void {
  const cssFiles = ['src/ui/style.css', 'src/ui/style-states.css']
  for (const file of cssFiles) {
    const provider = new Gtk.CssProvider()
    const cssPaths = [
      GLib.build_filenamev([GLib.get_current_dir(), file]),
      `/app/share/plundernome/${file}`,
      GLib.build_filenamev([GLib.get_user_data_dir(), `plundernome/${file}`]),
    ]
    for (const p of cssPaths) {
      const f = Gio.File.new_for_path(p)
      if (f.query_exists(null)) { provider.load_from_file(f); break }
    }
    Gtk.StyleContext.add_provider_for_display(display, provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
  }
}
