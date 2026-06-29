# Task 02 — Hoster Link Resolution (GoFile, MediaFire, Pixeldrain)

## Context
Game repacks on FitGirl/DODI often link to file hosters (GoFile, MediaFire, Pixeldrain,
DataNodes) rather than direct HTTP. Current code downloads the hoster page URL as-is and
fails. Need a pre-download step that detects hoster URLs and resolves them to direct download
links before passing to the pipeline.

## Files to read before starting
- `src/services/hosters/gofile.ts`
- `src/services/hosters/mediafire.ts`
- `src/services/hosters/pixeldrain.ts`
- `src/controller/download-handlers.ts` — where to inject resolver
- `src/services/http-types.ts` — IHttpService interface
- `src/domain/models.ts` — Game, DownloadType

## What to implement

### Step 1 — Create hoster resolver
New file: `src/services/hosters/resolver.ts` (max 100 lines)

```ts
import type { HttpService } from '../http'

export type HosterName = 'gofile' | 'mediafire' | 'pixeldrain' | 'datanodes' | 'direct'

export function detectHoster(url: string): HosterName {
  if (url.includes('gofile.io')) return 'gofile'
  if (url.includes('mediafire.com')) return 'mediafire'
  if (url.includes('pixeldrain.com')) return 'pixeldrain'
  if (url.includes('datanodes.to')) return 'datanodes'
  return 'direct'
}

export async function resolveHosterUrl(
  url: string,
  http: HttpService,
): Promise<{ resolvedUrl: string; hoster: HosterName }> {
  const hoster = detectHoster(url)
  if (hoster === 'direct') return { resolvedUrl: url, hoster }

  try {
    if (hoster === 'gofile') return { resolvedUrl: await resolveGofile(url, http) ?? url, hoster }
    if (hoster === 'mediafire') return { resolvedUrl: await resolveMediafire(url, http) ?? url, hoster }
    if (hoster === 'pixeldrain') return { resolvedUrl: resolvePixeldrain(url), hoster }
    if (hoster === 'datanodes') return { resolvedUrl: await resolveDatanodes(url, http) ?? url, hoster }
  } catch {}

  return { resolvedUrl: url, hoster }
}
```

Implement each resolver function in the same file:

**GoFile** — parse the file ID from URL `gofile.io/d/{id}`, call
`https://api.gofile.io/getContent?contentId={id}&token=&cache=true&password=`,
extract `data.contents[*].link` from JSON response.

**MediaFire** — fetch the page HTML, extract direct link from
`<a class="input popsok"` or `aria-label="Download file"` href attribute.

**Pixeldrain** — transform `pixeldrain.com/u/{id}` →
`pixeldrain.com/api/file/{id}?download` (direct link, no API needed).

**DataNodes** — fetch page HTML, extract `<a` with `download` attribute pointing to
a direct file URL.

### Step 2 — Export from hosters index
File: `src/services/hosters/index.ts`
Add: `export { resolveHosterUrl, detectHoster } from './resolver'`

### Step 3 — Inject into download handler
File: `src/controller/download-handlers.ts`

Import `resolveHosterUrl` from `'../services/hosters/resolver'`

After debrid resolution (or instead of, if debrid not configured), before `pipeline.start`:
```ts
const { resolvedUrl: finalUrl, hoster } = await resolveHosterUrl(resolvedUrl, http)
if (hoster !== 'direct') {
  win.showToast(`Resolved via ${hoster}`)
}
pipeline.start(game, finalUrl, downloadPath, mirrors).catch(() => {})
```

Need to pass `http: HttpService` into `buildDownloadHandler`. Update signature to accept it.
Update call site in `src/controller/index.ts` to pass `this.http`.

## Acceptance criteria
- URL `gofile.io/d/abc123` → resolves to direct file download URL
- URL `pixeldrain.com/u/abc123` → transforms to `pixeldrain.com/api/file/abc123?download`
- Direct HTTP URLs → pass through unchanged, no toast shown
- Hoster resolution failure → falls back to original URL, no crash
- `npm run build` passes
- `npm run typecheck` passes

## Do NOT touch
- `src/services/pipeline-orchestrator.ts`
- `src/domain/`
- Any UI view files
