import type { IHttpService, HttpOptions, HttpResponse, DownloadOptions, DownloadResult } from './types'
import { extractHeaders } from './http-headers'
import { RollingSpeedTracker, formatBytes } from './http-helpers'

export class HttpService implements IHttpService {
  private _session: SoupSession | null = null
  private userAgent: string
  private speedLimit = 0
  private activeCancellables = new Map<string, GioCancellable>()
  private speedTracker = new RollingSpeedTracker()
  private latencyCache = new Map<string, { latency: number; ts: number }>()
  private static LATENCY_TTL = 60_000

  setSpeedLimit(bps: number): void { this.speedLimit = Math.max(0, bps) }

  constructor(userAgent?: string) { this.userAgent = userAgent ?? 'Plundernome/0.1' }

  private get session(): SoupSession {
    if (!this._session) {
      const Soup = imports.gi.Soup
      this._session = new Soup.Session()
      this._session.user_agent = this.userAgent
      this._session.timeout = 30
    }
    return this._session
  }

  private set session(val: SoupSession) { this._session = val }

  cancelDownload(url: string): void {
    const c = this.activeCancellables.get(url)
    if (c) { c.cancel(); this.activeCancellables.delete(url) }
  }

  async checkLatency(url: string): Promise<number> {
    const cached = this.latencyCache.get(url)
    const now = Date.now()
    if (cached && now - cached.ts < HttpService.LATENCY_TTL) return cached.latency
    const start = now
    try {
      const Soup = imports.gi.Soup
      const msg = new Soup.Message({ method: 'HEAD', uri: url })
      this.session.send(msg, null)
      const lat = Date.now() - start
      this.latencyCache.set(url, { latency: lat, ts: now })
      return lat
    } catch {
      this.latencyCache.set(url, { latency: Infinity, ts: now })
      return Infinity
    }
  }

  async selectMirror(mirrors: string[]): Promise<string> {
    if (mirrors.length <= 1) return mirrors[0]!
    const results = await Promise.all(mirrors.map(async m => ({ url: m, lat: await this.checkLatency(m) })))
    results.sort((a, b) => a.lat - b.lat)
    return results[0]!.url
  }

  async testLatency(url: string): Promise<number> {
    return this.checkLatency(url)
  }

  async pickFastestMirror(mirrors: string[]): Promise<string> {
    return this.selectMirror(mirrors)
  }

  async rankMirrorsByLatency(mirrors: string[]): Promise<string[]> {
    if (mirrors.length <= 1) return [...mirrors]
    const results = await Promise.all(mirrors.map(async m => ({ url: m, lat: await this.checkLatency(m) })))
    results.sort((a, b) => a.lat - b.lat)
    return results.map(r => r.url)
  }

  async fetch(url: string, options?: HttpOptions): Promise<HttpResponse> {
    const Soup = imports.gi.Soup
    const msg = new Soup.Message({ method: options?.method ?? 'GET', uri: url })
    if (options?.headers) for (const [k, v] of Object.entries(options.headers)) msg.request_headers.append(k, v)
    if (options?.timeoutMs) this.session.timeout = options.timeoutMs / 1000
    const retries = options?.retries ?? 1
    let lastErr = ''
    for (let a = 0; a < retries; a++) {
      try {
        const status = this.session.send(msg, null)
        if (status !== 200) return { status, body: '', headers: extractHeaders(msg) }
        const bodyBytes = msg.response_body.flatten()
        const body = new TextDecoder().decode(bodyBytes)
        return { status, body, headers: extractHeaders(msg) }
      } catch (e: unknown) {
        lastErr = e instanceof Error ? e.message : String(e)
        if (a < retries - 1) imports.gi.GLib.usleep(1000000)
      }
    }
    return { status: 0, body: lastErr, headers: {} }
  }

  async download(options: DownloadOptions): Promise<DownloadResult> {
    const Soup = imports.gi.Soup; const Gio = imports.gi.Gio; const GLib = imports.gi.GLib
    const { url, destinationPath, offset = 0 } = options
    const file = Gio.File.new_for_path(destinationPath)
    const parent = file.get_parent()
    if (parent) {
      if (!parent.query_exists(null)) parent.make_directory_with_parents(null)
      const free = parent.query_filesystem_info('filesystem::free', null)?.get_attribute_uint64('filesystem::free') ?? 0
      const needed = (options.expectedTotalBytes ?? 0) + (options.expectedExtractedBytes ?? 0)
      if (needed > 0 && free < needed) return { success: false, bytesDownloaded: 0, totalBytes: 0, elapsedMs: 0, errorMessage: `Insufficient disk space: need ${formatBytes(needed)}, have ${formatBytes(free)}` }
    }
    const msg = new Soup.Message({ method: 'GET', uri: url })
    if (offset > 0) msg.request_headers.append('Range', `bytes=${offset}-`)
    const startTime = GLib.get_monotonic_time()
    const cancellable = new Gio.Cancellable()
    this.activeCancellables.set(url, cancellable)
    try { this.session.send(msg, cancellable) } catch (e: unknown) {
      this.activeCancellables.delete(url)
      if (cancellable.is_cancelled()) return { success: false, bytesDownloaded: offset, totalBytes: 0, elapsedMs: 0, errorMessage: 'Download cancelled' }
      return { success: false, bytesDownloaded: offset, totalBytes: 0, elapsedMs: 0, errorMessage: e instanceof Error ? e.message : String(e) }
    }
    this.activeCancellables.delete(url)
    const bodyBytes = msg.response_body.flatten()
    const chunkSize = bodyBytes.length
    if (chunkSize === 0 && offset === 0) return { success: false, bytesDownloaded: 0, totalBytes: 0, elapsedMs: 0, errorMessage: 'Empty response' }
    let totalSize = 0
    const cr = msg.response_headers?.get_one('Content-Range')
    if (cr) { const m = cr.match(/bytes \d+-\d+\/(\d+)/); if (m) totalSize = parseInt(m[1]!, 10) }
    const finalSize = offset + chunkSize
    const totalBytes = totalSize || finalSize
    try {
      const parent = file.get_parent()
      if (parent && !parent.query_exists(null)) parent.make_directory_with_parents(null)
      if (offset > 0 && file.query_exists(null)) {
        const out = file.append_to(Gio.FileCreateFlags.NONE, null); out.write(bodyBytes, null); out.close(null)
      } else {
        const out = file.replace(null, false, Gio.FileCreateFlags.NONE, null); out.write(bodyBytes, null); out.close(null)
      }
      options.onProgress?.(finalSize, totalBytes)
      options.onOffsetSave?.(finalSize)
      if (this.speedLimit > 0) {
        const elapsedSec = (GLib.get_monotonic_time() - startTime) / 1_000_000
        const expectedSec = totalBytes / this.speedLimit
        if (elapsedSec < expectedSec) GLib.usleep((expectedSec - elapsedSec) * 1_000_000)
      }
      const endTime = GLib.get_monotonic_time()
      const elapsedMs = Math.round((endTime - startTime) / 1000)
      const speed = Math.round(finalSize / (elapsedMs / 1000 || 1))
      this.speedTracker.recordSample(options.downloadId ?? url, speed)
      options.onSpeed?.(this.speedTracker.getRolling(options.downloadId ?? url))
      return { success: true, bytesDownloaded: finalSize, totalBytes, elapsedMs }
    } catch (e: unknown) {
      return { success: false, bytesDownloaded: finalSize, totalBytes, elapsedMs: 0, errorMessage: e instanceof Error ? e.message : String(e) }
    }
  }

  async downloadParts(
    parts: Array<{ url: string; index: number }>,
    destinationDir: string,
    onPartProgress?: (index: number, bytesDownloaded: number, totalBytes: number) => void
  ): Promise<void> {
    const Gio = imports.gi.Gio; const Soup = imports.gi.Soup; const GLib = imports.gi.GLib
    const concurrency = 2
    let i = 0
    const next = async (): Promise<void> => {
      while (i < parts.length) {
        const part = parts[i++]!
        const dest = `${destinationDir}/part_${String(part.index).padStart(3, '0')}`
        const file = Gio.File.new_for_path(dest)
        const parent = file.get_parent()
        if (parent && !parent.query_exists(null)) parent.make_directory_with_parents(null)
        const msg = new Soup.Message({ method: 'GET', uri: part.url })
        try {
          this.session.send(msg, null)
          const body = msg.response_body.flatten()
          const out = file.replace(null, false, Gio.FileCreateFlags.NONE, null)
          out.write(body, null)
          out.close(null)
          onPartProgress?.(part.index, body.length, body.length)
        } catch (e: unknown) {
          throw new Error(`Part ${part.index} failed: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }
    const workers = Array.from({ length: concurrency }, () => next())
    await Promise.all(workers)
  }
}
