import type { FileEntry, Game, Source } from '../../src/domain/models'

export const FITGIRL_SOURCE: Source = {
  id: 'fitgirl',
  name: 'FitGirl Repacks',
  baseUrl: 'https://fitgirl-repacks.site',
  scrapeType: 'html',
  enabled: true,
  updateInterval: 360,
}

export const SAMPLE_GAME: Game = {
  id: 'a1b2c3d4',
  name: 'Hades',
  sourceId: 'fitgirl',
  sourceGameId: 'hades',
  url: 'https://fitgirl-repacks.site/hades/',
  description: 'Defy the god of the dead as you hack and slash out of the Underworld.',
  size: '14.2 GB',
  sizeBytes: 15248402432,
  lastUpdated: '2024-12-01T00:00:00.000Z',
  downloadType: 'torrent',
  tags: ['action', 'roguelike', 'singleplayer'],
}

export const WINDOWS_GAME_FILES: FileEntry[] = [
  { path: 'Hades/game.exe', name: 'game.exe', size: 8_000_000, isDirectory: false, extension: '.exe' },
  { path: 'Hades/_Redist/vc_redist.x64.exe', name: 'vc_redist.x64.exe', size: 14_000_000, isDirectory: false, extension: '.exe' },
  { path: 'Hades/_Redist/DXSETUP.exe', name: 'DXSETUP.exe', size: 250_000, isDirectory: false, extension: '.exe' },
  { path: 'Hades/data', name: 'data', size: 10_000_000_000, isDirectory: false, extension: '' },
  { path: 'Hades/Engine', name: 'Engine', size: 0, isDirectory: true, extension: '' },
]

export const LINUX_GAME_FILES: FileEntry[] = [
  { path: 'Hades/Hades.x86_64', name: 'Hades.x86_64', size: 15_000_000, isDirectory: false, extension: '.x86_64' },
  { path: 'Hades/Hades_Data', name: 'Hades_Data', size: 0, isDirectory: true, extension: '' },
]

export const STEAM_STUB_FILES: FileEntry[] = [
  { path: 'game/steam.exe', name: 'steam.exe', size: 500_000, isDirectory: false, extension: '.exe' },
  { path: 'game/Data/steamstub.dll', name: 'steamstub.dll', size: 100_000, isDirectory: false, extension: '.dll' },
]

export const NO_DEPS_FILES: FileEntry[] = [
  { path: 'game/game.exe', name: 'game.exe', size: 10_000_000, isDirectory: false, extension: '.exe' },
]
