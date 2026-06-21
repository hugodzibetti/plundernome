# Feature: Catalog Parser
## Interface file: src/domain/catalog/types.ts
## Owned files: src/domain/catalog/*
## Depends on: domain/models.ts (stable)
## Dependents: pipeline (uses ScrapeResult), UI catalog-view
## Test command: npx vitest src/domain/__tests__/parser.test.ts
## Agent notes: Pure TS, no GI. Parser extracts Game[] from scraped HTML.
## Current sources implemented: fitgirl (regex-based)
## Adding source: add SourceDefinition in types.ts, add parser fn in parser.ts, test with fixture HTML.
