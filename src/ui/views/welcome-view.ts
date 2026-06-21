import { SOURCE_DEFINITIONS } from '../../sources';
import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings';
import { createButton } from '../factory';
import { createScrollContent } from '../templates/scroll-content';
import { pickFileOrDir } from '../welcome-picker-utils';
import { _t } from '../../domain/i18n';

const { Gtk, Adw, GLib, Gio, GObject } = imports.gi;

const WINE_PATHS = ['/usr/bin/wine', '/usr/local/bin/wine', '/usr/bin/wine64'];

export const WelcomeView = GObject.registerClass(
  {
    GTypeName: 'WelcomeView',
  },
  class WelcomeView extends Adw.Bin {
    private sourceCheckboxes = new Map<string, GtkCheckButton>();
    private getStartedBtn: GtkButton;
    private dlDir: string;
    private winePath: string;
    private onComplete: (() => void) | null = null;
    private dlDirRow: AdwActionRow;
    private wineRow: AdwActionRow;
    private showToast: (msg: string) => void;

    constructor(toastFn?: (msg: string) => void) {
      super();
      this.showToast = toastFn ?? (() => {});
      this.add_css_class('welcome-view');

      const settings = new SettingsManager();
      this.dlDir = settings.getString(GSETTINGS_KEYS.INSTALL_PATH) || `${GLib.get_home_dir()}/Games/Plundernome`;
      this.winePath = settings.getString(GSETTINGS_KEYS.WINE_PATH) || '';

      const rootBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 24 });
      rootBox.add_css_class('welcome-content');
      rootBox.set_valign(Gtk.Align.START);

      const headerBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 });
      const icon = new Gtk.Image({ icon_name: 'applications-games-symbolic', pixel_size: 64 });
      icon.add_css_class('welcome-icon');
      headerBox.append(icon);
      const title = new Gtk.Label({ label: _t('welcome.title'), xalign: 0 });
      title.add_css_class('title-1');
      headerBox.append(title);
      const subtitle = new Gtk.Label({
        label: _t('welcome.subtitle'),
        xalign: 0,
        wrap: true,
      });
      subtitle.add_css_class('welcome-subtitle');
      headerBox.append(subtitle);
      rootBox.append(headerBox);

      const sourcesGroup = new Adw.PreferencesGroup({ title: _t('welcome.step1') });
      const sourceGrid = new Gtk.FlowBox();
      sourceGrid.set_max_children_per_line(2);
      sourceGrid.set_min_children_per_line(1);
      sourceGrid.set_selection_mode(Gtk.SelectionMode.NONE);
      sourceGrid.add_css_class('welcome-source-grid');
      for (const src of SOURCE_DEFINITIONS) {
        const check = new Gtk.CheckButton({ label: src.name, active: src.enabled });
        check.connect('toggled', () => this.validateSteps());
        this.sourceCheckboxes.set(src.id, check);
        const chip = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
        chip.add_css_class('welcome-source-chip');
        chip.append(check);
        sourceGrid.append(chip);
      }
      sourcesGroup.add(sourceGrid);
      rootBox.append(sourcesGroup);

      const dirGroup = new Adw.PreferencesGroup({ title: _t('welcome.step2') });
      this.dlDirRow = new Adw.ActionRow({ title: _t('welcome.download-folder'), subtitle: this.dlDir });
      const browseBtn = createButton({ label: `${_t('common.browse')}\u2026`, onClick: () => this.pickDownloadDir() });
      this.dlDirRow.add_suffix(browseBtn);
      this.dlDirRow.set_activatable_widget(browseBtn);
      dirGroup.add(this.dlDirRow);
      rootBox.append(dirGroup);

      const wineGroup = new Adw.PreferencesGroup({ title: _t('welcome.step3') });
      this.wineRow = new Adw.ActionRow({
        title: _t('welcome.wine-binary'),
        subtitle: this.winePath || _t('welcome.wine-auto'),
      });
      const detectBtn = createButton({ label: _t('welcome.auto-detect'), onClick: () => this.autoDetectWine() });
      this.wineRow.add_suffix(detectBtn);
      const wineBrowseBtn = createButton({ label: `${_t('common.browse')}\u2026`, onClick: () => this.pickWinePath() });
      this.wineRow.add_suffix(wineBrowseBtn);
      wineGroup.add(this.wineRow);
      rootBox.append(wineGroup);

      this.getStartedBtn = createButton({
        label: _t('welcome.get-started'),
        cssClass: 'suggested-action',
        onClick: () => this.finishWizard(),
      });
      this.getStartedBtn.set_sensitive(false);
      this.getStartedBtn.set_halign(Gtk.Align.CENTER);
      rootBox.append(this.getStartedBtn);

      const clamp = createScrollContent(rootBox, { maxHeight: 420 });
      clamp.set_maximum_size(600);
      this.set_child(clamp);

      this.validateSteps();
      this.autoDetectWine();
    }

    onWizardComplete(cb: () => void): void {
      this.onComplete = cb;
    }

    private pickDownloadDir(): void {
      pickFileOrDir(
        this.get_root() as GtkWidget,
        Gtk.FileChooserAction.SELECT_FOLDER,
        _t('welcome.select-download-dir'),
        (path) => {
          this.dlDir = path;
          this.dlDirRow.set_subtitle(path);
          this.validateSteps();
        },
      );
    }

    private pickWinePath(): void {
      pickFileOrDir(this.get_root() as GtkWidget, Gtk.FileChooserAction.OPEN, _t('welcome.select-wine'), (path) => {
        this.winePath = path;
        this.wineRow.set_subtitle(path);
        this.validateSteps();
      });
    }

    private autoDetectWine(): void {
      for (const p of WINE_PATHS) {
        const f = Gio.File.new_for_path(p);
        if (f.query_exists(null)) {
          this.winePath = p;
          this.wineRow.set_subtitle(p);
          this.validateSteps();
          this.showToast(`${_t('welcome.wine-found')} ${p}`);
          return;
        }
      }
      this.winePath = '';
      this.wineRow.set_subtitle(_t('welcome.wine-not-found'));
      this.validateSteps();
      this.showToast(_t('welcome.wine-not-found-browse'));
    }

    private validateSteps(): void {
      let checked = 0;
      for (const cb of this.sourceCheckboxes.values()) {
        if (cb.get_active()) checked++;
      }
      this.getStartedBtn.set_sensitive(checked >= 2 && this.dlDir.length > 0);
    }

    private finishWizard(): void {
      const settings = new SettingsManager();
      settings.setString(GSETTINGS_KEYS.INSTALL_PATH, this.dlDir);
      if (this.winePath) settings.setString(GSETTINGS_KEYS.WINE_PATH, this.winePath);
      const enabledIds: string[] = [];
      for (const [id, cb] of this.sourceCheckboxes) {
        if (cb.get_active()) enabledIds.push(id);
      }
      settings.setString('enabled-sources', enabledIds.join(','));
      settings.setBool(GSETTINGS_KEYS.FIRST_RUN_COMPLETE, true);
      this.onComplete?.();
    }
  },
);
