# ADR-001 — Browser-local application stack for v0.1

- Status: Accepted
- Date: 2026-08-19
- Issue: [MARGIN-002](https://github.com/26pratyush/margin/issues/3)

## Decision

Margin v0.1 will be a browser-based local single-page application served from `localhost`.

| Boundary | Decision |
| --- | --- |
| UI/runtime | React with TypeScript, built and served by Vite |
| Toolchain | Node.js 24 LTS with npm and a committed lockfile |
| App shape | Static client application; no hosted API, account system, or cloud database |
| Persistence | IndexedDB through Dexie, accessed behind a typed repository interface |
| Reactive reads | Dexie live queries through `dexie-react-hooks` where screens need them |
| Domain logic | Framework-independent TypeScript modules outside React components |
| Unit/integration tests | Vitest with React Testing Library once implementation starts |
| Browser smoke tests | Playwright after the first runnable shell exists |
| Packaging | Source checkout plus npm scripts; optional static build and later container image |
| Backup | Versioned JSON export as the canonical backup, CSV export for interoperability |

The canonical local URL for development is `http://localhost:5173`. Browser storage is origin-scoped, so changing the host, scheme, or port creates a separate local data boundary. The app must make that boundary visible in its backup and recovery guidance.

## Why this fits Margin

- A browser app is platform-independent, easy to inspect, and can be run on macOS, Windows, and Linux with the same source and commands.
- Vite produces a static build without requiring a server runtime for the finance application. React provides a familiar component model while TypeScript keeps domain and data contracts explicit.
- IndexedDB is native browser persistence and works offline. Dexie supplies schema declarations, versioned upgrades, transactions, and a small query API without adding a backend.
- Keeping the domain layer and persistence behind interfaces preserves an escape hatch for a desktop wrapper or file-backed adapter later without making one necessary now.
- The application can be deployed as local source/build artifacts while the public GitHub Pages site remains a separate product/demo site.

## Options considered

### Browser SPA with React, Vite, TypeScript, and IndexedDB

Selected. It has the smallest operational footprint, supports static hosting and local execution, and satisfies the local-first boundary. Its main risk is that browser storage is user- and origin-managed rather than a directly visible file, so backup/export is a required product feature rather than an afterthought.

### Svelte or Vue browser SPA

Viable alternatives with similar deployment characteristics. They do not solve the persistence or backup problem, and choosing React gives the project a broad component/testing ecosystem without adding a server framework.

### Electron or Tauri desktop wrapper

Deferred. Both can package web UI for desktop platforms, but they add platform-specific packaging, update, signing, and native-boundary work before the browser requirements have been tested. Electron embeds Chromium and Node.js; a wrapper remains an escape hatch if browser storage or filesystem access becomes a demonstrated blocker.

### Browser app with a hosted backend

Rejected. It conflicts with the local-first boundary, introduces accounts and deployment/security costs, and is explicitly out of scope for the foundation epic.

### Persistence alternatives

- `localStorage` is rejected because it is synchronous, not suited to relational/query-heavy records, and too fragile for the application’s data boundary.
- SQLite compiled to WebAssembly is deferred. It may become useful if SQL queries or file-like database portability become necessary, but it adds a WASM/OPFS compatibility and packaging layer that v0.1 does not need.
- Raw IndexedDB is the underlying browser primitive, but Dexie is selected to make schema upgrades, transactions, and typed access safer and easier to test.

## Persistence and backup contract

The database adapter will expose domain-level operations rather than leaking Dexie tables into UI code. MARGIN-003 defines the entities and balance rules; MARGIN-006 implements the adapter and backup boundary.

- The database schema is versioned independently from the export format.
- JSON is the lossless, versioned backup format. It should include a format identifier, schema version, export timestamp, app version, and validated domain records.
- CSV is a secondary, human-readable export for selected records and interoperability; it is not the lossless restore format.
- Import must parse and validate the complete file before writing anything. v0.1 restore is an explicit replace operation after confirmation, with an export of the current dataset offered first.
- Reset is an explicit destructive action that deletes the local database only after confirmation.
- The app may request persistent browser storage with `navigator.storage.persist()`, but must not promise that browser storage alone is a backup.
- Private/incognito browsing, browser data clearing, quota pressure, and origin changes must be called out in the backup guidance.
- No automatic cloud sync or telemetry is part of this decision.

## Fresh-clone and packaging path

MARGIN-004 materializes these canonical commands from the repository root:

```bash
npm ci
npm run dev
npm run build
npm run preview
```

The app is not packaged as a desktop executable for v0.1. Docker/Podman may later provide a reproducible development or CI environment, but native npm setup remains the primary path. A container image, if eventually useful, is a packaging artifact and must never include local databases, credentials, or personal records.

## References

- [React: creating a React app](https://react.dev/learn/creating-a-react-app)
- [Vite getting started](https://vite.dev/guide/)
- [Node.js release guidance](https://nodejs.org/en/about/previous-releases)
- [MDN IndexedDB terminology](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology)
- [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Dexie API reference](https://dexie.org/docs/API-Reference)
- [Dexie React live queries](https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29)
- [Vitest getting started](https://vitest.dev/guide/)
- [Playwright installation and browser coverage](https://playwright.dev/docs/intro)
- [Electron overview](https://www.electronjs.org/docs/latest/)
