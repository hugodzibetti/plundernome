import type { Download } from '../../domain/models';
import { _t } from '../../domain/i18n';
import { formatBytes, formatSpeed, formatTime } from '../helpers';

const { Gtk, Adw, GObject } = imports.gi;

function statusText(d: Download): string {
  if (d.status === 'downloading') {
    if (d.parts && d.parts.length > 0) {
      const current = d.parts.find((p) => p.status === 'downloading');
      if (current) return `Part ${current.index}/${current.total}`;
    }
    return `${Math.round(d.progress)}%`;
  }
  if (d.status === 'failed') return `${_t('downloads.status.failed')}${d.errorMessage ? `: ${d.errorMessage}` : ''}`;
  return (
    {
      queued: _t('downloads.status.queued'),
      verifying: _t('downloads.status.verifying'),
      paused: _t('downloads.status.paused'),
      resuming: _t('downloads.status.resuming'),
      completed: _t('downloads.status.completed'),
    }[d.status] ?? d.status
  );
}

export const ProgressBarWidget = GObject.registerClass(
  {
    GTypeName: 'ProgressBarWidget',
  },
  class ProgressBarWidget extends Adw.Bin {
    private nameLabel: GtkLabel;
    private statusLabel: GtkLabel;
    private progressBar: GtkProgressBar;
    private detailsLabel: GtkLabel;

    constructor(download: Download) {
      super();
      this.nameLabel = new Gtk.Label({ label: download.name, xalign: 0 });
      this.nameLabel.add_css_class('name');
      this.statusLabel = new Gtk.Label({ label: statusText(download), xalign: 0 });
      this.progressBar = new Gtk.ProgressBar({ fraction: download.progress / 100, show_text: false });
      this.detailsLabel = new Gtk.Label({ label: '', xalign: 0 });
      this.detailsLabel.add_css_class('details');

      const topRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
      topRow.append(this.nameLabel);
      topRow.append(this.statusLabel);

      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2 });
      box.add_css_class('progress-bar-container');
      box.append(topRow);
      box.append(this.progressBar);
      box.append(this.detailsLabel);
      this.set_child(box);
      this.update(download);
    }

    update(download: Download): void {
      this.nameLabel.set_label(download.name);
      this.statusLabel.set_label(statusText(download));
      this.progressBar.set_fraction(download.progress / 100);

      if (download.status === 'downloading' && download.speed > 0) {
        const rem = download.totalBytes > 0 ? (download.totalBytes - download.bytesDownloaded) / download.speed : 0;
        const eta = formatTime(rem);
        let label = eta ? `${formatSpeed(download.speed)} \u2022 ${eta}` : formatSpeed(download.speed);
        if (download.parts && download.parts.length > 0) {
          const active = download.parts.find((p) => p.status === 'downloading');
          if (active) label = `${label} \u2022 Part ${active.index}/${active.total}`;
        }
        this.detailsLabel.set_label(label);
      } else if (download.status === 'verifying') {
        this.detailsLabel.set_label(`${formatBytes(download.bytesDownloaded)} verified`);
      } else {
        this.detailsLabel.set_label('');
      }
    }
  },
);
