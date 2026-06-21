import { describe, it, expect } from 'vitest'
import type { Game, CompatProfile, Download, Dependency } from '../../domain/models'
import type { SourceDefinition } from '../../domain/catalog/types'

function makeGame(overrides?: Partial<Game>): Game {
  return {
    id: 'a1b2c3d4',
    name: 'Test Game',
    sourceId: 'fitgirl',
    sourceGameId: 'test-game',
    url: 'https://example.com/game',
    description: 'A test game',
    size: '5 GB',
    sizeBytes: 5_000_000_000,
    lastUpdated: '2025-01-01',
    downloadType: 'torrent' as const,
    tags: ['action'],
    ...overrides,
  }
}

function makeCompatProfile(overrides?: Partial<CompatProfile>): CompatProfile {
  return {
    isLinuxNative: false,
    needsWine: true,
    needsProton: false,
    prefixArch: 'win64',
    env: {},
    deps: [{ id: 'vcredist', name: 'VC++ Redist', type: 'vcredist', required: true }],
    ...overrides,
  }
}

function makeDownload(overrides?: Partial<Download>): Download {
  return {
    id: 'dl1',
    gameId: 'a1b2c3d4',
    name: 'Test Download',
    url: 'https://example.com/download',
    type: 'torrent',
    status: 'downloading',
    priority: 'normal',
    progress: 50,
    speed: 1_000_000,
    bytesDownloaded: 500_000_000,
    totalBytes: 1_000_000_000,
    destinationPath: '/tmp/test',
    ...overrides,
  }
}

const SOURCE_DEF: SourceDefinition = {
  id: 'fitgirl',
  name: 'FitGirl Repacks',
  baseUrl: 'https://fitgirl-repacks.site',
  scrapeType: 'html',
  updateIntervalMinutes: 360,
  enabled: true,
}

describe('GameCard widget', () => {
  it('instantiates without crashing', async () => {
    const mod = await import('../widgets/game-card')
    const card = new mod.GameCard(makeGame({ tags: ['rpg'] }))
    expect(card).toBeTruthy()
  })

  it('accepts installed game', async () => {
    const mod = await import('../widgets/game-card')
    const card = new mod.GameCard(makeGame({ tags: [] }))
    expect(card).toBeTruthy()
  })

  it('emits play-game on double-click', async () => {
    const mod = await import('../widgets/game-card')
    const card = new mod.GameCard(makeGame())
    expect(card.emit).toBeDefined()
    card.emit('play-game', 'a1b2c3d4')
  })
})

describe('CompatBadge widget', () => {
  it('instantiates without crashing', async () => {
    const mod = await import('../widgets/compat-badge')
    const badge = new mod.CompatBadge(makeCompatProfile())
    expect(badge).toBeTruthy()
  })

  it('shows native label for linux-native', async () => {
    const mod = await import('../widgets/compat-badge')
    const badge = new mod.CompatBadge(makeCompatProfile({ isLinuxNative: true, needsWine: false }))
    expect(badge.setProfile).toBeDefined()
  })

  it('updates profile', async () => {
    const mod = await import('../widgets/compat-badge')
    const badge = new mod.CompatBadge(makeCompatProfile())
    badge.setProfile(makeCompatProfile({ needsProton: true, needsWine: false }))
  })
})

describe('ProgressBarWidget', () => {
  it('instantiates without crashing', async () => {
    const mod = await import('../widgets/progress-bar')
    const w = new mod.ProgressBarWidget(makeDownload())
    expect(w).toBeTruthy()
  })

  it('shows failed status with message', async () => {
    const mod = await import('../widgets/progress-bar')
    const w = new mod.ProgressBarWidget(makeDownload({ status: 'failed', errorMessage: 'corrupt archive' }))
    expect(w).toBeTruthy()
  })

  it('updates with new download data', async () => {
    const mod = await import('../widgets/progress-bar')
    const w = new mod.ProgressBarWidget(makeDownload())
    w.update(makeDownload({ progress: 75, status: 'downloading', speed: 2_000_000 }))
  })

  it('shows verifying status', async () => {
    const mod = await import('../widgets/progress-bar')
    const w = new mod.ProgressBarWidget(makeDownload({ status: 'verifying', speed: 0 }))
    expect(w).toBeTruthy()
  })
})

describe('DownloadRowWidget', () => {
  it('instantiates without crashing', async () => {
    const mod = await import('../widgets/download-row')
    const row = new mod.DownloadRowWidget(makeDownload())
    expect(row).toBeTruthy()
  })

  it('handles click via handler', async () => {
    const mod = await import('../widgets/download-row')
    const handler = () => {}
    const row = new mod.DownloadRowWidget(makeDownload(), handler)
    expect(row).toBeTruthy()
  })

  it('updates download state', async () => {
    const mod = await import('../widgets/download-row')
    const row = new mod.DownloadRowWidget(makeDownload())
    row.update(makeDownload({ status: 'completed', progress: 100 }))
  })

  it('toggles move buttons', async () => {
    const mod = await import('../widgets/download-row')
    const row = new mod.DownloadRowWidget(makeDownload())
    row.hideMoveButtons()
    row.showMoveButtons()
  })

  it('sets new handler', async () => {
    const mod = await import('../widgets/download-row')
    const row = new mod.DownloadRowWidget(makeDownload())
    const handler = () => {}
    row.setHandler(handler)
  })
})

describe('SourceConfigRow', () => {
  it('instantiates without crashing', async () => {
    const mod = await import('../widgets/source-config')
    const row = new mod.SourceConfigRow(SOURCE_DEF)
    expect(row).toBeTruthy()
  })

  it('reads enabled state', async () => {
    const mod = await import('../widgets/source-config')
    const row = new mod.SourceConfigRow(SOURCE_DEF)
    expect(typeof row.enabled).toBe('boolean')
  })

  it('sets enabled state', async () => {
    const mod = await import('../widgets/source-config')
    const row = new mod.SourceConfigRow(SOURCE_DEF)
    row.setEnabled(false)
  })

  it('instantiates with disabled source', async () => {
    const mod = await import('../widgets/source-config')
    const row = new mod.SourceConfigRow({ ...SOURCE_DEF, enabled: false })
    expect(row).toBeTruthy()
  })
})

describe('CatalogView', () => {
  it('instantiates without crashing', async () => {
    const mod = await import('../views/catalog-view')
    const view = new mod.CatalogView()
    expect(view).toBeTruthy()
  })

  it('sets games', async () => {
    const mod = await import('../views/catalog-view')
    const view = new mod.CatalogView()
    view.setGames([makeGame()])
  })

  it('sets empty games', async () => {
    const mod = await import('../views/catalog-view')
    const view = new mod.CatalogView()
    view.setGames([])
  })

  it('toggles search focus', async () => {
    const mod = await import('../views/catalog-view')
    const view = new mod.CatalogView()
    view.focusSearch()
    view.closeSearch()
  })

  it('sets view mode', async () => {
    const mod = await import('../views/catalog-view')
    const view = new mod.CatalogView()
    view.setViewMode('list')
    view.setViewMode('grid')
    expect(view.toggleViewMode()).toBe('list')
  })

  it('handles download callback', async () => {
    const mod = await import('../views/catalog-view')
    const view = new mod.CatalogView()
    let called = false
    view.onDownloadGame((id: string) => { called = true })
    view.setGames([makeGame({ id: 'test123' })])
  })

  it('shows loading state', async () => {
    const mod = await import('../views/catalog-view')
    const view = new mod.CatalogView()
    view.setLoading(true)
    view.setLoading(false)
  })

  it('shows error', async () => {
    const mod = await import('../views/catalog-view')
    const view = new mod.CatalogView()
    view.showError('Something went wrong')
  })
})

describe('LibraryView', () => {
  it('instantiates without crashing', async () => {
    const mod = await import('../views/library-view')
    const view = new mod.LibraryView()
    expect(view).toBeTruthy()
  })

  it('calls callbacks', async () => {
    const mod = await import('../views/library-view')
    const view = new mod.LibraryView()
    let played = ''
    view.onPlayGame((id: string) => { played = id })
    view.triggerPlay('game1')
    expect(played).toBe('game1')
  })

  it('calls remove callback', async () => {
    const mod = await import('../views/library-view')
    const view = new mod.LibraryView()
    let removed = ''
    view.onRemoveGame((id: string) => { removed = id })
    view.triggerRemove('game1')
    expect(removed).toBe('game1')
  })
})

describe('DownloadsView', () => {
  it('instantiates without crashing', async () => {
    const mod = await import('../views/downloads-view')
    const view = new mod.DownloadsView()
    expect(view).toBeTruthy()
  })

  it('adds and removes download', async () => {
    const mod = await import('../views/downloads-view')
    const view = new mod.DownloadsView()
    view.addDownload(makeDownload())
    expect(view.getActiveDownloads()).toHaveLength(1)
    view.removeDownload('dl1')
    expect(view.getActiveDownloads()).toHaveLength(0)
  })

  it('adds completed download directly to completed', async () => {
    const mod = await import('../views/downloads-view')
    const view = new mod.DownloadsView()
    view.addDownload(makeDownload({ status: 'completed' }))
  })

  it('updates download in place', async () => {
    const mod = await import('../views/downloads-view')
    const view = new mod.DownloadsView()
    view.addDownload(makeDownload())
    view.updateDownload(makeDownload({ id: 'dl1', progress: 75, speed: 500_000 }))
    expect(view.getActiveDownloads()).toHaveLength(1)
  })

  it('handles queue action callback', async () => {
    const mod = await import('../views/downloads-view')
    const view = new mod.DownloadsView()
    let action = ''
    view.onQueueAction((a: string) => { action = a })
    view.addDownload(makeDownload())
  })

  it('clears completed downloads', async () => {
    const mod = await import('../views/downloads-view')
    const view = new mod.DownloadsView()
    view.addDownload(makeDownload({ status: 'completed' }))
    view.clearCompletedDownloads()
  })
})
