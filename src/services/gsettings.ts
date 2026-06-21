const { Gio } = imports.gi

const SCHEMA_ID = 'io.github.plundernome'

export class SettingsManager {
  private settings: GioSettings

  constructor() {
    const schemaSource = Gio.SettingsSchemaSource.get_default()
    const schema = schemaSource.lookup(SCHEMA_ID, true)
    if (!schema) {
      throw new Error(`Schema ${SCHEMA_ID} not found — check GSettings installation`)
    }
    this.settings = new Gio.Settings({ schema_id: SCHEMA_ID })
  }

  getString(key: string): string {
    return this.settings.get_string(key)
  }

  getInt(key: string): number {
    return this.settings.get_int(key)
  }

  getBool(key: string): boolean {
    return this.settings.get_boolean(key)
  }

  setString(key: string, value: string): void {
    this.settings.set_string(key, value)
  }

  setInt(key: string, value: number): void {
    this.settings.set_int(key, value)
  }

  setBool(key: string, value: boolean): void {
    this.settings.set_boolean(key, value)
  }

  bind(key: string, widget: unknown, prop: string, flags?: number): void {
    this.settings.bind(key, widget, prop, flags ?? Gio.SettingsBindFlags.DEFAULT)
  }
}

export const GSETTINGS_KEYS = {
  INSTALL_PATH: 'install-path',
  WINE_PATH: 'wine-path',
  DOWNLOAD_CONCURRENCY: 'download-concurrency',
  SPEED_LIMIT: 'speed-limit',
  ADAPTIVE_CONCURRENCY: 'adaptive-concurrency',
  COLOR_SCHEME: 'color-scheme',
  FIRST_RUN_COMPLETE: 'first-run-complete',
} as const