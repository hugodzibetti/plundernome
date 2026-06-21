# Feature: HTTP Service
## Interface file: src/services/types.ts (IHttpService)
## Owned files: src/services/http.ts
## Depends on: domain/models.ts, libsoup (gi://Soup)
## Dependents: catalog scraper, download manager
## Test command: gjs -m src/services/__tests__/http.test.js
## Test note: Needs GJS runtime. Use fixtures/http-responses/ for mock data.
## Implementation notes:
- Use GJS imports.gi.Soup for HTTP requests
- Session with retry, timeout, user-agent config
- Support GET (scraping HTML) and streaming download (file save with progress)
- Download resume via Range headers
- Progress callback for UI updates
## Interface to implement:
```
interface IHttpService {
  fetch(url: string, options?: HttpOptions): Promise<HttpResponse>
  download(url: string, dest: string, onProgress?: ProgressFn): Promise<DownloadResult>
}
```
