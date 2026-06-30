import type { PipelineStep } from './models'

export interface UserFacingError {
  title: string
  description: string
  primaryAction?: { label: string; action: 'retry' | 'retry-mirror' | 'skip' | 'open-settings' }
  secondaryAction?: { label: string; action: 'retry' | 'retry-mirror' | 'skip' | 'open-settings' }
}

const STEP_ERRORS: Record<PipelineStep, (rawError: string) => UserFacingError> = {
  downloading: (e) => {
    if (e.includes('403') || e.includes('forbidden'))
      return { title: 'Download blocked', description: 'The server rejected the request. Try a different mirror or use a debrid service.', primaryAction: { label: 'Try Mirror', action: 'retry-mirror' }, secondaryAction: { label: 'Retry', action: 'retry' } }
    if (e.includes('timeout') || e.includes('ETIMEDOUT'))
      return { title: 'Download timed out', description: 'The server took too long to respond. Check your connection or try a mirror.', primaryAction: { label: 'Try Mirror', action: 'retry-mirror' }, secondaryAction: { label: 'Retry', action: 'retry' } }
    if (e.includes('404') || e.includes('not found'))
      return { title: 'File not found', description: 'This download link has expired. Try a different source.', primaryAction: { label: 'Try Mirror', action: 'retry-mirror' } }
    return { title: 'Download failed', description: 'Something went wrong. Try again or use a different mirror.', primaryAction: { label: 'Try Mirror', action: 'retry-mirror' }, secondaryAction: { label: 'Retry', action: 'retry' } }
  },
  extracting: () => ({
    title: 'Extraction failed',
    description: 'The archive may be corrupted or incomplete. Re-download and try again.',
    primaryAction: { label: 'Re-download', action: 'retry' },
  }),
  'installing-deps': () => ({
    title: 'Dependency install failed',
    description: 'Could not install required Windows components. Check your Wine installation.',
    primaryAction: { label: 'Retry', action: 'retry' },
    secondaryAction: { label: 'Skip', action: 'skip' },
  }),
  'running-installer': () => ({
    title: 'Installer did not complete',
    description: 'The game installer exited unexpectedly. Try running with a different Proton version.',
    primaryAction: { label: 'Retry', action: 'retry' },
    secondaryAction: { label: 'Open Settings', action: 'open-settings' },
  }),
  'finding-exe': () => ({
    title: 'Game executable not found',
    description: 'Installation completed but the game launcher could not be located. You may need to set the executable path manually.',
    primaryAction: { label: 'Open Settings', action: 'open-settings' },
  }),
  verifying: () => ({ title: 'Verification failed', description: 'File integrity check failed. The download may be incomplete.', primaryAction: { label: 'Re-download', action: 'retry' } }),
  'detecting-deps': () => ({ title: 'Dependency detection failed', description: 'Could not analyse the installer. Proceeding anyway.', primaryAction: { label: 'Continue', action: 'skip' } }),
  registering: () => ({ title: 'Registration failed', description: 'Could not save the game to your library. Check available disk space.', primaryAction: { label: 'Retry', action: 'retry' } }),
  completed: () => ({ title: 'Unexpected error', description: 'Something went wrong after installation.', primaryAction: { label: 'Retry', action: 'retry' } }),
}

export function mapPipelineError(step: PipelineStep, rawError: string): UserFacingError {
  const mapper = STEP_ERRORS[step]
  return mapper
    ? mapper(rawError)
    : { title: 'Unknown error', description: rawError, primaryAction: { label: 'Retry', action: 'retry' } }
}
