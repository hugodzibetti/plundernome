import type { GameID, PipelineState, PipelineStep, Result } from './models';

export type PipelineAction =
  | { type: 'START' }
  | { type: 'ADVANCE'; to: PipelineStep }
  | { type: 'FAIL'; error: string }
  | { type: 'SET_PROGRESS'; progress: number }
  | { type: 'RESET' };

type PipelineStepOrFailed = PipelineStep | 'failed';

export function isValidPipelineTransition(from: PipelineStep, to: PipelineStep): boolean {
  const transitions: Record<PipelineStep, PipelineStepOrFailed[]> = {
    downloading: ['verifying', 'failed'],
    verifying: ['extracting', 'failed'],
    extracting: ['running-installer', 'detecting-deps', 'failed'],
    'running-installer': ['detecting-deps', 'failed'],
    'detecting-deps': ['installing-deps', 'finding-exe', 'failed'],
    'installing-deps': ['finding-exe', 'failed'],
    'finding-exe': ['registering', 'failed'],
    registering: ['completed', 'failed'],
    completed: [],
  };
  const valid = transitions[from];
  return valid?.includes(to) ?? false;
}

export function createInitialPipelineState(gameId: GameID): PipelineState {
  return {
    gameId,
    step: 'downloading',
    status: 'idle',
    progress: 0,
  };
}

export function reducePipeline(state: PipelineState, action: PipelineAction): Result<PipelineState> {
  switch (action.type) {
    case 'START':
      if (state.status !== 'idle') {
        return { ok: false, error: `Cannot start pipeline in status: ${state.status}` };
      }
      return {
        ok: true,
        value: { ...state, status: 'running', startedAt: new Date().toISOString() },
      };

    case 'ADVANCE':
      if (state.status !== 'running') {
        return { ok: false, error: `Cannot advance pipeline in status: ${state.status}` };
      }
      if (!isValidPipelineTransition(state.step, action.to)) {
        return {
          ok: false,
          error: `Invalid transition: ${state.step} → ${action.to}`,
        };
      }
      return {
        ok: true,
        value: { ...state, step: action.to, progress: computeProgress(action.to) },
      };

    case 'FAIL':
      if (state.status === 'completed') {
        return { ok: false, error: 'Cannot fail a completed pipeline' };
      }
      return {
        ok: true,
        value: { ...state, status: 'failed', errorMessage: action.error },
      };

    case 'SET_PROGRESS':
      if (state.status !== 'running') return { ok: false, error: 'Not running' };
      return {
        ok: true,
        value: { ...state, progress: Math.max(0, Math.min(100, action.progress)) },
      };

    case 'RESET':
      return {
        ok: true,
        value: {
          gameId: state.gameId,
          step: 'downloading',
          status: 'idle',
          progress: 0,
        },
      };
  }
}

const stepProgressMap: Record<PipelineStep, number> = {
  downloading: 10,
  verifying: 20,
  extracting: 35,
  'running-installer': 45,
  'detecting-deps': 50,
  'installing-deps': 65,
  'finding-exe': 80,
  registering: 90,
  completed: 100,
};

function computeProgress(step: PipelineStep): number {
  return stepProgressMap[step] ?? 0;
}

export function getPipelineSteps(): PipelineStep[] {
  return [
    'downloading',
    'verifying',
    'extracting',
    'running-installer',
    'detecting-deps',
    'installing-deps',
    'finding-exe',
    'registering',
    'completed',
  ];
}

export function serializePipelineState(state: PipelineState): {
  step: string;
  status: string;
  progress: number;
  errorMessage?: string;
} {
  return { step: state.step, status: state.status, progress: state.progress, errorMessage: state.errorMessage };
}

export function deserializePipelineState(
  gameId: GameID,
  data: { step: string; status: string; progress: number; errorMessage?: string },
): PipelineState {
  return {
    gameId,
    step: data.step as PipelineStep,
    status: data.status as PipelineState['status'],
    progress: data.progress,
    errorMessage: data.errorMessage,
  };
}
