import { ensureCached } from '../../services/cover-cache'

const { Gtk } = imports.gi

export function createScreenshotsSection(
  gameId: string,
  screenshots: string[],
): GtkBox | null {
  if (!screenshots?.length) return null

  const section = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
  section.add_css_class('game-detail-screenshots-section')

  const heading = new Gtk.Label({ label: 'Screenshots', xalign: 0 })
  heading.add_css_class('game-detail-section-heading')
  section.append(heading)

  // horizontal image strip — ScrolledWindow correct here
  const scroll = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vscrollbar_policy: Gtk.PolicyType.NEVER,
    propagate_natural_width: true,
    propagate_natural_height: true,
  })
  scroll.add_css_class('game-detail-screenshots-scroll')

  const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 })
  row.add_css_class('game-detail-screenshots-row')

  for (const url of screenshots) {
    const pic = new Gtk.Picture()
    pic.set_content_fit(Gtk.ContentFit.COVER)
    pic.add_css_class('game-detail-screenshot')
    pic.set_size_request(284, 160)
    row.append(pic)
    ensureCached(gameId, url).then(path => { if (path) pic.set_filename(path) })
  }

  scroll.set_child(row)
  section.append(scroll)

  return section
}
