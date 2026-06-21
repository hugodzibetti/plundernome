import type { IWineManager, WineVersion, InstallResult } from './types'

const GITHUB_API = 'https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases'

export class WineManager implements IWineManager {
  private basePath: string

  constructor() {
    this.basePath = `${imports.gi.GLib.get_home_dir()}/.local/share/plundernome/wine`
  }

  private vDir(): string { return `${this.basePath}/versions` }

  async listAvailableVersions(): Promise<WineVersion[]> {
    const Soup = imports.gi.Soup
    const session = new Soup.Session()
    const msg = new Soup.Message({ method: 'GET', uri: GITHUB_API })
    msg.request_headers.append('Accept', 'application/json')
    msg.request_headers.append('User-Agent', 'Plundernome/0.1')
    await this.sendAsync(session, msg)
    if (msg.status_code !== 200) return []
    const decoder = new TextDecoder()
    let releases: unknown[]
    try { releases = JSON.parse(decoder.decode(msg.response_body.flatten())) } catch { return [] }
    const installed = await this.getInstalledVersions()
    const installedIds = installed.map(v => v.id)
    return releases.map((r: unknown) => {
      const release = r as { tag_name: string; assets: { name: string; browser_download_url: string; size: number }[] }
      const tag = release.tag_name
      const asset = release.assets.find(a =>
        a.name.endsWith('.tar.gz') || a.name.endsWith('.tar.xz')
      )
      const id = tag.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      return { id, name: tag, type: 'ge-proton', version: tag.replace(/^GE-Proton/, ''), downloadUrl: asset?.browser_download_url ?? '', sizeBytes: asset?.size ?? 0, installed: installedIds.includes(id) } as WineVersion
    })
  }

  async installVersion(version: WineVersion): Promise<InstallResult> {
    const { GLib, Gio, Soup } = imports.gi
    const installPath = `${this.vDir()}/${version.id}`
    Gio.File.new_for_path(this.vDir()).make_directory_with_parents(null)
    const tmpPath = `${GLib.get_tmp_dir()}/plundernome-wine-${version.id}.tar.gz`
    const session = new Soup.Session()
    const msg = new Soup.Message({ method: 'GET', uri: version.downloadUrl })
    msg.request_headers.append('User-Agent', 'Plundernome/0.1')
    await this.sendAsync(session, msg)
    if (msg.status_code !== 200) return { success: false, action: 'download', errorMessage: `HTTP ${msg.status_code}` }
    const bodyBytes = msg.response_body.flatten()
    const f = Gio.File.new_for_path(tmpPath)
    const out = f.replace(null, false, Gio.FileCreateFlags.NONE, null)
    out.write(bodyBytes, null); out.close(null)
    Gio.File.new_for_path(installPath).make_directory_with_parents(null)
    const [exitStatus] = GLib.spawn_command_line_sync(`tar -xzf "${tmpPath}" -C "${installPath}" --strip-components=1`)
    GLib.remove(tmpPath)
    if (exitStatus !== 0) return { success: false, action: 'extract', errorMessage: `tar exit ${exitStatus}` }
    return { success: true, action: 'install' }
  }

  async removeVersion(versionId: string): Promise<InstallResult> {
    const { GLib } = imports.gi
    const dirPath = `${this.vDir()}/${versionId}`
    if (!GLib.file_test(dirPath, GLib.G_FILE_TEST_EXISTS)) return { success: false, action: 'remove', errorMessage: 'Version not found' }
    const [exitStatus] = GLib.spawn_command_line_sync(`rm -rf "${dirPath}"`)
    if (exitStatus !== 0) return { success: false, action: 'remove', errorMessage: `rm exit ${exitStatus}` }
    return { success: true, action: 'remove' }
  }

  async getInstalledVersions(): Promise<WineVersion[]> {
    const { Gio } = imports.gi
    const dir = Gio.File.new_for_path(this.vDir())
    if (!dir.query_exists(null)) return []
    const enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null)
    const names: string[] = []
    let info = enumerator.next_file(null)
    while (info) { if (info.get_file_type() === Gio.FileType.DIRECTORY) names.push(info.get_name()); info = enumerator.next_file(null) }
    return names.map(name => ({ id: name, name, type: 'ge-proton' as const, version: name, downloadUrl: '', sizeBytes: 0, installed: true, installPath: `${this.vDir()}/${name}` }))
  }

  private async sendAsync(session: SoupSession, msg: SoupMessage): Promise<number> {
    const s = session as unknown as { send_async?: (m: unknown, c: unknown, cb: (s: unknown, r: unknown) => void) => void; send_finish?: (r: unknown) => number }
    if (s.send_async && s.send_finish) {
      return new Promise((resolve, reject) => {
        s.send_async!(msg, null, (_session: unknown, _result: unknown) => {
          try {
            const status = s.send_finish!(_result)
            resolve(status)
          } catch (e) {
            reject(e)
          }
        })
      })
    }
    return session.send(msg, null)
  }

  async setDefaultVersion(versionId: string): Promise<void> {
    const { Gio } = imports.gi
    const linkFile = Gio.File.new_for_path(`${this.basePath}/default`)
    if (linkFile.query_exists(null)) linkFile.delete(null)
    linkFile.make_symbolic_link(`${this.vDir()}/${versionId}`, null)
  }

  async getDefaultVersion(): Promise<WineVersion | null> {
    const { GLib } = imports.gi
    const linkPath = `${this.basePath}/default`
    if (!GLib.file_test(linkPath, GLib.G_FILE_TEST_EXISTS)) return null
    try {
      const target = GLib.file_read_link(linkPath)
      const name = target.split('/').pop() ?? ''
      return { id: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'), name, type: 'ge-proton', version: name, downloadUrl: '', sizeBytes: 0, installed: true, installPath: target }
    } catch { return null }
  }
}
