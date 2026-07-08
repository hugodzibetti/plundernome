import type { SaveManifest } from '../../domain/cloud-save/types'
import { SettingsManager } from '../gsettings'

const GLib = imports.gi.GLib

function webdavAuth(): Record<string, string> {
  const settings = new SettingsManager()
  const user = settings.getString('webdav-user')
  const pass = settings.getString('webdav-pass')
  if (!user || !pass) return {}
  const b64 = (GLib as any).base64_encode(new TextEncoder().encode(`${user}:${pass}`)) as string
  return { Authorization: `Basic ${b64}` }
}

function webdavUrl(): string {
  return new SettingsManager().getString('webdav-url')
}

export async function syncToWebdav(manifest: SaveManifest): Promise<boolean> {
  const url = webdavUrl()
  if (!url) return false
  const Soup = imports.gi.Soup
  const session = new Soup.Session()
  const manifestJson = JSON.stringify(manifest)
  const baseUrl = url.replace(/\/+$/, '')
  const msg = new Soup.Message({ method: 'PUT', uri: `${baseUrl}/${manifest.gameId}-${Date.now()}.json` })
  const data = new TextEncoder().encode(manifestJson)
  msg.set_request('application/json', 1 as any, data)
  const auth = webdavAuth()
  for (const [k, v] of Object.entries(auth)) msg.request_headers.append(k, v)
  try {
    session.send(msg, null)
    return msg.status_code === 200 || msg.status_code === 201 || msg.status_code === 204
  } catch {
    return false
  }
}

export async function syncFromWebdav(): Promise<SaveManifest[]> {
  const url = webdavUrl()
  if (!url) return []
  const Soup = imports.gi.Soup
  const baseUrl = url.replace(/\/+$/, '')
  const session = new Soup.Session()
  const propfind = new Soup.Message({ method: 'PROPFIND', uri: baseUrl })
  propfind.request_headers.append('Depth', '1')
  const auth = webdavAuth()
  for (const [k, v] of Object.entries(auth)) propfind.request_headers.append(k, v)
  try {
    session.send(propfind, null)
    if (propfind.status_code !== 207 && propfind.status_code !== 200) return []
    const xml = new TextDecoder().decode(propfind.response_body.flatten())
    const urls: string[] = []
    const hrefRe = /<d:href>([^<]+\.json)<\/d:href>/gi
    let m = hrefRe.exec(xml)
    while (m) { urls.push(m[1]!); m = hrefRe.exec(xml) }
    const results: SaveManifest[] = []
    for (const href of urls) {
      const fullUrl = href.startsWith('http') ? href : `${baseUrl}/${href.replace(/^\//, '')}`
      const get = new Soup.Message({ method: 'GET', uri: fullUrl })
      for (const [k, v] of Object.entries(auth)) get.request_headers.append(k, v)
      session.send(get, null)
      if (get.status_code === 200) {
        results.push(JSON.parse(new TextDecoder().decode(get.response_body.flatten())) as SaveManifest)
      }
    }
    return results
  } catch {
    return []
  }
}
