# Feature: Database Service
## Interface file: src/services/types.ts (IDatabaseService)
## Owned files: src/services/database.ts
## Depends on: domain/models.ts, Gda (gi://Gda)
## Dependents: library, pipeline logging
## Schema: see AGENTS.md → DB schema section
## Implementation notes:
- Use imports.gi.Gda for SQLite connection
- Call migrate() on first connect — create tables if not exist
- query() returns rows as objects, execute() returns affected count
- Connection pooling not needed (single-user desktop app)