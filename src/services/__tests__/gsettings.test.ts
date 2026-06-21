import { describe, it, expect, beforeEach } from 'vitest'
import { SettingsManager, GSETTINGS_KEYS } from '../gsettings'

const mockGio = (globalThis as any).mockGio

describe('SettingsManager', () => {
  let settings: SettingsManager

  beforeEach(() => {
    mockGio.Settings.mockClear()
    settings = new SettingsManager()
  })

  it('constructor initializes GSettings', () => {
    expect(mockGio.Settings).toHaveBeenCalledWith({ schema_id: 'io.github.plundernome' })
  })

  it('getString delegates to GSettings', () => {
    settings.getString('install-path')
    expect(settings['settings'].get_string).toHaveBeenCalledWith('install-path')
  })

  it('getInt delegates to GSettings', () => {
    settings.getInt('speed-limit')
    expect(settings['settings'].get_int).toHaveBeenCalledWith('speed-limit')
  })

  it('getBool delegates to GSettings', () => {
    settings.getBool('adaptive-concurrency')
    expect(settings['settings'].get_boolean).toHaveBeenCalledWith('adaptive-concurrency')
  })

  it('setString delegates to GSettings', () => {
    settings.setString('install-path', '/games')
    expect(settings['settings'].set_string).toHaveBeenCalledWith('install-path', '/games')
  })

  it('setInt delegates to GSettings', () => {
    settings.setInt('speed-limit', 5000000)
    expect(settings['settings'].set_int).toHaveBeenCalledWith('speed-limit', 5000000)
  })

  it('setBool delegates to GSettings', () => {
    settings.setBool('adaptive-concurrency', true)
    expect(settings['settings'].set_boolean).toHaveBeenCalledWith('adaptive-concurrency', true)
  })

  it('bind delegates to GSettings', () => {
    const widget = {}
    settings.bind('speed-limit', widget, 'value')
    expect(settings['settings'].bind).toHaveBeenCalledWith('speed-limit', widget, 'value', 0)
  })

  it('GSETTINGS_KEYS has expected values', () => {
    expect(GSETTINGS_KEYS.INSTALL_PATH).toBe('install-path')
    expect(GSETTINGS_KEYS.WINE_PATH).toBe('wine-path')
    expect(GSETTINGS_KEYS.DOWNLOAD_CONCURRENCY).toBe('download-concurrency')
    expect(GSETTINGS_KEYS.SPEED_LIMIT).toBe('speed-limit')
    expect(GSETTINGS_KEYS.ADAPTIVE_CONCURRENCY).toBe('adaptive-concurrency')
    expect(GSETTINGS_KEYS.COLOR_SCHEME).toBe('color-scheme')
  })
})
