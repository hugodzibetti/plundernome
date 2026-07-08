import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AutoUpdateService } from '../updater/auto-update'
import type { ICatalogSource } from '../../domain/catalog/types'

const mockGLib = (globalThis as any).mockGLib

describe('AutoUpdateService', () => {
  let service: AutoUpdateService
  let http: { fetch: ReturnType<typeof vi.fn>; download: ReturnType<typeof vi.fn> }
  let source: ICatalogSource
  const sourceDef = { id: 'fitgirl' as const, name: 'FitGirl', baseUrl: 'https://fitgirl-repacks.site', scrapeType: 'html' as const, enabled: true, updateIntervalMinutes: 360 }

  beforeEach(() => {
    vi.clearAllMocks()
    http = { fetch: vi.fn(), download: vi.fn() }
    source = { definition: sourceDef, scrape: vi.fn() } as any
    service = new AutoUpdateService(http, [source])
  })

  it('constructor stores http and sources', () => {
    expect(service['http']).toBe(http)
    expect(service['sources']).toHaveLength(1)
  })

  it('onSourceUpdate registers callback', () => {
    const cb = vi.fn()
    service.onSourceUpdate(cb)
    expect(service['onUpdate']).toBe(cb)
  })

  it('startAutoUpdate sets GLib timer', () => {
    service.startAutoUpdate(source)
    expect(mockGLib.timeout_add).toHaveBeenCalledWith(0, 360 * 60 * 1000, expect.any(Function))
    expect(service['timers'].has('fitgirl')).toBe(true)
  })

  it('startAutoUpdate does not duplicate timers', () => {
    service.startAutoUpdate(source)
    service.startAutoUpdate(source)
    expect(mockGLib.timeout_add).toHaveBeenCalledTimes(1)
  })

  it('stopAutoUpdate removes timer', () => {
    service.startAutoUpdate(source)
    service.stopAutoUpdate('fitgirl')
    expect(mockGLib.source_remove).toHaveBeenCalledWith(42)
    expect(service['timers'].has('fitgirl')).toBe(false)
  })

  it('stopAll removes all timers', () => {
    service.startAutoUpdate(source)
    service.stopAll()
    expect(mockGLib.source_remove).toHaveBeenCalled()
    expect(service['timers'].size).toBe(0)
  })

  it('pollSource fetches and calls callback', async () => {
    http.fetch.mockResolvedValue({ status: 200, body: '<html>content</html>', headers: {} })
    const cb = vi.fn()
    service.onSourceUpdate(cb)
    await service['pollSource'](source)
    expect(http.fetch).toHaveBeenCalledWith('https://fitgirl-repacks.site')
    expect(cb).toHaveBeenCalledWith('fitgirl', '<html>content</html>')
  })

  it('pollSource does not call callback on error', async () => {
    http.fetch.mockRejectedValue(new Error('network error'))
    const cb = vi.fn()
    service.onSourceUpdate(cb)
    await service['pollSource'](source)
    expect(cb).not.toHaveBeenCalled()
  })

  it('pollSource does not call callback on non-200', async () => {
    http.fetch.mockResolvedValue({ status: 500, body: '', headers: {} })
    const cb = vi.fn()
    service.onSourceUpdate(cb)
    await service['pollSource'](source)
    expect(cb).not.toHaveBeenCalled()
  })
})
