const { Gtk } = imports.gi

export function createListContent(children?: GtkWidget[]): GtkListBox {
  const lb = new Gtk.ListBox({ css_classes: ['boxed-list', 'catalog-list'] })
  lb.add_css_class('templates-list')
  if (children) {
    for (const child of children) {
      lb.append(child)
    }
  }
  return lb
}
