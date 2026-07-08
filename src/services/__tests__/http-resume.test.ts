import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpService } from '../http/http'

const mockSoup = (globalThis as any).mockSoup

describe('HttpService resume', () => {
  let http: HttpService

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpService()
  })

  it('download with offset > 0 sends Range header', async () => {
    const result = await http.download({
      url: 'http://example.com/file.zip',
      destinationPath: '/tmp/file.zip',
      offset: 500,
    })
    expect(result.success).toBe(true)
    expect(result.bytesDownloaded).toBeGreaterThan(500)
  })

  it('download with offset 0 does not send Range header', async () => {
    await http.download({
      url: 'http://example.com/file.zip',
      destinationPath: '/tmp/file.zip',
      offset: 0,
    })
    const msg = mockSoup.Message.mock.results[0]!.value
    expect(msg.request_headers.append).not.toHaveBeenCalledWith('Range', 'bytes=0-')
  })

  it('download with offset calls onOffsetSave', async () => {
    const onOffsetSave = vi.fn()
    await http.download({
      url: 'http://example.com/file.zip',
      destinationPath: '/tmp/file.zip',
      offset: 1000,
      onOffsetSave,
    })
    expect(onOffsetSave).toHaveBeenCalled()
  })

  it('cancelDownload cancels active download', async () => {
    http['activeCancellables'].set('http://example.com/file.zip', { cancel: vi.fn(), is_cancelled: vi.fn(() => true) })
    http.cancelDownload('http://example.com/file.zip')
    expect(http['activeCancellables'].has('http://example.com/file.zip')).toBe(false)
  })

  it('download returns cancelled error when cancelled', async () => {
    const origSend = http['session'].send
    http['session'].send = vi.fn(() => { throw new Error('cancelled') })
    const result = await http.download({
      url: 'http://example.com/cancel.zip',
      destinationPath: '/tmp/file.zip',
      offset: 200,
    })
    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('cancelled')
    http['session'].send = origSend
  })

  it('download handles Content-Range for total size', async () => {
    mockSoup.Message.mockImplementation(() => ({
      request_headers: { append: vi.fn() },
      response_headers: { foreach: vi.fn(), get_one: vi.fn(() => 'bytes 0-99/500') },
      response_body: { flatten: vi.fn(() => new TextEncoder().encode('x'.repeat(100))) },
      status_code: 200,
    }))
    const result = await http.download({
      url: 'http://example.com/file.zip',
      destinationPath: '/tmp/file.zip',
      offset: 0,
    })
    expect(result.success).toBe(true)
    expect(result.totalBytes).toBe(500)
  })
})