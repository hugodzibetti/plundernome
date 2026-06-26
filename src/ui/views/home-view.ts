import type { Game } from '../../domain/models'
import { _t } from '../../domain/i18n'
import { createButton, createActionRow } from '../factory'
import { createScrollContent } from '../templates/scroll-content'
import { buildEmptyState } from '../templates/empty-state'
import { GameCard } from '../widgets/game-card'

const { Gtk, Adw, GObject } = imports.gi

export interface HomeSection {
  title: string
  games: Game[]
}

export const HomeView = GObject.registerClass(
  { GTypeName: 'HomeView' },
  class HomeView extends Adw.Bin {
    private continueBox!: GtkFlowBox
    private recentBox!: GtkFlowBox
    private trendingBox!: GtkFlowBox
    private mainStack!: GtkStack
    private rootBox!: GtkBox
    private dlHandler: ((gameId: string) => void) | null = null
    private navHandlers: Record<string, () => void> = {}

    constructor() {
      super()
      this.add_css_class('home-view')

      this.rootBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 16 })
      this.rootBox.add_css_class('home-content')

      this.rootBox.append(this.buildHeader())
      this.rootBox.append(this.buildQuickActions())
      this.rootBox.append(this.buildContinueSection())
      this.rootBox.append(this.buildRecentSection())
      this.rootBox.append(this.buildTrendingSection())

      const clamp = createScrollContent(this.rootBox, { expand: true })

      const empty = buildEmptyState({
        icon: '🎮',
        title: 'Welcome to Plundernome',
        description: 'Browse the catalog to find games to download and play',
        actionLabel: _t('home.browse-catalog'),
        onAction: () => this.navHandlers['catalog']?.(),
      })

      this.mainStack = new Gtk.Stack()
      this.mainStack.set_vexpand(true)
      this.mainStack.add_named(clamp, 'content')
      this.mainStack.add_named(empty, 'empty')
      this.mainStack.set_visible_child_name('empty')
      this.set_child(this.mainStack)
    }

    private buildHeader(): GtkWidget {
      const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 })
      box.add_css_class('home-header')
      const title = new Gtk.Label({ label: _t('home.welcome'), xalign: 0 })
      title.add_css_class('home-title')
      title.set_hexpand(true)
      box.append(title)
      return box
    }

    private buildQuickActions(): GtkWidget {
      const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 })
      box.add_css_class('home-actions')
      box.append(createButton({ iconName: 'package-x-generic-symbolic', label: _t('home.browse-catalog'), cssClass: 'flat', onClick: () => this.navHandlers['catalog']?.() }))
      box.append(createButton({ iconName: 'emblem-library-symbolic', label: _t('home.view-library'), cssClass: 'flat', onClick: () => this.navHandlers['library']?.() }))
      box.append(createButton({ iconName: 'folder-download-symbolic', label: _t('home.view-downloads'), cssClass: 'flat', onClick: () => this.navHandlers['downloads']?.() }))
      box.append(createButton({ iconName: 'preferences-system-symbolic', label: _t('home.open-settings'), cssClass: 'flat', onClick: () => this.navHandlers['settings']?.() }))
      return box
    }

    private buildContinueSection(): GtkWidget {
      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
      box.add_css_class('home-section')
      const label = new Gtk.Label({ label: _t('home.continue-playing'), xalign: 0 })
      label.add_css_class('home-section-title')
      box.append(label)
      this.continueBox = new Gtk.FlowBox()
      this.continueBox.set_max_children_per_line(4)
      this.continueBox.set_min_children_per_line(1)
      this.continueBox.set_homogeneous(true)
      this.continueBox.set_selection_mode(Gtk.SelectionMode.NONE)
      box.append(this.continueBox)
      return box
    }

    private buildRecentSection(): GtkWidget {
      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
      box.add_css_class('home-section')
      const label = new Gtk.Label({ label: _t('home.recently-added'), xalign: 0 })
      label.add_css_class('home-section-title')
      box.append(label)
      this.recentBox = new Gtk.FlowBox()
      this.recentBox.set_max_children_per_line(4)
      this.recentBox.set_min_children_per_line(1)
      this.recentBox.set_homogeneous(true)
      this.recentBox.set_selection_mode(Gtk.SelectionMode.NONE)
      box.append(this.recentBox)
      return box
    }

    private buildTrendingSection(): GtkWidget {
      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
      box.add_css_class('home-section')
      const label = new Gtk.Label({ label: _t('home.trending'), xalign: 0 })
      label.add_css_class('home-section-title')
      box.append(label)
      this.trendingBox = new Gtk.FlowBox()
      this.trendingBox.set_max_children_per_line(4)
      this.trendingBox.set_min_children_per_line(1)
      this.trendingBox.set_homogeneous(true)
      this.trendingBox.set_selection_mode(Gtk.SelectionMode.NONE)
      box.append(this.trendingBox)
      return box
    }

    private fillFlowBox(box: GtkFlowBox, games: Game[]): void {
      let child: unknown = box.get_child_at_index(0)
      while (child) { box.remove(child); child = box.get_child_at_index(0) }
      for (const game of games) {
        const card = new GameCard(game)
        card.connect('play-game', (_w: unknown, id: unknown) => this.dlHandler?.(id as string))
        box.append(card)
      }
    }

    setContinuePlaying(games: Game[]): void {
      this.fillFlowBox(this.continueBox, games)
      this.updateVisibility()
    }

    setRecentlyAdded(games: Game[]): void {
      this.fillFlowBox(this.recentBox, games)
      this.updateVisibility()
    }

    setTrending(games: Game[]): void {
      this.fillFlowBox(this.trendingBox, games)
      this.updateVisibility()
    }

    private updateVisibility(): void {
      const hasContent = this.continueBox.get_child_at_index(0) !== null ||
        this.recentBox.get_child_at_index(0) !== null ||
        this.trendingBox.get_child_at_index(0) !== null
      this.mainStack.set_visible_child_name(hasContent ? 'content' : 'empty')
    }

    onDownloadGame(cb: (gameId: string) => void): void { this.dlHandler = cb }
    onNavigate(viewId: string, cb: () => void): void { this.navHandlers[viewId] = cb }
  },
)
