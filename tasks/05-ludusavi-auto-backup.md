# Task 05 — Auto Cloud Save Backup on Game Exit

## Context
`CloudSaveService` in `src/services/cloud-save.ts` already has `backup(gameId)` and
`syncToWebdav(manifest)` methods. Ludusavi binary is detected at init. But backup is NEVER
called automatically — there is no hook on game exit. Goal: after every game session ends
(Wine process exits), automatically call backup + WebDAV sync. No user action required.

## Files to read before starting
- `src/services/cloud-save.ts` — CloudSaveService.backup(), syncToWebdav()
- `src/services/cloud-save-webdav.ts` — syncToWebdav implementation
- `src/services/launcher.ts` — Launcher.launch(), how process exit is detected
- `src/services/launcher-types.ts` — ILauncher, LaunchResult
- `src/services/gsettings.ts` — GSETTINGS_KEYS (need WEBDAV_URL etc)
- `src/controller/handlers.ts` — buildPlayHandler — wraps launcher.launch()
- `src/controller/view-interfaces.ts` — IWindow.showToast signature

## What to implement

### Step 1 — Add WebDAV GSettings keys
File: `data/io.github.plundernome.gschema.xml`

Add:
```xml
<key name="webdav-url" type="s">
  <default>''</default>
</key>
<key name="webdav-username" type="s">
  <default>''</default>
</key>
<key name="webdav-password" type="s">
  <default>''</default>
</key>
<key name="cloud-save-enabled" type="b">
  <default>false</default>
</key>
```

Update `src/services/gsettings.ts` GSETTINGS_KEYS:
```ts
WEBDAV_URL: 'webdav-url',
WEBDAV_USERNAME: 'webdav-username',
WEBDAV_PASSWORD: 'webdav-password',
CLOUD_SAVE_ENABLED: 'cloud-save-enabled',
```

### Step 2 — Pass WebDAV config to CloudSaveService
Read `src/services/cloud-save-webdav.ts` — check how it reads WebDAV credentials.
If it reads from GSettings internally, no change needed.
If not, update `syncToWebdav` to accept `{ url, username, password }` config object.

### Step 3 — Auto-backup in play handler
File: `src/controller/handlers.ts`

`buildPlayHandler` currently launches and forgets. Update it to:

1. Accept `cloudSave: CloudSaveService | null` and `win: IWindow` as additional params
2. After `launcher.launch(game, installPath)` awaits (the process exits), if result.success:
```ts
if (cloudSave) {
  win.showToast('Saving game data…', 'normal', 2)
  try {
    const manifest = await cloudSave.backup(game.id)
    if (manifest) {
      const synced = await cloudSave.syncToWebdav(manifest)
      win.showToast(synced ? 'Game saved to cloud ✓' : 'Backed up locally (WebDAV unavailable)')
    }
  } catch {
    win.showToast('Cloud save failed — data kept locally', 'high')
  }
}
```

Note: `launcher.launch()` is async and resolves when the process EXITS, not when it starts.
Verify this in `src/services/launcher.ts` — if launch() returns before exit, you need a
different hook. Check if launcher emits a 'finished' signal or returns a Promise that resolves
on exit. If launch() returns immediately, look for `onExit` callback pattern in launcher-types.ts.

### Step 4 — Update AppController play handler wiring
File: `src/controller/index.ts` and `src/controller/feature-wirers.ts`

Everywhere `buildPlayHandler(this.db, this.launcher, deps.window)` is called, add:
- `this.cloudSaveService` as 4th argument

### Step 5 — Cloud save settings UI
File: `src/ui/views/settings-view.ts` (or a new `src/ui/widgets/cloud-save-settings-group.ts`)

Add an `Adw.PreferencesGroup` titled "Cloud Saves":
- Toggle row: "Enable automatic cloud saves" → bound to `cloud-save-enabled` GSetting
- Entry row: "WebDAV URL" → bound to `webdav-url`
- Entry row: "Username" → bound to `webdav-username`
- Password entry row: "Password" → bound to `webdav-password` (use `Gtk.Entry` with `visibility=false`)
- Status label: "Ludusavi detected ✓" or "Ludusavi not found — using fallback save detection"

Use `Adw.EntryRow` for text entries (native GNOME pattern).
Use `Adw.PasswordEntryRow` for password.

## Acceptance criteria
- User enables cloud saves in settings, configures WebDAV URL
- User plays a game, closes it → toast "Saving game data…" then "Game saved to cloud ✓"
- No WebDAV configured → backup to local tmp, toast "Backed up locally"
- Ludusavi not installed → fallback save detection still runs
- Cloud save enabled=false → no backup attempt, no performance impact
- `npm run build` passes
- `npm run typecheck` passes
