# Decision Log

## D-001 — Local-first application

Margin's working finance application runs locally. This protects the initial product from unnecessary cloud complexity and keeps real financial data out of the hosted demo.

## D-002 — GitHub Pages hosts only the product website

GitHub Pages is used for a static portfolio/product site containing screenshots, explanations, and project links. It is not a runtime for the finance app.

## D-003 — One repository, separate app and site directories

The local app and static product site live in separate top-level directories so they can evolve independently while sharing product context.

## Open decisions

- License.
- Optional PWA installation or desktop packaging if browser constraints justify it.

## Delivery policy

- Docker or Podman is optional local development and packaging tooling, not a hosted finance runtime.
- GitHub Actions and GitHub Pages are the planned free delivery path for the public static site.
- GitHub tags and Releases are the planned versioning path for source and synthetic build artifacts.

## D-004 — Browser-local application for v0.1

The finance application runs as a React and TypeScript browser SPA built with Vite and served locally from `localhost`. It has no hosted backend or account system.

## D-005 — IndexedDB with explicit export and restore

Local records use IndexedDB through Dexie behind a persistence interface. JSON is the lossless backup format, CSV is a secondary export, and browser storage is never treated as the only backup.

## D-006 — Reconciliation is an explicit adjustment

Margin compares the real account balance to calculated actual cash, not disposable balance after commitments. The difference is recorded as a linked reconciliation adjustment so omitted small transactions are visible without being falsely reconstructed.
