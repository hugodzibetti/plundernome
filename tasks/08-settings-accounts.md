# Task 08 — Settings: Accounts & API Keys Page

## Context
After tasks 01, 05, 06 add debrid/cloud-save/IGDB features, users need a UI to configure
their API keys. Currently settings only has install paths, Wine config, Steam import. Need a
dedicated "Accounts" section in Settings with clearly labeled inputs for each service.

## Files to read before starting
- `src/ui/views/settings-view.ts` — existing settings layout
- `src/ui/widgets/steam-settings-group.ts` — pattern for a settings group widget
- `src/ui/widgets/wine-settings-group.ts` — another group pattern
- `src/services/gsettings.ts` — GSETTINGS_KEYS (includes keys added in tasks 01, 05, 06)
- `data/io.github.plundernome.gschema.xml` — confirm all new keys exist from prev tasks
- `src/ui/factory.ts` — createButton(), createLabel()

## Prerequisite
Tasks 01, 05, and 06 must be completed first — they add the GSettings keys this UI configures.
If running before those tasks, add the GSettings keys as part of this task.

## What to implement

### Step 1 — Debrid accounts group
New file: `src/ui/widgets/debrid-settings-group.ts` (max 120 lines)

`Adw.PreferencesGroup` titled "Download Acceleration (Debrid)":

- `Adw.ComboRow` titled "Provider":
  - Items: "None", "Real-Debrid", "AllDebrid", "Premiumize"
  - Bound to `debrid-provider` GSettings key (values: `''`, `'realdebrid'`, `'alldebrid'`, `'premiumize'`)

- `Adw.PasswordEntryRow` titled "API Key":
  - Bound to `debrid-api-key` GSettings key
  - Placeholder: "Paste your API key here"

- Status label that shows when provider is set: "✓ Configured" (green) or empty

- "Test Connection" button: calls debrid service `checkHealth()`, shows toast result.
  This needs the controller to pass a `onTestDebrid: () => Promise<boolean>` callback.

### Step 2 — Cloud saves group
New file: `src/ui/widgets/cloud-save-settings-group.ts` (max 120 lines)

`Adw.PreferencesGroup` titled "Cloud Saves":

- `Adw.SwitchRow`... wait, SwitchRow causes segfault in GJS. Use:
  `Adw.ActionRow` with title "Enable automatic cloud saves" + `Gtk.Switch` via `add_suffix()` + `set_activatable_widget()`
  Bound to `cloud-save-enabled` GSettings key.

- `Adw.EntryRow` "WebDAV URL" → `webdav-url` key
  Placeholder: "https://your-nextcloud.com/remote.php/dav/files/username/"

- `Adw.EntryRow` "Username" → `webdav-username` key

- `Adw.PasswordEntryRow` "Password" → `webdav-password` key

- Status row: "Ludusavi detected ✓" (read from controller, passed as prop) or
  "Ludusavi not found — install for best save detection"

- "Test WebDAV" button → show toast with connection result

### Step 3 — Metadata/artwork group
New file: `src/ui/widgets/metadata-settings-group.ts` (max 80 lines)

(This may already be defined in task 06 — check first, don't duplicate)

`Adw.PreferencesGroup` titled "Game Metadata & Artwork":

- Info label: "Cover art works without API keys. IGDB provides richer metadata."
- `Adw.EntryRow` "IGDB Client ID" → `igdb-client-id` key
- `Adw.PasswordEntryRow` "IGDB Client Secret" → `igdb-client-secret` key
- Link label: "Get IGDB credentials at api.igdb.com" (use `Gtk.LinkButton`)

### Step 4 — Add groups to settings view
File: `src/ui/views/settings-view.ts`

Import and instantiate each new group widget.
Add them to the settings page using `createSettingsPage()` from `src/ui/templates/settings-page.ts`.

Groups order:
1. General (existing: install path, download speed)
2. Accounts & Services (NEW: debrid, cloud saves, metadata)  
3. Compatibility (existing: Wine/Proton)
4. Integrations (existing: Steam import + NEW: Heroic import from task 04)
5. Developer / Logs (existing: error log)

### Step 5 — Pass callbacks from controller
File: `src/controller/settings-wirer.ts`

Add wiring functions for test callbacks:
- `wireDebridTest(settingsView, debridService)`
- `wireWebdavTest(settingsView, cloudSaveService)`

## Acceptance criteria
- Settings has clearly organized sections with Accounts group
- Debrid provider dropdown + API key field visible
- Cloud save toggle + WebDAV fields visible
- IGDB credentials fields visible
- Test buttons show toast with pass/fail result
- All fields auto-save to GSettings on change (use `Gio.Settings.bind()`)
- `npm run build` passes
- `npm run typecheck` passes
