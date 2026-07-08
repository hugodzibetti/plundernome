const { Gtk, Adw } = imports.gi;

// Overload signatures
export function createScrollContent(
  child: GtkWidget,
  opts: { direction: 'horizontal'; maxHeight?: number },
): GtkScrolledWindow;
export function createScrollContent(
  child: GtkWidget,
  opts?: { maxHeight?: number; expand?: boolean },
): AdwClampScrollable;

// Implementation
export function createScrollContent(
  child: GtkWidget,
  opts?: { maxHeight?: number; expand?: boolean; direction?: 'vertical' | 'horizontal' },
): GtkWidget {
  // For horizontal scrolling (e.g., screenshot strip), use ScrolledWindow
  if (opts?.direction === 'horizontal') {
    const scroll = new Gtk.ScrolledWindow({
      hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
      vscrollbar_policy: Gtk.PolicyType.NEVER,
      propagate_natural_width: true,
      propagate_natural_height: true,
    });
    scroll.add_css_class('templates-scroll');
    if (opts?.maxHeight) scroll.set_size_request(0, opts.maxHeight);
    scroll.set_child(child);
    return scroll;
  }

  // Default vertical scrolling with Adw.ClampScrollable
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
