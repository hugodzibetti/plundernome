import { describe, it, expect } from 'vitest'
import {
  getDefaultSteamPaths,
  parseSteamLibraryFolders,
  parseSteamAppManifest,
  steamAppToGame,
  type SteamApp,
} from '../steam-import'

describe('getDefaultSteamPaths', () => {
  it('returns array of 3 paths', () => {
    const paths = getDefaultSteamPaths()
    expect(paths).toHaveLength(3)
  })

  it('contains ~/.local/share/Steam', () => {
    expect(getDefaultSteamPaths()).toContain('~/.local/share/Steam')
  })

  it('contains ~/.steam/steam', () => {
    expect(getDefaultSteamPaths()).toContain('~/.steam/steam')
  })

  it('contains /usr/share/steam', () => {
    expect(getDefaultSteamPaths()).toContain('/usr/share/steam')
  })

  it('returns same reference each call', () => {
    expect(getDefaultSteamPaths()).toBe(getDefaultSteamPaths())
  })
})

describe('parseSteamLibraryFolders', () => {
  it('parses single mount path', () => {
    const vdf = `"libraryfolders"
{
  "0"
  {
    "path" "C:\\Program Files\\Steam"
  "mount" "C:/Program Files/Steam"
  }
}`
    const folders = parseSteamLibraryFolders(vdf)
    expect(folders).toEqual(['C:/Program Files/Steam'])
  })

  it('parses multiple mount paths', () => {
    const vdf = `"libraryfolders"
{
  "0"
  {
    "path" "C:\\Program Files\\Steam"
    "mount" "C:/Program Files/Steam"
  }
  "1"
  {
    "path" "D:\\SteamLibrary"
    "mount" "D:/SteamLibrary"
  }
}`
    const folders = parseSteamLibraryFolders(vdf)
    expect(folders).toEqual(['C:/Program Files/Steam', 'D:/SteamLibrary'])
  })

  it('returns empty array for content without mount', () => {
    const vdf = `"libraryfolders"
{
  "0"
  {
    "path" "C:\\Program Files\\Steam"
  }
}`
    const folders = parseSteamLibraryFolders(vdf)
    expect(folders).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseSteamLibraryFolders('')).toEqual([])
  })

  it('returns empty array for content with no matching quotes', () => {
    expect(parseSteamLibraryFolders('no quotes here')).toEqual([])
  })

  it('deduplicates multiple mount with same value', () => {
    const vdf = `"libraryfolders"
{
  "0"
  {
    "mount" "same/path"
  }
  "1"
  {
    "mount" "same/path"
  }
}`
    const folders = parseSteamLibraryFolders(vdf)
    expect(folders).toEqual(['same/path', 'same/path'])
  })
})

describe('parseSteamAppManifest', () => {
  const validManifest = `"AppState"
{
  "appid" "1234560"
  "name" "Hades"
  "installdir" "Hades"
  "CompatTool"
  {
    "name" "proton"
  }
}`

  it('parses appid', () => {
    const result = parseSteamAppManifest(validManifest)
    expect(result?.appId).toBe('1234560')
  })

  it('parses name', () => {
    const result = parseSteamAppManifest(validManifest)
    expect(result?.name).toBe('Hades')
  })

  it('parses installdir', () => {
    const result = parseSteamAppManifest(validManifest)
    expect(result?.installDir).toBe('Hades')
  })

  it('sets compatTool to undefined', () => {
    const result = parseSteamAppManifest(validManifest)
    expect(result?.compatTool).toBeUndefined()
  })

  it('returns null when appid is missing', () => {
    const content = `"AppState"
{
  "name" "Hades"
}`
    expect(parseSteamAppManifest(content)).toBeNull()
  })

  it('returns null when name is missing', () => {
    const content = `"AppState"
{
  "appid" "1234560"
}`
    expect(parseSteamAppManifest(content)).toBeNull()
  })

  it('returns null when both appid and name are missing', () => {
    expect(parseSteamAppManifest('{}')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseSteamAppManifest('')).toBeNull()
  })

  it('falls back installdir to name when missing', () => {
    const content = `"AppState"
{
  "appid" "1234560"
  "name" "Hades"
}`
    const result = parseSteamAppManifest(content)
    expect(result?.installDir).toBe('Hades')
  })

  it('parses numeric name', () => {
    const content = `"AppState"
{
  "appid" "1234560"
  "name" "12345"
}`
    const result = parseSteamAppManifest(content)
    expect(result?.name).toBe('12345')
  })

  it('parses name with special characters', () => {
    const content = `"AppState"
{
  "appid" "1234560"
  "name" "Cuphead (2017)"
}`
    const result = parseSteamAppManifest(content)
    expect(result?.name).toBe('Cuphead (2017)')
  })
})

describe('steamAppToGame', () => {
  const app: SteamApp = {
    appId: '1234560',
    name: 'Hades',
    installDir: 'Hades',
  }

  it('sets id as steam-{appId}', () => {
    const game = steamAppToGame(app, 'steam')
    expect(game.id).toBe('steam-1234560')
  })

  it('sets name from app', () => {
    const game = steamAppToGame(app, 'steam')
    expect(game.name).toBe('Hades')
  })

  it('sets sourceId from argument', () => {
    const game = steamAppToGame(app, 'my-source')
    expect(game.sourceId).toBe('my-source')
  })

  it('sets sourceGameId to appId', () => {
    const game = steamAppToGame({ ...app, appId: '999999' }, 'steam')
    expect(game.sourceGameId).toBe('999999')
  })

  it('sets URL to store.steampowered.com', () => {
    const game = steamAppToGame(app, 'steam')
    expect(game.url).toBe('https://store.steampowered.com/app/1234560')
  })

  it('sets sizeBytes to 0', () => {
    const game = steamAppToGame(app, 'steam')
    expect(game.sizeBytes).toBe(0)
  })

  it('sets downloadType to direct', () => {
    const game = steamAppToGame(app, 'steam')
    expect(game.downloadType).toBe('direct')
  })

  it('includes steam tag', () => {
    const game = steamAppToGame(app, 'steam')
    expect(game.tags).toContain('steam')
  })

  it('sets imageUrl with correct format', () => {
    const game = steamAppToGame({ ...app, appId: '555' }, 'steam')
    expect(game.imageUrl).toContain('/555/header.jpg')
  })

  it('sets lastUpdated to a valid ISO string', () => {
    const game = steamAppToGame(app, 'steam')
    expect(() => new Date(game.lastUpdated)).not.toThrow()
    expect(new Date(game.lastUpdated).toISOString()).toBe(game.lastUpdated)
  })
})