import type { Game } from '../../domain/models';
import { _t } from '../../domain/i18n';
import { createButton, createToggleButton, createMenuPopover } from '../factory';
import { createGameCardCover } from './game-card-cover';
import type { GameCardCoverWidget } from './game-card-cover';

const { Gtk, Adw, GObject } = imports.gi;

export function renderGameToBox(
  game: Game,
  flowBox: GtkFlowBox,
  listBox: GtkListBox,
  downloadHandler: ((gameId: string) => void) | null,
  detailHandler?: ((gameId: string) => void) | null,
  coverPath?: string,
  wishlistHandler?: ((gameId: string, wishlisted: boolean) => void) | null,
): void {
  const card = new GameCard(game, coverPath)
  const emitPlay = () => downloadHandler?.(game.id)
  card.connect('play-game', (_w: unknown, id: unknown) => downloadHandler?.(id as string))
  card.connect('show-detail', (_w: unknown, id: unknown) => detailHandler?.(id as string))
  if (wishlistHandler) card.onToggleWishlist((id, wl) => wishlistHandler(id, wl))
  flowBox.append(card)

  const listRow = new Adw.ActionRow({ title: game.name, subtitle: game.size })
  listRow.connect('activated', emitPlay)
  const dlBtn = createButton({ iconName: 'folder-download-symbolic', tooltip: _t('common.download'), onClick: emitPlay })
  listRow.add_suffix(dlBtn)
  const sourceLabel = new Gtk.Label({ label: game.sourceId })
  sourceLabel.add_css_class('badge')
  listRow.add_suffix(sourceLabel)
  listBox.append(listRow)
}

export const GameCard = GObject.registerClass(
  {
    GTypeName: 'GameCard',
    Signals: {
      'play-game': { param_types: [GObject.TYPE_STRING] },
      'show-detail': { param_types: [GObject.TYPE_STRING] },
      'toggle-wishlist': { param_types: [GObject.TYPE_STRING, GObject.TYPE_BOOLEAN] },
    },
  },
  class GameCard extends Adw.Bin {
    private game: Game;

    constructor(game: Game, coverPath?: string) {
      super();
      this.game = game;
      this.add_css_class('game-card');
      this.set_focusable(true);

      const overlay = new Gtk.Overlay();
      overlay.add_css_class('game-card-overlay');

      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
      box.add_css_class('game-card-content');

      const cover = createGameCardCover();
      box.append(cover.widget);

      if (coverPath) {
        cover.loadImmediate(coverPath);
      } else if (game.imageUrl) {
        cover.loadAsync(game.id, game.imageUrl);
      }

      const title = new Gtk.Label({ label: game.name, xalign: 0 });
      title.add_css_class('title');
      title.set_ellipsize(3);
      box.append(title);

      const subtitle = new Gtk.Label({ label: `${game.sourceId} — ${game.size}`, xalign: 0 });
      subtitle.add_css_class('subtitle');
      box.append(subtitle);

      if ('installed' in game && (game as Game & { installed: boolean }).installed) {
        const badge = new Gtk.Label({ label: _t('game-card.installed'), xalign: 0 });
        badge.add_css_class('compat-badge');
        badge.add_css_class('native');
        box.append(badge);
      }

      overlay.set_child(box);

      const wishBtn = createToggleButton({
        iconName: 'starred-symbolic',
        cssClass: 'wishlist-star flat action-button',
        active: !!game.wishlisted,
        onToggle: (active) => {
          if (active) wishBtn.add_css_class('wishlist-star-active');
          else wishBtn.remove_css_class('wishlist-star-active');
          this.emit('toggle-wishlist', game.id, active);
        },
      });
      wishBtn.set_valign(Gtk.Align.CENTER);
      wishBtn.set_halign(Gtk.Align.CENTER);
      wishBtn.set_tooltip_text(_t('game-card.toggle-wishlist'));
      overlay.add_overlay(wishBtn);

      this.set_child(overlay);

      const clickGesture = new Gtk.GestureClick();
      clickGesture.connect('pressed', (_self: unknown, nPress: number, _x: number, _y: number) => {
        if (nPress === 2) this.emit('play-game', game.id);
      });
      this.add_controller(clickGesture);

      const rightClickGesture = new Gtk.GestureClick();
      rightClickGesture.set_button(3);
      const popover = createMenuPopover(
        [
          { label: _t('game-card.add-to-queue'), onClick: () => this.emit('play-game', game.id) },
          { label: _t('game-card.view-details'), onClick: () => this.emit('show-detail', game.id) },
        ],
        this,
      );
      rightClickGesture.connect('pressed', (_c: unknown, _n: number, x: number, y: number) => {
        popover.set_pointing_to({ x, y, width: 1, height: 1 });
        popover.popup();
      });
      this.add_controller(rightClickGesture);
    }

    onToggleWishlist(cb: (gameId: string, wishlisted: boolean) => void): void {
      this.connect('toggle-wishlist', (_w: unknown, gameId: string, wishlisted: boolean) => {
        cb(gameId, wishlisted);
      });
    }
  },
);
