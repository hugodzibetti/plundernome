import type { HttpOptions, HttpResponse, DownloadOptions, DownloadResult } from '../types'

export interface IHttpService {
  fetch(url: string, options?: HttpOptions): Promise<HttpResponse>
  download(options: DownloadOptions): Promise<DownloadResult>
}
