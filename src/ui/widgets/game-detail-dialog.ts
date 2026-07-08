import type { Game } from '../../domain/models'
import type { EnrichedMetadata } from '../../services/metadata/metadata-provider'
import { createHeroSection } from './game-detail-hero'
import { createScreenshotsSection } from './game-detail-media'
import { createDetailsSection } from './game-detail-meta'
import { createScrollContent } from '../templates/scroll-content'
import { createButton } from '../factory'

const { Gtk, Adw } = imports.gi

export function showGameDetailDialog(
  game: Game,
  enriched?: EnrichedMetadata | null,
  onDownload?: () => void,
  onWishlist?: () => void,
  sourceIds?: string[],
  protonRating?: string | null,
): void {
  const win = new Adw.Window({ modal: true, title: game.name, resizable: true, default_width: 650, default_height: 600 })
  win.add_css_class('game-detail-dialog')

  const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
  content.add_css_class('game-detail-content')
  content.set_margin_start(16)
  content.set_margin_end(16)
  content.set_margin_top(16)
  content.set_margin_bottom(16)

  // Hero — background, title, subtitle, action buttons
  const hero = createHeroSection(game, enriched, onDownload, onWishlist)
  content.append(hero)

  // Description
  const desc = enriched?.description ?? game.description
  if (desc) {
    const descLbl = new Gtk.Label({ label: desc, xalign: 0, wrap: true, selectable: true, max_width_chars: 72 })
    descLbl.add_css_class('game-detail-desc')
    content.append(descLbl)
  }

  // Screenshots carousel
  if (enriched?.screenshots?.length) {
    const ss = createScreenshotsSection(game.id, enriched.screenshots)
    if (ss) content.append(ss)
  }

  // Details — size, platform, proton rating, sources, tags, repack notes
  const details = createDetailsSection(game, enriched, sourceIds ?? [], protonRating)
  content.append(details)

  // Bottom row
  const bottomRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 })
  bottomRow.set_halign(Gtk.Align.END)
  bottomRow.append(createButton({ label: 'Close', onClick: () => win.close() }))
  content.append(bottomRow)

  win.set_content(createScrollContent(content, { expand: true }))
  win.present()
}
