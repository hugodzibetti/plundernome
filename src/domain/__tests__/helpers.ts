import type { Game, Download, SourceID, GameID, DownloadPriority } from '../models'

let _counter = 0
function nextId(): GameID {
  _counter++
  return `game${String(_counter).padStart(8, '0')}` as GameID
}

export function makeGame(overrides?: Partial<Game>): Game {
  return {
    id: nextId(),
    name: 'Test Game',
    sourceId: 'fitgirl' as SourceID,
    sourceGameId: 'test-game-123',
    url: 'https://example.com/game',
    description: 'A test game',
    size: '5 GB',
    sizeBytes: 5_000_000_000,
    lastUpdated: '2025-01-01',
    downloadType: 'torrent',
    tags: [],
    ...overrides,
  }
}

export function makeDownload(overrides?: Partial<Download>): Download {
  const id = nextId()
  return {
    id,
    gameId: id,
    name: 'Test Download',
    url: 'https://example.com/download',
    type: 'torrent',
    status: 'queued',
    priority: 'normal' as DownloadPriority,
    progress: 0,
    speed: 0,
    bytesDownloaded: 0,
    totalBytes: 5_000_000_000,
    destinationPath: '/tmp/test',
    ...overrides,
  }
}

export function makeGames(count: number, overrides?: Partial<Game>): Game[] {
  return Array.from(
    { length: count },
    (_, i) => makeGame({
      ...overrides,
      name: overrides?.name ? `${overrides.name} ${i}` : `Test Game ${i}`,
    }),
  )
}
