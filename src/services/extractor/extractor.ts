import type { IExtractorService, ExtractResult, ExtractProgressFn } from '../types'
import { detectTools, runCmd, formatForArchive, countFiles, totalBytesInDir, countZipFiles, count7zFiles, countTarFiles } from './extractor-helpers'
import type { ToolMap } from './extractor-helpers'

export class ExtractorService implements IExtractorService {
  private tools: ToolMap

  constructor() {
    this.tools = detectTools()
  }

  getSupportedFormats(): string[] {
    const fmts: string[] = []
    if (this.tools['7z']) fmts.push('.7z', '.iso')
    if (this.tools.unzip) fmts.push('.zip')
    if (this.tools.unrar) fmts.push('.rar')
    if (this.tools.tar) fmts.push('.tar.gz', '.tgz', '.tar.xz')
    return fmts
  }

  async extract(archivePath: string, destDir: string, onProgress?: ExtractProgressFn): Promise<ExtractResult> {
    const GLib = imports.gi.GLib
    const startTime = Date.now()

    if (!GLib.file_test(archivePath, GLib.FileTest.IS_REGULAR)) {
      return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: 0, errorMessage: `Archive not found: ${archivePath}` }
    }

    GLib.mkdir_with_parents(destDir, 0o755)
    const fmt = formatForArchive(archivePath)
    if (!fmt) {
      return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - startTime, errorMessage: `Unsupported format: ${archivePath}` }
    }

    try {
      switch (fmt) {
        case 'zip': return this.extractZip(archivePath, destDir, startTime, onProgress)
        case 'rar': return this.extractRar(archivePath, destDir, startTime, onProgress)
        case '7z':
        case 'iso': return this.extract7z(archivePath, destDir, startTime, onProgress)
        case 'targz':
        case 'tarxz': return this.extractTar(archivePath, destDir, startTime, onProgress)
      }
    } catch (e) {
      return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - startTime, errorMessage: `Extraction failed: ${String(e)}` }
    }
    return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - startTime, errorMessage: `Unsupported format: ${archivePath}` }
  }

  private async extractZip(path: string, dest: string, t: number, p?: ExtractProgressFn): Promise<ExtractResult> {
    if (!this.tools.unzip) return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - t, errorMessage: 'unzip not available' }
    const total = countZipFiles(path)
    if (p) p(0, total, '')
    const r = runCmd(`unzip -o "${path}" -d "${dest}"`)
    if (!r.ok) return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - t, errorMessage: r.stderr || 'unzip failed' }
    const extracted = (r.stdout.match(/(inflating|extracting):/g) || []).length
    const bytes = totalBytesInDir(dest)
    if (p) p(extracted, total, '')
    return { success: true, filesExtracted: extracted || total, totalBytes: bytes, elapsedMs: Date.now() - t }
  }

  private async extractRar(path: string, dest: string, t: number, p?: ExtractProgressFn): Promise<ExtractResult> {
    if (!this.tools.unrar) return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - t, errorMessage: 'unrar not available' }
    if (p) p(0, 100, '')
    const r = runCmd(`unrar x -y "${path}" "${dest}/"`)
    if (!r.ok) return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - t, errorMessage: r.stderr || 'unrar failed' }
    const extracted = (r.stdout.match(/Extracting\s+/g) || []).length
    const bytes = totalBytesInDir(dest)
    if (p) p(extracted, extracted, '')
    return { success: true, filesExtracted: extracted || countFiles(dest), totalBytes: bytes, elapsedMs: Date.now() - t }
  }

  private async extract7z(path: string, dest: string, t: number, p?: ExtractProgressFn): Promise<ExtractResult> {
    if (!this.tools['7z']) return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - t, errorMessage: '7z not available' }
    const total = count7zFiles(path)
    if (p) p(0, total, '')
    const r = runCmd(`7z x "${path}" -o"${dest}" -y`)
    if (!r.ok) return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - t, errorMessage: r.stderr || '7z failed' }
    const fm = r.stdout.match(/^Files:\s+(\d+)/m)
    const extracted = fm ? parseInt(fm[1]!, 10) : countFiles(dest)
    const bytes = totalBytesInDir(dest)
    if (p) p(extracted, total, '')
    return { success: true, filesExtracted: extracted, totalBytes: bytes, elapsedMs: Date.now() - t }
  }

  private async extractTar(path: string, dest: string, t: number, p?: ExtractProgressFn): Promise<ExtractResult> {
    if (!this.tools.tar) return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - t, errorMessage: 'tar not available' }
    const total = countTarFiles(path)
    if (p) p(0, total, '')
    const r = runCmd(`tar xf "${path}" -C "${dest}"`)
    if (!r.ok) return { success: false, filesExtracted: 0, totalBytes: 0, elapsedMs: Date.now() - t, errorMessage: r.stderr || 'tar failed' }
    const extracted = countFiles(dest)
    const bytes = totalBytesInDir(dest)
    if (p) p(extracted, total, '')
    return { success: true, filesExtracted: extracted, totalBytes: bytes, elapsedMs: Date.now() - t }
  }
}