# DeepSeek Session Prompt

Copy-paste this as your FIRST message every session. Replace [TASK NUMBER] with the task to work on.

---

## Paste this to DeepSeek:

```
You are working on Plundernome, a GTK4 + Libadwaita gaming hub for GNOME Linux desktops.

Start by reading these files in order:
1. DEEPSEEK.md — master context, conventions, architecture
2. AGENTS.md — additional coding rules
3. tasks/INDEX.md — task queue
4. tasks/[TASK NUMBER]-[task-name].md — the specific task to implement

Rules:
- Read every file listed in the task's "Files to read" section before writing any code
- Implement only what the task describes — nothing more
- Run `npm run typecheck && npm run build` after implementation
- Report any file that exceeds 150 lines so it can be split
- Do not introduce npm packages — runtime is GJS, all libraries come from gi:// bindings
- If a task prerequisite is not met (e.g. task 08 requires tasks 01/05/06 to be done first), say so immediately

Start now: read DEEPSEEK.md.
```

---

## Task number reference

| # | Name | Depends on |
|---|------|------------|
| 01 | wire-debrid | — |
| 02 | hoster-resolution | — |
| 03 | protondb-auto-select | — |
| 04 | heroic-import | — |
| 05 | ludusavi-auto-backup | — |
| 06 | igdb-catalog-enrichment | — |
| 07 | discover-view | 06 (cover art needed) |
| 08 | settings-accounts | 01, 05, 06 |
| 09 | game-detail-media | 06 |
| 10 | adaptive-layout | — |
| 11 | lutris-import | — |
| 12 | error-recovery-ux | — |
| 13 | source-health-ui | — |

## Recommended order

Run tasks 01, 02, 03, 04, 05, 06 first (any order — no deps between them).
Then 07, 08, 09 (depend on 06).
Then 10, 11, 12, 13 (any order).

## Tips

- One task per session. DeepSeek loses track with multiple tasks in one context.
- If DeepSeek produces a file over 150 lines, ask it to split before continuing.
- After each task, do a quick `git commit` so you can roll back if the next task breaks something.
- Tasks 01 and 02 are the highest leverage — do these first. Broken downloads = broken app.
