# ADR-001 — Browser-local application stack with loopback SQLite for v0.1

- Status: Accepted, revised by MARGIN-010
- Date: 2026-08-19
- Issue: [MARGIN-002](https://github.com/26pratyush/margin/issues/3), revised by [MARGIN-010](https://github.com/26pratyush/margin/issues/15)

## Decision

Margin v0.1 will be a browser-based local single-page application served from `localhost`.

| Boundary               | Decision                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| UI/runtime             | React with TypeScript, built and served by Vite                                                            |
| Toolchain              | Node.js 24 LTS with npm and a committed lockfile                                                           |
| App shape              | Browser UI plus a loopback-only local service; no hosted API, account system, or cloud database            |
| Persistence            | File-backed SQLite through the local Node service, accessed behind a typed repository interface            |
| Reactive reads         | HTTP JSON reads from the local service; domain modules remain framework-independent                        |
| Domain logic           | Framework-independent TypeScript modules outside React components                                          |
| Unit/integration tests | Node's built-in test runner for service/domain contracts; UI tests can add a browser-oriented runner later |
| Browser smoke tests    | Deferred until the first interactive vertical slice exists                                                 |
| Packaging              | Source checkout plus npm scripts; optional static build and later container image                          |
| Backup                 | Versioned JSON export as the canonical backup, CSV export for interoperability                             |

The canonical local URL for development is `http://localhost:5173`; the service binds to `127.0.0.1:4318`. The SQLite file lives outside the repository in an OS-specific application-data directory, with `MARGIN_DATA_DIR` available as an absolute-path override.

## Why this fits Margin

- A browser app is platform-independent, easy to inspect, and can be run on macOS, Windows, and Linux with the same source and commands.
- Vite produces the browser build and a small Node service provides the local persistence boundary. React provides a familiar component model while TypeScript keeps domain and data contracts explicit.
- SQLite is file-backed, transactional, inspectable, and independent of browser profiles. The Node service keeps OS-specific paths and database details out of the browser UI.
- The implementation uses Node.js's built-in `node:sqlite` module, so the native setup adds no SQLite npm package, compiler toolchain, or Docker requirement.
- Keeping the domain layer and persistence behind interfaces preserves an escape hatch for a desktop wrapper or another adapter later without making one necessary now.
- The application can be deployed as local source/build artifacts while the public GitHub Pages site remains a separate product/demo site.

## Options considered

### Browser SPA with React, Vite, TypeScript, and IndexedDB

Selected for the UI, but not for the primary ledger. Browser storage is user- and origin-managed, so it cannot meet the requirement that records survive cache clearing and browser changes.

### Browser UI with a loopback Node service and file-backed SQLite

Selected for persistence. It keeps the UI browser-based and cross-platform while moving the durable ledger to a local file. Native npm setup remains the default; Docker is optional packaging and development tooling.

### Svelte or Vue browser SPA

Viable alternatives with similar deployment characteristics. They do not solve the persistence or backup problem, and choosing React gives the project a broad component/testing ecosystem without adding a server framework.

### Electron or Tauri desktop wrapper

Deferred. Both can package web UI for desktop platforms, but they add platform-specific packaging, update, signing, and native-boundary work before the browser requirements have been tested. Electron embeds Chromium and Node.js; a wrapper remains an escape hatch if browser storage or filesystem access becomes a demonstrated blocker.

### Browser app with a hosted backend

Rejected. It conflicts with the local-first boundary, introduces accounts and deployment/security costs, and is explicitly out of scope for the foundation epic.

### Persistence alternatives

- `localStorage` is rejected because it is synchronous, not suited to relational/query-heavy records, and too fragile for the application’s data boundary.
- SQLite compiled to WebAssembly is deferred. It may become useful if SQL queries or file-like database portability become necessary, but it adds a WASM/OPFS compatibility and packaging layer that v0.1 does not need.
- Raw IndexedDB is deferred to non-primary browser preferences or a future offline fallback; it is not the durable source of truth.

## Persistence and backup contract

The database adapter will expose domain-level operations rather than leaking SQLite tables or HTTP details into UI code. MARGIN-003 defines the entities and balance rules; MARGIN-006 implements the adapter and backup boundary.

- The database schema is versioned independently from the export format.
- JSON is the lossless, versioned backup format. It should include a format identifier, schema version, export timestamp, app version, and validated domain records.
- CSV is a secondary, human-readable export for selected records and interoperability; it is not the lossless restore format.
- Import must parse and validate the complete file before writing anything. v0.1 restore is an explicit replace operation after browser preview and confirmation, with an automatic local pre-restore JSON snapshot created first.
- Reset is an explicit destructive action that deletes the local database only after confirmation.
- Browser cache clearing and changing browser profiles do not remove the primary SQLite file, but moving to another machine still requires importing a JSON backup.
- No automatic cloud sync or telemetry is part of this decision.

## Fresh-clone and packaging path

MARGIN-004 materializes these canonical commands from the repository root:

```bash
npm ci
npm run dev
npm run build
npm run preview
```

The app is not packaged as a desktop executable for v0.1. Native npm setup remains the primary path. Docker/Podman may later provide reproducible development or CI environments, but a container volume must not be the only recovery path and images must never include local databases, credentials, or personal records.

## References

- [React: creating a React app](https://react.dev/learn/creating-a-react-app)
- [Vite getting started](https://vite.dev/guide/)
- [Node.js release guidance](https://nodejs.org/en/about/previous-releases)
- [MDN IndexedDB terminology](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology)
- [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Vitest getting started](https://vitest.dev/guide/)
- [Playwright installation and browser coverage](https://playwright.dev/docs/intro)
- [Electron overview](https://www.electronjs.org/docs/latest/)
