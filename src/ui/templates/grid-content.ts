const { Gtk } = imports.gi

export function createGridContent(children?: GtkWidget[], opts?: { maxPerLine?: number; minPerLine?: number }): GtkFlowBox {
  const fb = new Gtk.FlowBox()
  fb.set_max_children_per_line(opts?.maxPerLine ?? 4)
  fb.set_min_children_per_line(opts?.minPerLine ?? 2)
  fb.set_homogeneous(false)
  fb.set_selection_mode(Gtk.SelectionMode.NONE)
  fb.add_css_class('templates-grid')
  if (children) {
    for (const child of children) {
      child.set_halign(Gtk.Align.START)
      fb.append(child)
    }
  }
  return fb
}
