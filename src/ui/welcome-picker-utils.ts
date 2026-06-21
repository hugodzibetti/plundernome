const { Gtk } = imports.gi

export function pickFileOrDir(
  parent: GtkWidget,
  action: number,
  title: string,
  onSelect: (path: string) => void,
): void {
  const picker = new Gtk.FileChooserNative({
    action, title,
    transient_for: parent,
  })
  picker.connect('response', (_d: unknown, response: number) => {
    if (response === Gtk.ResponseType.ACCEPT) {
      const file = picker.get_file()
      if (file) onSelect(file.get_path() ?? '')
    }
  })
  picker.present()
}
