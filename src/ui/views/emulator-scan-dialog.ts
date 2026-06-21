const { Gtk, Adw, GObject } = imports.gi;

export const EmulatorScanDialog = GObject.registerClass(
  { GTypeName: 'EmulatorScanDialog' },
  class EmulatorScanDialog extends Adw.MessageDialog {
    private selectHandler: ((path: string) => void) | null = null;

    constructor() {
      const props: Record<string, unknown> = {
        heading: 'Select ROM Folder',
        body: 'Choose a folder containing ROM files to scan.',
        close_response: 'cancel',
      };
      super(props);
      this.add_css_class('emulator-scan-dialog');
      this.add_response('cancel', 'Cancel');
      this.add_response('browse', 'Browse…');
      this.set_response_appearance('browse', Adw.ResponseAppearance.SUGGESTED);
      this.connect('response', (_d: unknown, resp: string) => {
        if (resp === 'browse') this.pickFolder();
        this.destroy();
      });
    }

    private pickFolder(): void {
      const root = this.get_root() as GtkWidget;
      if (!root) return;
      const picker = new Gtk.FileChooserNative({
        action: Gtk.FileChooserAction.SELECT_FOLDER,
        title: 'Select ROM Folder',
        transient_for: root,
      });
      picker.connect('response', (_d: unknown, response: number) => {
        if (response === Gtk.ResponseType.ACCEPT) {
          const path = picker.get_file()?.get_path() ?? '';
          if (path) this.selectHandler?.(path);
        }
      });
      picker.present();
    }

    onSelectFolder(cb: (path: string) => void): void {
      this.selectHandler = cb;
    }
  },
);
