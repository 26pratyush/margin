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

The first domain model includes:

- `LedgerEntry` with income, expense, investment, refund, and adjustment types
- `Category`
- `Commitment`
- `BalanceSnapshot`
- `PeriodSummary`

The model preserves local dates and integer minor-unit amounts as first-class values. Actual ledger entries and planned commitments are separate concepts. Reconciliation snapshots compare calculated actual cash with a real balance and create explicit adjustment entries for the difference.

The calculation layer must expose actual closing balance and disposable balance separately. Disposable balance applies remaining commitment reservations after actual cash has been reconciled; it must never be used as the input to reconciliation.

## Data safety requirements

- Local data must be excluded from version control.
- Export format should be documented and deterministic.
- Import should validate records before writing them.
- Destructive operations should have clear confirmation and recovery expectations.
- Screenshots and demo fixtures must use synthetic values.
- Browser storage is origin-scoped and may be cleared or evicted; JSON backup is the lossless recovery path.
- The app should use a stable localhost origin and explain that changing the port or browser creates a separate data boundary.
- Reconciliation snapshots and their adjustment entries must be included in JSON backup/export so a restore preserves the user’s balance history.

## Deployment and container boundary

- The finance application remains local and has no hosted API or hosted database.
- The static site is built independently from `site/` and published to GitHub Pages after it has a real build.
- Docker or Podman may be used to make local development and CI reproducible, but containers must not move financial data into a hosted service.
- Container images, if introduced later, are packaging artifacts only and must contain code, dependencies, and synthetic fixtures—not local databases, credentials, or user records.
