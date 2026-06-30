import type { Game } from '../../domain/models'
import type { IDiscoverView } from '../../controller/view-interfaces'
import { createButton } from '../factory'
import { createGridContent } from '../templates'

const { Gtk, Adw, GObject } = imports.gi

export const DiscoverView = GObject.registerClass({
  GTypeName: 'DiscoverView',
}, class DiscoverView extends Adw.Bin implements IDiscoverView {
  private featuredBox: GtkBox
  private trendingGrid: GtkFlowBox
  private categoriesBox: GtkFlowBox
  private categorySection: GtkBox
  private categoryLabel: GtkLabel
  private categoryGrid: GtkFlowBox
  private trendingLabel: GtkLabel
  private trendingGridContainer: GtkBox
  private downloadCb: ((gameId: string) => void) | null = null
  private selectCategoryCb: ((tag: string) => void) | null = null

  constructor() {
    super()
    this.add_css_class('discover-view')

    const container = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
    const clamp = new Adw.ClampScrollable()
    clamp.add_css_class('discover-scroll')
    clamp.set_child(container)

    const heroLabel = new Gtk.Label({ label: 'New & Notable', xalign: 0, css_classes: ['discover-section-title'] })
    container.append(heroLabel)

    this.featuredBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8, halign: Gtk.Align.FILL })
    this.featuredBox.add_css_class('discover-hero')
    container.append(this.featuredBox)

    const catLabel = new Gtk.Label({ label: 'Categories', xalign: 0, css_classes: ['discover-section-title'] })
    container.append(catLabel)

    this.categoriesBox = new Gtk.FlowBox()
    this.categoriesBox.set_max_children_per_line(8)
    this.categoriesBox.set_min_children_per_line(1)
    this.categoriesBox.set_selection_mode(Gtk.SelectionMode.NONE)
    this.categoriesBox.set_halign(Gtk.Align.START)
    this.categoriesBox.add_css_class('discover-categories')
    container.append(this.categoriesBox)

    this.trendingLabel = new Gtk.Label({ label: 'Trending', xalign: 0, css_classes: ['discover-section-title'] })
    container.append(this.trendingLabel)

    this.trendingGridContainer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
    this.trendingGrid = createGridContent()
    this.trendingGrid.add_css_class('discover-trending')
    this.trendingGridContainer.append(this.trendingGrid)
    container.append(this.trendingGridContainer)

    this.categorySection = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8, visible: false })
    this.categoryLabel = new Gtk.Label({ xalign: 0, css_classes: ['discover-section-title'] })
    this.categorySection.append(this.categoryLabel)

    const backBtn = createButton({ label: '← Back to Trending', onClick: () => { this.categorySection.set_visible(false); this.trendingLabel.set_visible(true); this.trendingGridContainer.set_visible(true) } })
    backBtn.add_css_class('flat')
    this.categorySection.append(backBtn)

    this.categoryGrid = createGridContent()
    this.categorySection.append(this.categoryGrid)
    container.append(this.categorySection)

    this.set_child(clamp)
  }

  private clearContainer(widget: GtkWidget): void {
    let child = widget.get_first_child() as GtkWidget | null
    while (child) { const next = child.get_next_sibling() as GtkWidget | null; (widget as GtkContainer).remove(child); child = next }
  }

  setFeatured(games: Game[]): void {
    this.clearContainer(this.featuredBox)
    for (const g of games.slice(0, 5)) {
      const card = createDiscoverCard(g, () => this.downloadCb?.(g.id), true)
      this.featuredBox.append(card)
    }
  }

  setTrending(games: Game[]): void {
    this.clearContainer(this.trendingGrid)
    for (const g of games.slice(0, 24)) {
      const card = createDiscoverCard(g, () => this.downloadCb?.(g.id), false)
      this.trendingGrid.append(card)
    }
  }

  setCategories(tags: string[]): void {
    this.clearContainer(this.categoriesBox)
    for (const tag of tags) {
      const btn = new Gtk.ToggleButton({ label: tag, css_classes: ['category-chip', 'flat'] })
      btn.connect('toggled', () => {
        if (btn.get_active()) {
          this.selectCategoryCb?.(tag)
          this.categoryLabel.set_label(tag)
          this.categorySection.set_visible(true)
          this.trendingLabel.set_visible(false)
          this.trendingGridContainer.set_visible(false)
        }
      })
      this.categoriesBox.append(btn)
    }
  }

  setCategory(tag: string, games: Game[]): void {
    this.clearContainer(this.categoryGrid)
    for (const g of games) {
      const card = createDiscoverCard(g, () => this.downloadCb?.(g.id), false)
      this.categoryGrid.append(card)
    }
  }

  onDownloadGame(cb: (gameId: string) => void): void { this.downloadCb = cb }
  onSelectCategory(cb: (tag: string) => void): void { this.selectCategoryCb = cb }
})

function createDiscoverCard(game: Game, onClick: () => void, featured: boolean): GtkWidget {
  const card = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4, css_classes: ['discover-card'] })
  card.set_size_request(featured ? 200 : 180, featured ? 220 : 200)
  card.set_halign(Gtk.Align.START)

  const pic = new Gtk.Picture()
  pic.set_content_fit(Gtk.ContentFit.COVER)
  pic.set_size_request(featured ? 200 : 180, featured ? 160 : 140)
  pic.add_css_class('discover-card-cover')
  if (game.imageUrl) {
    try { pic.set_filename(game.imageUrl) } catch {}
  }
  card.append(pic)

  const nameLbl = new Gtk.Label({ label: game.name, xalign: 0, wrap: true, max_width_chars: 20, css_classes: ['discover-card-name'] })
  card.append(nameLbl)

  const sourceLbl = new Gtk.Label({ label: game.sourceId, xalign: 0, css_classes: ['discover-card-source', 'dim-label'] })
  card.append(sourceLbl)

  const gesture = new Gtk.GestureClick()
  gesture.connect('released', () => onClick())
  card.add_controller(gesture)

  return card
}
