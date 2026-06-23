import type { EmulatorDetectResult, ScannedROM } from '../../controller/view-interfaces'
import { EmulatorRow } from '../widgets/emulator-row'
import { createButton } from '../factory'
import { createScrollContent } from '../templates/scroll-content'
import { createGridContent } from '../templates'

const { Gtk, Adw, GObject } = imports.gi

export const EmulatorView = GObject.registerClass(
  { GTypeName: 'EmulatorView' },
  class EmulatorView extends Adw.Bin {
    private platformList: GtkListBox
    private romFlowBox: GtkFlowBox
    private scanBtn: GtkButton
    private progressBar: GtkProgressBar
    private progressLbl: GtkLabel
    private scanHandler: ((folderPath: string) => void) | null = null
    private launchHandler: ((romId: string) => void) | null = null
    private settingsHandler: (() => void) | null = null

    constructor() {
      super()
      this.add_css_class('emulator-view')

      this.platformList = new Gtk.ListBox({ css_classes: ['boxed-list'] })
      this.platformList.add_css_class('emulator-platform-list')

      const platformGroup = new Adw.PreferencesGroup({ title: 'Detected Emulators' })
      platformGroup.add(this.platformList)

      this.scanBtn = createButton({
        label: 'Scan ROMs Folder',
        cssClass: 'suggested-action',
        onClick: () => {
          const parent = this.get_native() as GtkWidget | null
          if (!parent) return
          const picker = new Gtk.FileChooserNative({
            action: Gtk.FileChooserAction.SELECT_FOLDER,
            title: 'Select ROMs Folder',
            transient_for: parent,
          })
          picker.connect('response', (_d: unknown, response: number) => {
            if (response === Gtk.ResponseType.ACCEPT) {
              const path = picker.get_file()?.get_path() ?? ''
              if (path) this.scanHandler?.(path)
            }
          })
          picker.present()
        },
      })

      this.romFlowBox = createGridContent()
      this.romFlowBox.add_css_class('emulator-rom-grid')

      const romClamp = createScrollContent(this.romFlowBox, { expand: true })

      this.progressLbl = new Gtk.Label({ label: '', xalign: 0 })
      this.progressLbl.add_css_class('caption')
      this.progressBar = new Gtk.ProgressBar()
      this.progressBar.add_css_class('emulator-scan-progress')
      this.progressBar.set_visible(false)

      const progressBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 })
      progressBox.append(this.progressLbl)
      progressBox.append(this.progressBar)

      const romGroup = new Adw.PreferencesGroup({ title: 'ROMs' })
      romGroup.add(romClamp)
      romGroup.add(progressBox)

      const outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
      outer.append(platformGroup)
      outer.append(this.scanBtn)
      outer.append(romGroup)
      outer.add_css_class('emulator-outer')

      this.set_child(outer)
    }

    setPlatforms(platforms: EmulatorDetectResult[]): void {
      let row = this.platformList.get_first_child() as GtkWidget | null
      while (row) {
        const next = row.get_next_sibling() as GtkWidget | null
        this.platformList.remove(row)
        row = next
      }
      for (const p of platforms) {
        const r = new EmulatorRow(p)
        this.platformList.append(r)
      }
    }

    setROMs(roms: ScannedROM[]): void {
      let child: unknown = this.romFlowBox.get_child_at_index(0)
      while (child) { this.romFlowBox.remove(child); child = this.romFlowBox.get_child_at_index(0) }
      for (const rom of roms) {
        const card = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 })
        card.add_css_class('emulator-rom-card')
        card.set_halign(Gtk.Align.START)
        const nameLbl = new Gtk.Label({ label: rom.name, xalign: 0 })
        nameLbl.add_css_class('emulator-rom-name')
        nameLbl.set_ellipsize(3)
        card.append(nameLbl)
        const sizeStr = rom.sizeBytes > 1e9
          ? `${(rom.sizeBytes / 1e9).toFixed(1)} GB`
          : `${(rom.sizeBytes / 1e6).toFixed(0)} MB`
        const infoLbl = new Gtk.Label({
          label: `${sizeStr} · ${rom.lastModified}`,
          xalign: 0,
        })
        infoLbl.add_css_class('caption')
        card.append(infoLbl)
        const launchBtn = createButton({
          label: 'Launch',
          cssClass: 'suggested-action',
          onClick: () => this.launchHandler?.(rom.id),
        })
        card.append(launchBtn)
        this.romFlowBox.append(card)
      }
    }

    setScanProgress(current: number, total: number): void {
      if (total === 0) {
        this.progressBar.set_visible(false)
        this.progressLbl.set_label('')
        return
      }
      this.progressBar.set_visible(true)
      this.progressBar.set_fraction(current / total)
      this.progressLbl.set_label(`Scanning ROMs... ${current}/${total}`)
    }

    onScanROMS(cb: (folderPath: string) => void): void { this.scanHandler = cb }
    onLaunchROM(cb: (romId: string) => void): void { this.launchHandler = cb }
    onOpenSettings(cb: () => void): void { this.settingsHandler = cb }
  },
)
