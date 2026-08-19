# Architecture

## Current boundary

```text
Local user
   ↓
Margin application
   ↓
Local persistence

GitHub ── source, issues, PRs, project tracking, Wiki, releases

GitHub Pages ── static product/demo website only
```

The product website is not the finance application. It must not call a Margin API or connect to the user's financial data.

## Selected v0.1 application shape

The finance app is a modular browser application rather than a distributed service:

```text
Browser at localhost
        ↓
React + TypeScript presentation
        ↓
Framework-independent domain modules
        ↓
Typed persistence/repository interface
        ↓
Dexie → IndexedDB
```

- Vite owns development, bundling, and the static production build.
- Node.js 24 LTS and npm provide the development toolchain.
- Export/import is a separate boundary for backup and portability.
- Test fixtures use synthetic financial records.

The domain layer must not import React or Dexie. UI components must not calculate balances or write directly to IndexedDB.

## Domain model direction

The first domain model is expected to include:

- `IncomeEntry`
- `ExpenseEntry`
- `Category`
- `Commitment`
- `PeriodSummary`

The model should preserve dates and amounts as first-class values. Calculation logic should not be hidden inside UI components.

## Data safety requirements

- Local data must be excluded from version control.
- Export format should be documented and deterministic.
- Import should validate records before writing them.
- Destructive operations should have clear confirmation and recovery expectations.
- Screenshots and demo fixtures must use synthetic values.
- Browser storage is origin-scoped and may be cleared or evicted; JSON backup is the lossless recovery path.
- The app should use a stable localhost origin and explain that changing the port or browser creates a separate data boundary.

## Deployment and container boundary

- The finance application remains local and has no hosted API or hosted database.
- The static site is built independently from `site/` and published to GitHub Pages after it has a real build.
- Docker or Podman may be used to make local development and CI reproducible, but containers must not move financial data into a hosted service.
- Container images, if introduced later, are packaging artifacts only and must contain code, dependencies, and synthetic fixtures—not local databases, credentials, or user records.
