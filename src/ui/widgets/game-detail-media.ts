import { ensureCached } from '../../services/cover/cover-cache'
import { createScrollContent } from '../templates/scroll-content'

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

  const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 })
  row.add_css_class('game-detail-screenshots-row')

  for (const url of screenshots) {
    const pic = new Gtk.Picture()
    pic.set_content_fit(Gtk.ContentFit.COVER)
    pic.add_css_class('game-detail-screenshot')
    row.append(pic)
    ensureCached(gameId, url).then(path => { if (path) pic.set_filename(path) })
  }

  section.append(createScrollContent(row, { direction: 'horizontal', maxHeight: 200 }))

  return section
}
