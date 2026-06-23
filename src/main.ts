import { PlundernomeWindow } from './ui/window';
import { BigPictureApp } from './ui/big-picture/window';
import { AppController } from './controller';
import { SettingsManager, GSETTINGS_KEYS } from './services/gsettings';
import { initTranslations } from './domain/translations';
import { DialogServiceImpl, LaunchOptionsEditorImpl } from './ui/dialog-service';

declare const ARGV: string[] | undefined;

const gi = imports.gi;
gi.versions.Gtk = '4.0';
gi.versions.Adw = '1';
gi.versions.Soup = '3.0';
gi.versions.Gda = '6.0';
const { GObject } = gi;

function applyColorScheme(): void {
  const { Adw } = imports.gi;
  const scheme = new SettingsManager().getInt(GSETTINGS_KEYS.COLOR_SCHEME);
  const colors: number[] = [Adw.ColorScheme.DEFAULT, Adw.ColorScheme.FORCE_LIGHT, Adw.ColorScheme.FORCE_DARK];
  Adw.StyleManager.get_default().set_color_scheme(colors[scheme] ?? Adw.ColorScheme.DEFAULT);
}

export const PlundernomeApp = GObject.registerClass(
  {
    GTypeName: 'PlundernomeApp',
  },
  class PlundernomeApp extends imports.gi.Adw.Application {
    private controller: AppController | null = null;

    constructor() {
      const Adw = imports.gi.Adw;
      super({
        application_id: 'io.github.plundernome',
        flags: imports.gi.Gio.ApplicationFlags.DEFAULT_FLAGS,
      });

      imports.gi.GLib.set_prgname('plundernome');
      imports.gi.GLib.set_application_name('Plundernome');
      applyColorScheme();

      this.connect('activate', this.onActivate.bind(this));
    }

    private onActivate(): void {
      initTranslations();
      const win = new PlundernomeWindow(this);
      const dialogService = new DialogServiceImpl()
      dialogService.setParent(win as unknown as GtkWidget)
      this.controller = new AppController({
        catalogView: win.getCatalogView(),
        libraryView: win.getLibraryView(),
        downloadsView: win.getDownloadsView(),
        settingsView: win.getSettingsView(),
        emulatorsView: win.getEmulatorsView(),
        window: win,
        dialogService,
        launchOptionsEditor: new LaunchOptionsEditorImpl(),
      });
      this.controller.init();
      win.present();
    }
  },
);

function start(): void {
  const Adw = imports.gi.Adw;
  Adw.init();
  if (ARGV?.includes('--big-picture')) {
    const app = new BigPictureApp();
    app.run([imports.gi.GLib.get_prgname()]);
    return;
  }
  const app = new PlundernomeApp();
  app.run([imports.gi.GLib.get_prgname()]);
}

start();
