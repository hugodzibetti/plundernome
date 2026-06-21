import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isValidMagnetURI, isValidTorrentURL, detectTorrentClients, spawnTorrentClient } from '../torrent-client'
import { TorrentService } from '../torrent'
import type { HttpService } from '../http'

const mockGLib = (globalThis as any).mockGLib

describe('torrent-client utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isValidMagnetURI rejects empty string', () => {
    expect(isValidMagnetURI('')).toBe(false)
  })

  it('isValidMagnetURI accepts valid magnet link', () => {
    const magnet = 'magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=test'
    expect(isValidMagnetURI(magnet)).toBe(true)
  })

  it('isValidMagnetURI rejects non-magnet string', () => {
    expect(isValidMagnetURI('http://example.com/file.torrent')).toBe(false)
  })

  it('isValidMagnetURI rejects magnet with short hash', () => {
    const short = 'magnet:?xt=urn:btih:1234'
    expect(isValidMagnetURI(short)).toBe(false)
  })

  it('isValidTorrentURL accepts .torrent URL', () => {
    expect(isValidTorrentURL('https://example.com/file.torrent')).toBe(true)
  })

  it('isValidTorrentURL accepts .torrent URL with query', () => {
    expect(isValidTorrentURL('https://example.com/file.torrent?auth=token')).toBe(true)
  })

  it('isValidTorrentURL rejects non-torrent URL', () => {
    expect(isValidTorrentURL('https://example.com/file.zip')).toBe(false)
  })

  it('isValidTorrentURL rejects magnet URI', () => {
    expect(isValidTorrentURL('magnet:?xt=urn:btih:1234')).toBe(false)
  })

  it('detectTorrentClients returns empty when nothing in PATH', () => {
    mockGLib.find_program_in_path.mockReturnValue(null)
    const clients = detectTorrentClients()
    expect(clients).toHaveLength(0)
  })

  it('detectTorrentClients returns detected clients', () => {
    mockGLib.find_program_in_path
      .mockReturnValueOnce('/usr/bin/transmission-daemon')
      .mockReturnValueOnce('/usr/bin/qbittorrent-nox')
      .mockReturnValueOnce('/usr/bin/deluged')
    const clients = detectTorrentClients()
    expect(clients.length).toBeGreaterThanOrEqual(1)
    expect(clients[0]!.name).toBe('Transmission')
  })
})

describe('TorrentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGLib.find_program_in_path.mockReturnValue(null)
  })

  it('constructs with no clients and no http fallback', () => {
    const svc = new TorrentService()
    expect(svc.availableClients).toHaveLength(0)
    expect(svc.currentClient).toBeNull()
  })

  it('addMagnet throws on invalid URI', async () => {
    const svc = new TorrentService()
    await expect(svc.addMagnet('not-a-magnet', '/tmp')).rejects.toThrow('Invalid magnet URI')
  })

  it('addTorrent throws on invalid URL', async () => {
    const svc = new TorrentService()
    await expect(svc.addTorrent('not-a-url', '/tmp')).rejects.toThrow('Invalid torrent URL')
  })

  it('addMagnet throws when no client and no http fallback', async () => {
    const svc = new TorrentService()
    await expect(svc.addMagnet('magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=test', '/tmp'))
      .rejects.toThrow('No torrent client available')
  })

  it('addTorrent throws when no client and no http fallback', async () => {
    const svc = new TorrentService()
    await expect(svc.addTorrent('https://example.com/file.torrent', '/tmp'))
      .rejects.toThrow('No torrent client available')
  })

  it('addMagnet with http fallback returns id', async () => {
    const mockHttp = { download: vi.fn().mockResolvedValue({ success: true, bytesDownloaded: 100, totalBytes: 100, elapsedMs: 50 }) } as unknown as HttpService
    const svc = new TorrentService(mockHttp)
    const id = await svc.addMagnet('magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=test', '/tmp')
    expect(id).toContain('torrent-')
  })

  it('addTorrent with http fallback downloads torrent file', async () => {
    const mockHttp = { download: vi.fn().mockResolvedValue({ success: true, bytesDownloaded: 500, totalBytes: 500, elapsedMs: 100 }) } as unknown as HttpService
    const svc = new TorrentService(mockHttp)
    const id = await svc.addTorrent('https://example.com/file.torrent', '/tmp')
    expect(id).toContain('torrent-')
    expect(mockHttp.download).toHaveBeenCalled()
  })

  it('waitForCompletion resolves true after timeout', async () => {
    mockGLib.timeout_add.mockImplementation((_prio: number, _interval: number, cb: () => boolean) => {
      cb()
      return 42
    })
    mockGLib.source_remove.mockReturnValue(undefined)
    const svc = new TorrentService()
    const procId = 'test-id'
    ;(svc as any).processes.set(procId, Date.now())
    const result = await svc.waitForCompletion(procId)
    expect(result).toBe(true)
  })

  it('remove deletes process entry', () => {
    const svc = new TorrentService()
    ;(svc as any).processes.set('test-id', 12345)
    svc.remove('test-id')
    expect((svc as any).processes.has('test-id')).toBe(false)
  })

  it('autoSpawn returns false when no clients', async () => {
    const svc = new TorrentService()
    const ok = await svc.autoSpawn()
    expect(ok).toBe(false)
  })

  it('autoSpawn spawns first detected client', async () => {
    const origFind = mockGLib.find_program_in_path
    mockGLib.find_program_in_path.mockReturnValue('/usr/bin/transmission-daemon')
    mockGLib.spawn_command_line_async = vi.fn(() => [true, 12345])
    const svc = new TorrentService()
    const ok = await svc.autoSpawn()
    expect(ok).toBe(true)
    mockGLib.find_program_in_path = origFind
  })
})