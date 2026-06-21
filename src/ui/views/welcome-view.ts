import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings';
import { createScrollContent } from '../templates/scroll-content';
import { pickFileOrDir } from '../welcome-picker-utils';
import { _t } from '../../domain/i18n';
import { buildWelcomeHeader, buildSourcesGroup, buildDirGroup, buildWineGroup, createGetStartedButton } from './welcome-steps';

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

      rootBox.append(buildWelcomeHeader());

      const { group: srcGroup, checkboxes } = buildSourcesGroup(() => this.validateSteps());
      this.sourceCheckboxes = checkboxes;
      rootBox.append(srcGroup);

      const { group: dirGroup, row: dlDirRow } = buildDirGroup(this.dlDir, () => this.pickDownloadDir());
      this.dlDirRow = dlDirRow;
      rootBox.append(dirGroup);

      const { group: wineGroup, row: wineRow } = buildWineGroup(
        this.winePath,
        () => this.autoDetectWine(),
        () => this.pickWinePath(),
      );
      this.wineRow = wineRow;
      rootBox.append(wineGroup);

      this.getStartedBtn = createGetStartedButton(() => this.finishWizard());
      this.getStartedBtn.set_sensitive(false);
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
