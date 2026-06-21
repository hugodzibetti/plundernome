import type { HttpService } from './http'

export interface AppUpdateInfo {
  latestVersion: string
  currentVersion: string
  downloadUrl: string
  releaseNotes: string
  hasUpdate: boolean
}

export class AppUpdater {
  private currentVersion = '0.1.0'
  private repo = 'anomalyco/plundernome'

  constructor(private http: HttpService) {}

  setVersion(v: string): void { this.currentVersion = v }

  async checkForUpdate(): Promise<AppUpdateInfo> {
    try {
      const res = await this.http.fetch(
        `https://api.github.com/repos/${this.repo}/releases/latest`
      )
      if (res.status !== 200) return this.noUpdate('API unavailable')
      const data = JSON.parse(res.body)
      const latest = ((data.tag_name as string) ?? '').replace(/^v/, '')
      return {
        latestVersion: latest,
        currentVersion: this.currentVersion,
        downloadUrl: (data.html_url as string) ?? '',
        releaseNotes: (data.body as string) ?? '',
        hasUpdate: this.compareVersions(latest, this.currentVersion) > 0,
      }
    } catch {
      return this.noUpdate('Network error')
    }
  }

  private noUpdate(reason: string): AppUpdateInfo {
    return {
      latestVersion: this.currentVersion,
      currentVersion: this.currentVersion,
      downloadUrl: '',
      releaseNotes: reason,
      hasUpdate: false,
    }
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const va = pa[i] ?? 0
      const vb = pb[i] ?? 0
      if (va > vb) return 1
      if (va < vb) return -1
    }
    return 0
  }
}
