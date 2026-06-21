import type { Game, GameID, SourceID, PipelineStep, PipelineState, Result } from './models'

export function createGameID(sourceId: SourceID, sourceGameId: string): GameID {
  const hash = simpleHash(`${sourceId}:${sourceGameId}`)
  return hash
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export function isValidGameID(id: string): id is GameID {
  return /^[0-9a-f]{8}$/.test(id)
}

export function validateGame(game: Game): Result<Game> {
  if (!game.name) return { ok: false, error: 'Game name is required' }
  if (!game.sourceId) return { ok: false, error: 'Source ID is required' }
  if (!isValidGameID(game.id)) return { ok: false, error: `Invalid GameID: ${game.id}` }
  if (game.sizeBytes < 0 || Number.isNaN(game.sizeBytes)) return { ok: false, error: 'sizeBytes must be non-negative' }
  return { ok: true, value: game }
}

export function createInitialPipelineState(gameId: GameID): PipelineState {
  return {
    gameId,
    step: 'downloading',
    status: 'idle',
    progress: 0,
  }
}

type PipelineStepOrFailed = PipelineStep | 'failed'

export function isValidPipelineTransition(from: PipelineStep, to: PipelineStep): boolean {
  const transitions: Record<PipelineStep, PipelineStepOrFailed[]> = {
    'downloading': ['verifying', 'failed'],
    'verifying': ['extracting', 'failed'],
    'extracting': ['detecting-deps', 'failed'],
    'detecting-deps': ['installing-deps', 'finding-exe', 'failed'],
    'installing-deps': ['finding-exe', 'failed'],
    'finding-exe': ['registering', 'failed'],
    'registering': ['completed', 'failed'],
    'completed': [],
  }
  const valid = transitions[from]
  return valid?.includes(to) ?? false
}
