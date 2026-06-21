import { describe, it, expect } from 'vitest'
import { validateImportPath, detectGameFromPath, suggestGameTitleFromPath } from '../library'
import { WINDOWS_GAME_FILES, NO_DEPS_FILES } from '../../../tests/fixtures/game-samples'

describe('validateImportPath', () => {
  it('accepts valid path', () => {
    const result = validateImportPath('/home/user/Games/MyGame')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('/home/user/Games/MyGame')
  })

  it('rejects empty path', () => {
    const result = validateImportPath('')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('empty')
  })

  it('rejects path without separator', () => {
    const result = validateImportPath('JustAName')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('separator')
  })

  it('accepts path with backslash', () => {
    const result = validateImportPath('C:\\Games\\MyGame')
    expect(result.ok).toBe(true)
  })

  it('accepts whitespace path after trim content', () => {
    const result = validateImportPath('  ')
    expect(result.ok).toBe(false)
  })
})

describe('suggestGameTitleFromPath', () => {
  it('extracts readable name from Linux path', () => {
    expect(suggestGameTitleFromPath('/home/user/Games/Hades-GOTY_Edition')).toBe('Hades GOTY Edition')
  })

  it('extracts name from Windows path', () => {
    expect(suggestGameTitleFromPath('C:\\Games\\Hades')).toBe('Hades')
  })

  it('handles single component path', () => {
    expect(suggestGameTitleFromPath('MyGame')).toBe('MyGame')
  })

  it('handles empty path', () => {
    expect(suggestGameTitleFromPath('')).toBe('Unknown')
  })

  it('handles path ending with slash', () => {
    expect(suggestGameTitleFromPath('/home/games/MyGame/')).toBe('MyGame')
  })

  it('handles multiple underscores and dashes', () => {
    expect(suggestGameTitleFromPath('/games/___My___Game___')).toBe('My Game')
  })

  it('handles version numbers in folder name', () => {
    expect(suggestGameTitleFromPath('/games/Game.Name.v1.2.3_Repack')).toBe('Game.Name.v1.2.3 Repack')
  })

  it('trims leading and trailing whitespace', () => {
    expect(suggestGameTitleFromPath('/games/  spaced-name  ')).toBe('spaced name')
  })

  it('collapses multiple spaces', () => {
    expect(suggestGameTitleFromPath('/games/Game    Name')).toBe('Game Name')
  })

  it('handles path with mixed separators', () => {
    expect(suggestGameTitleFromPath('/games\\subdir/Game_Name')).toBe('Game Name')
  })

  it('handles root path', () => {
    expect(suggestGameTitleFromPath('/')).toBe('Unknown')
  })

  it('handles deep nested path', () => {
    expect(suggestGameTitleFromPath('/a/b/c/d/e/f/g/h/i/j/MyGame_Final_v2')).toBe('MyGame Final v2')
  })
})

describe('detectGameFromPath', () => {
  it('extracts game name from folder name', () => {
    const result = detectGameFromPath(WINDOWS_GAME_FILES, 'Hades-GOTY_Edition')
    expect(result.gameName).toBe('Hades GOTY Edition')
  })

  it('runs compat detection on files', () => {
    const result = detectGameFromPath(WINDOWS_GAME_FILES, 'Hades')
    expect(result.compatProfile.needsWine).toBe(true)
    expect(result.compatProfile.mainExecutable).toBe('Hades/game.exe')
  })

  it('handles game with no special deps', () => {
    const result = detectGameFromPath(NO_DEPS_FILES, 'SimpleGame')
    expect(result.gameName).toBe('SimpleGame')
    expect(result.compatProfile.deps).toHaveLength(0)
  })
})
