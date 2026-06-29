# Task 01 — Wire Debrid Backends into Download Flow

## Context
RealDebrid, AllDebrid, Premiumize services exist in `src/services/download/` but are never
used. Download handler calls `pipeline.start()` directly with the raw repack URL. Debrid
services unrestrict links → provide fast direct download URLs. Without this, users without
debrid get slow/broken downloads from hosters that throttle anonymous traffic.

## Files to read before starting
- `src/services/download/real-debrid.ts` — RealDebridService.unrestrict(link): Promise<string|null>
- `src/services/download/all-debrid.ts` — AllDebridService.unrestrict(link): Promise<string|null>
- `src/services/download/premiumize.ts` — PremiumizeService.unrestrict(link): Promise<string|null>
- `src/controller/download-handlers.ts` — buildDownloadHandler() — THIS is where to inject
- `src/services/gsettings.ts` — SettingsManager, GSETTINGS_KEYS
- `src/controller/index.ts` — AppController constructor — where services are instantiated
- `src/domain/models.ts` — Game type

## What to implement

### Step 1 — Add GSettings keys for debrid
File: `data/io.github.plundernome.gschema.xml`

Add these keys to the schema:
```xml
<key name="debrid-provider" type="s">
  <default>''</default>
</key>
<key name="debrid-api-key" type="s">
  <default>''</default>
</key>
```

Update `src/services/gsettings.ts` — add to GSETTINGS_KEYS:
```ts
DEBRID_PROVIDER: 'debrid-provider',   // 'realdebrid' | 'alldebrid' | 'premiumize' | ''
DEBRID_API_KEY: 'debrid-api-key',
```

### Step 2 — Create IDebridService interface
New file: `src/services/debrid-types.ts` (max 30 lines)
```ts
export interface IDebridService {
  unrestrict(url: string): Promise<string | null>
  checkHealth(): Promise<boolean>
}
```

### Step 3 — Create debrid resolver
New file: `src/services/debrid-resolver.ts` (max 80 lines)

```ts
import type { IDebridService } from './debrid-types'
import { RealDebridService } from './download/real-debrid'
import { AllDebridService } from './download/all-debrid'
import { PremiumizeService } from './download/premiumize'
import type { HttpService } from './http'

export function createDebridService(
  provider: string,
  apiKey: string,
  http: HttpService,
): IDebridService | null {
  if (!provider || !apiKey) return null
  if (provider === 'realdebrid') return new RealDebridService(http, apiKey)
  if (provider === 'alldebrid') return new AllDebridService(http, apiKey)
  if (provider === 'premiumize') return new PremiumizeService(http, apiKey)
  return null
}

export async function resolveUrl(
  url: string,
  debrid: IDebridService | null,
): Promise<string> {
  if (!debrid) return url
  const resolved = await debrid.unrestrict(url)
  return resolved ?? url
}
```

### Step 4 — Inject debrid into AppController
File: `src/controller/index.ts`

1. Import `createDebridService`, `resolveUrl` from `'../services/debrid-resolver'`
2. Add `private debrid: IDebridService | null = null` field
3. In constructor, after creating SettingsManager:
```ts
const provider = s.getString(GSETTINGS_KEYS.DEBRID_PROVIDER)
const apiKey = s.getString(GSETTINGS_KEYS.DEBRID_API_KEY)
this.debrid = createDebridService(provider, apiKey, this.http)
```
4. Pass `this.debrid` to `buildDownloadHandler`

### Step 5 — Use debrid in download handler
File: `src/controller/download-handlers.ts`

Update signature:
```ts
export function buildDownloadHandler(
  getGames: () => Game[],
  pipeline: PipelineOrchestrator,
  win: IWindow,
  downloadDir: string,
  getMirrors?: (sourceId: string) => string[],
  debrid?: IDebridService | null,
): (gameId: string) => void
```

Before calling `pipeline.start(...)`, resolve the URL:
```ts
import { resolveUrl } from '../services/debrid-resolver'
// ...
const resolvedUrl = debrid ? (await resolveUrl(game.url, debrid)) : game.url
pipeline.start(game, resolvedUrl, downloadPath, mirrors).catch(() => {})
```

If debrid resolution succeeds, show toast: `'Link resolved via debrid'`
If debrid resolution fails (returns original URL), show toast: `'Debrid failed — using direct link'`

## Acceptance criteria
- User with RealDebrid API key configured → download resolves through RealDebrid
- User without debrid → download uses original URL (no regression)
- `npm run build` passes
- `npm run typecheck` passes
- No new `as any` introduced

## Do NOT touch
- `src/services/pipeline-orchestrator.ts`
- `src/domain/` (pure domain, no GJS)
- Any UI view files
