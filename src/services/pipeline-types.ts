import type { GameID, PipelineState, PipelineStep } from '../domain/models'

export type PipelineEventType = 'step-change' | 'error' | 'complete' | 'retry' | 'skip' | 'paused'

export interface PipelineEvent {
  type: PipelineEventType
  gameId: GameID
  state: PipelineState
  error?: string
  step?: PipelineStep
  retryCount?: number
  nextRetryDelay?: number
}
