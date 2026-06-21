import type { Game } from '../../domain/models';
import type { EnrichedMetadata } from '../../services/metadata-provider';
import { _t } from '../../domain/i18n';
import { createButton, createToggleButton } from '../factory';
import { ensureCached } from '../../services/cover-cache';
import { createGridContent } from '../templates';

const { Gtk, Adw } = imports.gi;

export function showGameDetailDialog(
  game: Game,
  enriched?: EnrichedMetadata | null,
  onDownload?: () => void,
  onWishlist?: () => void,
): void {
  const win = new Adw.Window({ modal: true, title: game.name, resizable: true, default_width: 600, default_height: 500 });
  win.add_css_class('game-detail-dialog');

  const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 });

  const coverUrl = enriched?.coverUrl ?? game.imageUrl;
  if (coverUrl) {
    const coverPic = new Gtk.Picture();
    coverPic.add_css_class('game-detail-cover');
    coverPic.set_content_fit(Gtk.ContentFit.COVER);
    content.append(coverPic);
    ensureCached(game.id, coverUrl).then(path => { if (path) coverPic.set_filename(path); });
  }

  const titleRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
  const titleLbl = new Gtk.Label({ label: game.name, xalign: 0 });
  titleLbl.add_css_class('game-detail-title');
  titleLbl.set_hexpand(true);
  titleRow.append(titleLbl);
  if (onDownload) {
    titleRow.append(createButton({ label: _t('common.download'), cssClass: 'suggested-action', onClick: onDownload }));
  }
  content.append(titleRow);

  const metaParts: string[] = [];
  if (enriched?.genres?.length) metaParts.push(enriched.genres.join(' · '));
  if (enriched?.releaseDate) metaParts.push(enriched.releaseDate);
  if (enriched?.developer) metaParts.push(`by ${enriched.developer}`);
  if (enriched?.publisher && enriched.publisher !== enriched.developer) metaParts.push(`pub: ${enriched.publisher}`);
  if (metaParts.length) {
    const metaLbl = new Gtk.Label({ label: metaParts.join('  ·  '), xalign: 0, wrap: true });
    metaLbl.add_css_class('game-detail-meta');
    content.append(metaLbl);
  }

  const infoLbl = new Gtk.Label({ label: `${game.size}  ·  ${game.sourceId}  ·  ${game.lastUpdated}`, xalign: 0 });
  infoLbl.add_css_class('game-detail-meta');
  content.append(infoLbl);

  const desc = enriched?.description ?? game.description;
  if (desc) {
    const descLbl = new Gtk.Label({ label: desc, xalign: 0, wrap: true, selectable: true, max_width_chars: 60 });
    descLbl.add_css_class('game-detail-desc');
    content.append(descLbl);
  }

  if (enriched?.screenshots?.length) {
    const ssBox = createGridContent();
    ssBox.set_max_children_per_line(3);
    ssBox.set_min_children_per_line(1);
    ssBox.set_halign(Gtk.Align.START);
    for (const url of enriched.screenshots) {
      const pic = new Gtk.Picture();
      pic.set_content_fit(Gtk.ContentFit.COVER);
      pic.add_css_class('game-detail-screenshot');
      ssBox.append(pic);
      ensureCached(game.id, url).then(path => { if (path) pic.set_filename(path); });
    }
    content.append(ssBox);
  }

  const bottomBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
  bottomBox.set_halign(Gtk.Align.END);
  if (onWishlist) {
    bottomBox.append(createToggleButton({ iconName: 'starred-symbolic', cssClass: 'flat', active: !!game.wishlisted, onToggle: (_active: boolean) => onWishlist() }));
  }
  bottomBox.append(createButton({ label: _t('common.close'), onClick: () => win.close() }));
  content.append(bottomBox);

  win.set_content(content);
  win.present();
}
