import { ProgressBarWidget } from './progress-bar';
import { canResume, canPause } from '../../domain/queue';
import type { Download } from '../../domain/models';
import type { QueueAction } from '../../domain/queue';
import { _t } from '../../domain/i18n';
import { createButton } from '../factory';

const { Gtk, Adw, GObject } = imports.gi;

export type DownloadRowHandler = (action: QueueAction, downloadId: string, extra?: number) => void;

export const DownloadRowWidget = GObject.registerClass(
  {
    GTypeName: 'DownloadRowWidget',
  },
  class DownloadRowWidget extends Adw.Bin {
    private download: Download;
    private progressWidget: GtkWidget & { update: (d: Download) => void };
    private pauseBtn: GtkButton;
    private resumeBtn: GtkButton;
    private statusLabel: GtkLabel;
    private moveUpBtn: GtkButton;
    private moveDownBtn: GtkButton;
    private buttonBox: GtkBox;
    private handler: DownloadRowHandler | null = null;

    constructor(download: Download, handler: DownloadRowHandler | null = null) {
      super();
      this.add_css_class('download-row');
      this.download = download;
      this.handler = handler;

      this.progressWidget = new ProgressBarWidget(download);
      (this.progressWidget as GtkWidget).set_hexpand(true);

      this.statusLabel = new Gtk.Label({ label: '', css_classes: ['status-badge'] });
      this.updateStatusLabel();

      this.pauseBtn = createButton({
        iconName: 'media-playback-pause-symbolic',
        tooltip: _t('downloads.pause'),
        onClick: () => this.handler?.('pause', this.download.id),
      });
      this.resumeBtn = createButton({
        iconName: 'media-playback-start-symbolic',
        tooltip: _t('downloads.resume'),
        onClick: () => this.handler?.('resume', this.download.id),
      });
      this.moveUpBtn = createButton({
        iconName: 'go-up-symbolic',
        tooltip: _t('downloads.move-up'),
        onClick: () => this.handler?.('reorder', this.download.id, -1),
      });
      this.moveDownBtn = createButton({
        iconName: 'go-down-symbolic',
        tooltip: _t('downloads.move-down'),
        onClick: () => this.handler?.('reorder', this.download.id, 1),
      });

      this.buttonBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 2 });
      this.buttonBox.append(this.statusLabel);
      this.buttonBox.append(this.resumeBtn);
      this.buttonBox.append(this.pauseBtn);
      this.buttonBox.append(this.moveUpBtn);
      this.buttonBox.append(this.moveDownBtn);

      const hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
      hbox.append(this.progressWidget);
      hbox.append(this.buttonBox);

      this.set_child(hbox);
      this.updateButtonVisibility();
    }

    update(download: Download): void {
      this.download = download;
      this.progressWidget.update(download);
      this.updateStatusLabel();
      this.updateButtonVisibility();
    }

    private updateStatusLabel(): void {
      const labels: Record<string, string> = {
        queued: _t('downloads.status.queued'),
        downloading: _t('downloads.status.downloading'),
        verifying: _t('downloads.status.verifying'),
        paused: _t('downloads.status.paused'),
        resuming: _t('downloads.status.resuming'),
        completed: _t('downloads.status.completed'),
        failed: _t('downloads.status.failed'),
      };
      this.statusLabel.set_label(labels[this.download.status] ?? '');
    }

    setHandler(handler: DownloadRowHandler): void {
      this.handler = handler;
    }

    private updateButtonVisibility(): void {
      this.pauseBtn.set_visible(canPause(this.download));
      this.resumeBtn.set_visible(canResume(this.download));
    }

    hideMoveButtons(): void {
      this.moveUpBtn.set_visible(false);
      this.moveDownBtn.set_visible(false);
    }

    showMoveButtons(): void {
      this.moveUpBtn.set_visible(true);
      this.moveDownBtn.set_visible(true);
    }
  },
);
