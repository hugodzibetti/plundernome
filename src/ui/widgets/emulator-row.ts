import { createButton } from '../factory';

const { Gtk, Adw, GObject } = imports.gi;

export interface EmulatorDetectResult {
  platformId: string;
  binaryPath: string;
  version?: string;
  source: string;
}

const ICON_MAP: Record<string, string> = {
  nes: 'application-x-executable-symbolic',
  snes: 'application-x-executable-symbolic',
  ps1: 'application-x-executable-symbolic',
  ps2: 'application-x-executable-symbolic',
  n64: 'application-x-executable-symbolic',
  gba: 'application-x-executable-symbolic',
  nds: 'application-x-executable-symbolic',
  psp: 'application-x-executable-symbolic',
  genesis: 'application-x-executable-symbolic',
  mame: 'application-x-executable-symbolic',
  dos: 'application-x-executable-symbolic',
};

export const EmulatorRow = GObject.registerClass(
  { GTypeName: 'EmulatorRow' },
  class EmulatorRow extends Adw.ActionRow {
    private scanHandler: (() => void) | null = null;
    private launchHandler: (() => void) | null = null;

    constructor(platform: EmulatorDetectResult) {
      const scanBtn = createButton({
        iconName: 'folder-open-symbolic',
        tooltip: `Scan ${platform.platformId} ROMs`,
        onClick: () => this.scanHandler?.(),
      });
      const props: Record<string, unknown> = {
        title: platform.platformId.toUpperCase(),
        subtitle: platform.binaryPath,
      };
      super(props);
      this.add_css_class('emulator-row');
      const icon = new Gtk.Image({
        icon_name: ICON_MAP[platform.platformId] ?? 'application-x-executable-symbolic',
        pixel_size: 24,
        valign: Gtk.Align.CENTER,
      });
      icon.add_css_class('emulator-row-icon');
      this.add_prefix(icon);
      this.add_suffix(scanBtn);
      this.set_activatable_widget(scanBtn);
    }

    onScan(cb: () => void): void {
      this.scanHandler = cb;
    }

    onLaunch(cb: () => void): void {
      this.launchHandler = cb;
    }
  },
);
