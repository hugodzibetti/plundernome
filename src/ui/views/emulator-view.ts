import { type EmulatorDetectResult, EmulatorRow } from '../widgets/emulator-row';
import { createButton } from '../factory';
import { createScrollContent } from '../templates/scroll-content';
import { createGridContent } from '../templates/grid-content';

interface ScannedROM {
  id: string;
  path: string;
  name: string;
  platformId: string;
  sizeBytes: number;
  lastModified: string;
}

const { Gtk, Adw, GObject } = imports.gi;

export const EmulatorView = GObject.registerClass(
  { GTypeName: 'EmulatorView' },
  class EmulatorView extends Adw.Bin {
    private stack: GtkStack;
    private platformList: GtkListBox;
    private romGrid: GtkFlowBox;
    private progressLbl: GtkLabel;
    private progressBar: GtkProgressBar;
    private bottomBar: GtkBox;
    private scanHandler: ((folderPath: string) => void) | null = null;
    private launchHandler: ((romId: string) => void) | null = null;
    private settingsHandler: (() => void) | null = null;

    constructor() {
      super();
      this.add_css_class('emulator-view');

      this.platformList = new Gtk.ListBox({ css_classes: ['boxed-list'] });
      const platformClamp = createScrollContent(this.platformList, { expand: true });
      platformClamp.add_css_class('emulator-platform-list');

      this.romGrid = createGridContent();
      this.romGrid.add_css_class('emulator-rom-grid');
      const romClamp = createScrollContent(this.romGrid, { expand: true });
      romClamp.add_css_class('emulator-rom-clamp');

      this.stack = new Gtk.Stack();
      this.stack.add_named(platformClamp, 'platforms');
      this.stack.add_named(romClamp, 'roms');
      this.stack.set_visible_child_name('platforms');

      this.progressLbl = new Gtk.Label({ label: '', xalign: 0, css_classes: ['caption'] });
      this.progressLbl.add_css_class('emulator-progress-label');
      this.progressBar = new Gtk.ProgressBar({ css_classes: ['emulator-progress-bar'] });
      this.progressBar.set_visible(false);
      const settingsBtn = createButton({
        iconName: 'preferences-system-symbolic',
        tooltip: 'Emulator settings',
        onClick: () => this.settingsHandler?.(),
      });
      this.bottomBar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
      this.bottomBar.add_css_class('emulator-bottom-bar');
      this.bottomBar.set_halign(Gtk.Align.FILL);
      this.bottomBar.append(this.progressLbl);
      this.bottomBar.append(this.progressBar);
      this.bottomBar.append(settingsBtn);

      const outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
      outer.set_vexpand(true);
      outer.append(this.stack);
      outer.append(this.bottomBar);
      this.set_child(outer);
    }

    setPlatforms(platforms: EmulatorDetectResult[]): void {
      let row = this.platformList.get_first_child() as GtkWidget | null;
      while (row) {
        const next = row.get_next_sibling();
        this.platformList.remove(row);
        row = next as GtkWidget | null;
      }
      for (const p of platforms) {
        const r = new EmulatorRow(p);
        r.onScan(() => this.scanHandler?.(p.binaryPath));
        this.platformList.append(r);
      }
    }

    setROMs(roms: ScannedROM[]): void {
      let child = this.romGrid.get_first_child() as GtkWidget | null;
      while (child) {
        const next = child.get_next_sibling();
        this.romGrid.remove(child);
        child = next as GtkWidget | null;
      }
      if (roms.length === 0) {
        const empty = new Gtk.Label({ label: 'No ROMs found', css_classes: ['emulator-empty'] });
        this.romGrid.append(empty);
        return;
      }
      for (const rom of roms) {
        const card = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
        card.add_css_class('emulator-rom-card');
        card.set_halign(Gtk.Align.START);
        card.set_valign(Gtk.Align.START);
        const nameLbl = new Gtk.Label({ label: rom.name, xalign: 0, css_classes: ['emulator-rom-name'] });
        nameLbl.set_ellipsize(3);
        card.append(nameLbl);
        const sizeStr = rom.sizeBytes > 1e9
          ? `${(rom.sizeBytes / 1e9).toFixed(1)} GB`
          : `${(rom.sizeBytes / 1e6).toFixed(0)} MB`;
        const infoLbl = new Gtk.Label({
          label: `${sizeStr} · ${rom.lastModified}`,
          xalign: 0,
          css_classes: ['caption', 'emulator-rom-info'],
        });
        card.append(infoLbl);
        const launchBtn = createButton({
          label: 'Launch',
          cssClass: 'suggested-action',
          onClick: () => this.launchHandler?.(rom.id),
        });
        card.append(launchBtn);
        this.romGrid.append(card);
      }
    }

    setScanProgress(current: number, total: number): void {
      if (total === 0) {
        this.progressBar.set_visible(false);
        this.progressLbl.set_label('');
        return;
      }
      this.progressBar.set_visible(true);
      this.progressBar.set_fraction(current / total);
      this.progressLbl.set_label(`Scanning ROMs... ${current}/${total}`);
    }

    onScanROMS(cb: (folderPath: string) => void): void {
      this.scanHandler = cb;
    }

    onLaunchROM(cb: (romId: string) => void): void {
      this.launchHandler = cb;
    }

    onOpenSettings(cb: () => void): void {
      this.settingsHandler = cb;
    }
  },
);
