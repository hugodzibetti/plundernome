import type { Game } from '../../domain/models'
import type { EnrichedMetadata } from '../../services/metadata/metadata-provider'
import { createButton, createToggleButton } from '../factory'
import { ensureCached } from '../../services/cover/cover-cache'

const { Gtk } = imports.gi

export function createHeroSection(
  game: Game,
  enriched: EnrichedMetadata | null | undefined,
  onDownload?: () => void,
  onWishlist?: () => void,
): GtkBox {
  const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
  box.add_css_class('game-detail-hero')

  const heroUrl = enriched?.backgroundUrl ?? enriched?.coverUrl ?? game.imageUrl
  if (heroUrl) {
    const heroPic = new Gtk.Picture()
    heroPic.add_css_class('game-detail-hero-image')
    heroPic.set_content_fit(Gtk.ContentFit.COVER)
    heroPic.add_css_class('game-detail-hero-image-sizer')
    box.append(heroPic)
    ensureCached(game.id, heroUrl).then(path => { if (path) heroPic.set_filename(path) })
  }

  const titleRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 })
  const titleLbl = new Gtk.Label({ label: game.name, xalign: 0 })
  titleLbl.add_css_class('game-detail-title')
  titleLbl.set_hexpand(true)
  titleRow.append(titleLbl)
  if (onDownload) {
    titleRow.append(createButton({ label: 'Install', cssClass: 'suggested-action', onClick: onDownload }))
  }
  if (onWishlist) {
    titleRow.append(createToggleButton({ iconName: 'starred-symbolic', cssClass: 'flat', active: !!game.wishlisted, onToggle: () => onWishlist() }))
  }
  box.append(titleRow)

  const metaParts: string[] = []
  if (enriched?.developer) metaParts.push(enriched.developer)
  if (enriched?.publisher && enriched.publisher !== enriched.developer) metaParts.push(enriched.publisher)
  if (enriched?.releaseDate) {
    const year = enriched.releaseDate.split('-')[0]
    if (year) metaParts.push(year)
  }
  if (metaParts.length) {
    const subtitleLbl = new Gtk.Label({ label: metaParts.join('  ·  '), xalign: 0, wrap: false })
    subtitleLbl.add_css_class('game-detail-subtitle')
    box.append(subtitleLbl)
  }

  return box
}
