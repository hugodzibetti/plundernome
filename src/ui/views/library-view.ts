import type { ILibraryEntry } from '../../controller/view-interfaces'
import { createButton } from '../factory'
import { buildEmptyState } from '../templates/empty-state'
import { createScrollContent } from '../templates/scroll-content'
import { createGridContent } from '../templates'

const { Gtk, Adw, GObject } = imports.gi

export const LibraryView = GObject.registerClass(
  { GTypeName: 'LibraryView' },
  class LibraryView extends Adw.Bin {
    private flowBox: GtkFlowBox
    private stack: GtkStack
    private playHandler: ((gameId: string) => void) | null = null
    private removeHandler: ((gameId: string) => void) | null = null
    private launchOptionsHandler: ((gameId: string) => void) | null = null
    private openCatalogHandler: (() => void) | null = null

    constructor() {
      super()
      this.add_css_class('library-view')

      this.flowBox = createGridContent()
      this.flowBox.add_css_class('library-flowbox')

      const clamp = createScrollContent(this.flowBox, { expand: true })

      const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
      content.append(clamp)
      content.add_css_class('library-content')

      const emptyPage = buildEmptyState({
        icon: '📚',
        title: 'No games installed',
        description: 'Browse the catalog to find games to install',
        actionLabel: 'Browse Catalog',
        onAction: () => this.openCatalogHandler?.(),
      })

      this.stack = new Gtk.Stack()
      this.stack.set_vexpand(true)
      this.stack.add_named(content, 'content')
      this.stack.add_named(emptyPage, 'empty')
      this.stack.set_visible_child_name('empty')
      this.set_child(this.stack)
    }

    setGames(entries: ILibraryEntry[]): void {
      let child: unknown = this.flowBox.get_child_at_index(0)
      while (child) { this.flowBox.remove(child); child = this.flowBox.get_child_at_index(0) }

      if (entries.length === 0) {
        this.stack.set_visible_child_name('empty')
        return
      }

      for (const entry of entries) this.flowBox.append(this.buildCard(entry))
      this.stack.set_visible_child_name('content')
    }

    private buildCard(entry: ILibraryEntry): GtkWidget {
      const { game } = entry
      const card = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 })
      card.add_css_class('library-card')

      const cover = new Gtk.Box()
      cover.add_css_class('library-card-cover')
      cover.add_css_class('sizing-cover-lg')
      cover.set_halign(Gtk.Align.CENTER)
      const emoji = new Gtk.Label({ label: '🎮' })
      emoji.add_css_class('library-card-emoji')
      cover.append(emoji)

      const title = new Gtk.Label({ label: game.name, xalign: 0 })
      title.add_css_class('library-card-title')
      title.set_ellipsize(3)
      card.append(cover)
      card.append(title)

      const actions = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 })
      actions.add_css_class('library-card-actions')
      actions.append(createButton({
        iconName: 'media-playback-start-symbolic',
        tooltip: 'Play',
        onClick: () => this.playHandler?.(game.id),
      }))
      actions.append(createButton({
        iconName: 'user-trash-symbolic',
        tooltip: 'Remove',
        onClick: () => this.removeHandler?.(game.id),
      }))
      actions.append(createButton({
        iconName: 'preferences-system-symbolic',
        tooltip: 'Launch options',
        onClick: () => this.launchOptionsHandler?.(game.id),
      }))
      card.append(actions)

      return card
    }

    onPlayGame(cb: (gameId: string) => void): void { this.playHandler = cb }
    onRemoveGame(cb: (gameId: string) => void): void { this.removeHandler = cb }
    onLaunchOptions(cb: (gameId: string) => void): void { this.launchOptionsHandler = cb }
    onOpenCatalog(cb: () => void): void { this.openCatalogHandler = cb }
  },
)
