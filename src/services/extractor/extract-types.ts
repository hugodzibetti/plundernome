export type ExtractProgressFn = (current: number, total: number, currentFile: string) => void

export interface ExtractResult {
  success: boolean
  filesExtracted: number
  totalBytes: number
  elapsedMs: number
  errorMessage?: string
}

export interface IExtractorService {
  extract(archivePath: string, destDir: string, onProgress?: ExtractProgressFn): Promise<ExtractResult>
  getSupportedFormats(): string[]
}
