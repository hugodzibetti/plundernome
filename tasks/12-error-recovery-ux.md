# Task 12 — Error Recovery UX

## Context
When downloads fail, extraction crashes, or Wine doesn't launch, users see raw technical error
strings or nothing at all. Goal: every failure in the pipeline shows a human-readable message
with one clear action. No technical jargon visible to the user. This is the core of "no hassle."

## Files to read before starting
- `src/services/pipeline-types.ts` — PipelineEvent, event types emitted
- `src/controller/pipeline-wirer.ts` — how pipeline events reach the UI
- `src/ui/widgets/pipeline-timeline.ts` — how steps are displayed
- `src/ui/widgets/download-row.ts` — download item with error state
- `src/controller/view-interfaces.ts` — IWindow.showToast, IDownloadsView
- `src/domain/models.ts` — PipelineStep union type
- `src/domain/pipeline.ts` — pipeline state machine
- `src/services/pipeline-orchestrator.ts` — retryStep(), retryMirror()

## What to implement

### Step 1 — Error message mapper
New file: `src/domain/error-messages.ts` (max 100 lines, pure TS — no GJS imports)

```ts
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
  extracting: (_e) => ({
    title: 'Extraction failed',
    description: 'The archive may be corrupted or incomplete. Re-download and try again.',
    primaryAction: { label: 'Re-download', action: 'retry' },
  }),
  'installing-deps': (_e) => ({
    title: 'Dependency install failed',
    description: 'Could not install required Windows components. Check your Wine installation.',
    primaryAction: { label: 'Retry', action: 'retry' },
    secondaryAction: { label: 'Skip', action: 'skip' },
  }),
  'running-installer': (_e) => ({
    title: 'Installer did not complete',
    description: 'The game installer exited unexpectedly. Try running with a different Proton version.',
    primaryAction: { label: 'Retry', action: 'retry' },
    secondaryAction: { label: 'Open Settings', action: 'open-settings' },
  }),
  'finding-exe': (_e) => ({
    title: 'Game executable not found',
    description: 'Installation completed but the game launcher could not be located. You may need to set the executable path manually.',
    primaryAction: { label: 'Open Settings', action: 'open-settings' },
  }),
  verifying: (_e) => ({ title: 'Verification failed', description: 'File integrity check failed. The download may be incomplete.', primaryAction: { label: 'Re-download', action: 'retry' } }),
  'detecting-deps': (_e) => ({ title: 'Dependency detection failed', description: 'Could not analyse the installer. Proceeding anyway.', primaryAction: { label: 'Continue', action: 'skip' } }),
  registering: (_e) => ({ title: 'Registration failed', description: 'Could not save the game to your library. Check available disk space.', primaryAction: { label: 'Retry', action: 'retry' } }),
  completed: (_e) => ({ title: 'Unexpected error', description: 'Something went wrong after installation.', primaryAction: { label: 'Retry', action: 'retry' } }),
}

export function mapPipelineError(step: PipelineStep, rawError: string): UserFacingError {
  const mapper = STEP_ERRORS[step]
  return mapper ? mapper(rawError) : { title: 'Unknown error', description: rawError, primaryAction: { label: 'Retry', action: 'retry' } }
}
```

Export from `src/domain/index.ts`.

### Step 2 — Error dialog component
New file: `src/ui/widgets/pipeline-error-dialog.ts` (max 100 lines)

```ts
import type { UserFacingError } from '../../domain/error-messages'

export function showPipelineErrorDialog(
  parent: Gtk.Window,
  gameName: string,
  error: UserFacingError,
  onAction: (action: string) => void,
): void {
  // Use Adw.AlertDialog (not deprecated AlertDialog)
  const dialog = new Adw.AlertDialog({
    heading: error.title,
    body: `${gameName}\n\n${error.description}`,
  })
  if (error.primaryAction) {
    dialog.add_response(error.primaryAction.action, error.primaryAction.label)
    dialog.set_response_appearance(error.primaryAction.action, Adw.ResponseAppearance.SUGGESTED)
  }
  if (error.secondaryAction) {
    dialog.add_response(error.secondaryAction.action, error.secondaryAction.label)
  }
  dialog.add_response('dismiss', 'Dismiss')
  dialog.connect('response', (_d: unknown, responseId: string) => {
    if (responseId !== 'dismiss') onAction(responseId)
  })
  dialog.present(parent)
}
```

### Step 3 — Replace raw error toasts in pipeline-wirer
File: `src/controller/pipeline-wirer.ts`

Find all places where `event.type === 'failed'` or similar error events trigger a toast.
Replace with:
```ts
import { mapPipelineError } from '../domain/error-messages'
import { showPipelineErrorDialog } from '../ui/widgets/pipeline-error-dialog'

// In the failed event handler:
const userError = mapPipelineError(event.step, event.state.errorMessage ?? '')
showPipelineErrorDialog(
  window as unknown as Gtk.Window,
  gameName,
  userError,
  (action) => {
    if (action === 'retry') pipeline.retryStep(event.gameId)
    if (action === 'retry-mirror') pipeline.retryMirror(event.gameId)
    if (action === 'skip') pipeline.skipStep?.(event.gameId)  // add skipStep if missing
    if (action === 'open-settings') window.navigateTo('settings')
  }
)
```

### Step 4 — Download row error state
File: `src/ui/widgets/download-row.ts`

When a download row shows `status === 'failed'`:
- Show the human-readable title (not raw error string) from `mapPipelineError`
- Show retry + mirror buttons inline in the row (not just in dialog)
- Color the row with `error` CSS class

### Step 5 — Add tests for error mapper
New file: `src/domain/__tests__/error-messages.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { mapPipelineError } from '../error-messages'

describe('mapPipelineError', () => {
  it('maps 403 to blocked message', () => {
    const e = mapPipelineError('downloading', 'HTTP 403 forbidden')
    expect(e.title).toBe('Download blocked')
    expect(e.primaryAction?.action).toBe('retry-mirror')
  })
  it('maps timeout to timeout message', () => {
    const e = mapPipelineError('downloading', 'ETIMEDOUT')
    expect(e.title).toBe('Download timed out')
  })
  it('maps extraction failure', () => {
    const e = mapPipelineError('extracting', 'unexpected end of archive')
    expect(e.title).toBe('Extraction failed')
    expect(e.primaryAction?.action).toBe('retry')
  })
})
```

## Acceptance criteria
- No raw error strings visible to user in any failure case
- Every pipeline failure shows dialog with human title + description + action button
- Retry button triggers `pipeline.retryStep()`
- Try Mirror button triggers `pipeline.retryMirror()`
- Download row shows friendly error inline (no dialog needed for minor failures)
- Domain tests pass: `npm run test:domain`
- `npm run build` passes
- `npm run typecheck` passes
