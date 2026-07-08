import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpService } from '../http/http'

const mockSoup = (globalThis as any).mockSoup

describe('HttpService', () => {
  let http: HttpService

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpService()
  })

  it('creates session lazily with user agent', () => {
    const session = http['session']
    expect(mockSoup.Session).toHaveBeenCalled()
    expect(session.user_agent).toBe('Plundernome/0.1')
  })

  it('fetch performs GET request', async () => {
    const res = await http.fetch('http://example.com')
    expect(mockSoup.Message).toHaveBeenCalledWith({ method: 'GET', uri: 'http://example.com' })
    expect(res.status).toBe(200)
  })

  it('fetch retries on failure', async () => {
    http['session'].send = vi.fn(() => { throw new Error('timeout') })
    const res = await http.fetch('http://example.com', { retries: 3 })
    expect(res.status).toBe(0)
    expect(res.body).toContain('timeout')
  })

  it('fetch allows custom headers and timeout', async () => {
    await http.fetch('http://example.com', {
      headers: { Authorization: 'Bearer xyz' },
      timeoutMs: 5000,
    })
    const msg = mockSoup.Message.mock.results[0]!.value
    expect(msg.request_headers.append).toHaveBeenCalledWith('Authorization', 'Bearer xyz')
    expect(http['session'].timeout).toBe(5)
  })

  it('download writes to file and returns success', async () => {
    const result = await http.download({ url: 'http://example.com/file.zip', destinationPath: '/tmp/file.zip' })
    expect(result.success).toBe(true)
    expect(result.bytesDownloaded).toBeGreaterThan(0)
  })

  it('download with offset sends Range header', async () => {
    const result = await http.download({
      url: 'http://example.com/file.zip',
      destinationPath: '/tmp/file.zip',
      offset: 500,
    })
    expect(result.success).toBe(true)
  })

  it('download with speed limit respects limit', async () => {
    http.setSpeedLimit(1000000)
    const result = await http.download({ url: 'http://example.com/file.zip', destinationPath: '/tmp/file.zip' })
    expect(result.success).toBe(true)
  })

  it('download handles empty response', async () => {
    const origMessage = mockSoup.Message.getMockImplementation()
    mockSoup.Message.mockImplementation(() => ({
      request_headers: { append: vi.fn() },
      response_headers: { foreach: vi.fn() },
      response_body: { flatten: vi.fn(() => new Uint8Array(0)) },
      status_code: 200,
    }))
    const result = await http.download({ url: 'http://example.com/file.zip', destinationPath: '/tmp/file.zip' })
    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('Empty response')
    mockSoup.Message.mockImplementation(origMessage)
  })

  it('setSpeedLimit updates speedLimit', () => {
    http.setSpeedLimit(5000000)
    expect(http['speedLimit']).toBe(5000000)
    http.setSpeedLimit(-100)
    expect(http['speedLimit']).toBe(0)
  })

  it('download fires onSpeed and onProgress callbacks', async () => {
    const onSpeed = vi.fn()
    const onProgress = vi.fn()
    await http.download({ url: 'http://example.com/file.zip', destinationPath: '/tmp/file.zip', onSpeed, onProgress })
    expect(onProgress).toHaveBeenCalled()
  })
})
