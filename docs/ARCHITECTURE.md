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

## Historical v0.1.0 release boundary

The first release is a usable local-first development release, not a hosted finance product. Its public promise is the smallest complete loop: record salary and expenses, plan a calendar month, reserve commitments without rewriting actual cash, understand disposable balance, and recover the local dataset through versioned JSON.

The static site may explain and demonstrate this loop with synthetic values, but it never imports the finance application, calls the loopback service, or receives user records. GitHub Releases contain source, documentation, and synthetic artifacts only. The public data and API contracts remain subject to deliberate stabilization before v1.0.0.

The product website is not the finance application. It must not call a Margin API or connect to the user's financial data.

## v0.2.0 release-preparation boundary

MARGIN-016 through MARGIN-021 extend the first local planning loop with safe correction and void lifecycle actions, filtered transaction history, optional expense metadata and explicit credit/debit direction, local balance-sync history, and an isolated first-use guide/demo. These capabilities remain local-only and are being prepared as the `v0.2.0` release; the tag and GitHub Release are still pending final review and merge.

## Current application shape

The finance app is a modular browser application with a local-only service boundary:

```text
Browser at localhost
        ↓
React + TypeScript presentation
        ↓
Framework-independent domain modules
        ↓
Typed persistence/repository interface
        ↓
127.0.0.1 Node service → SQLite file
```

- Vite owns development, bundling, and the static production build.
- Node.js 24 LTS and npm provide the development toolchain.
- The Node service binds to loopback only and uses an OS-specific application-data directory.
- Export/import is a separate boundary for backup and portability.
- Test fixtures use synthetic financial records.

The domain layer must not import React or SQLite. UI components must not calculate balances or write directly to the database.

## Service read/write boundaries

The loopback service owns both the authoritative dataset reads and all mutations:

```text
Browser reads:  /api/dataset, /api/summary, /api/history,
                /api/planning-cycles/*, /api/collections/commitments,
                /api/demo, /api/demo/history, /api/demo/planning-cycles/*

Browser writes: /api/entries, /api/entries/:id/correct,
                /api/entries/:id/void, /api/reconcile,
                /api/planning-cycles/*, /api/collections/commitments,
                /api/backup/validate, /api/backup/restore, /api/reset

All real writes → domain command → repository → local SQLite
Synthetic reads → fresh in-memory fixture → domain calculations
```

History is a read-only projection over entries and reconciliation snapshots. Its filters and totals never replace the global `/api/summary` calculation. Corrections are atomic void-and-replace commands; standalone void is terminal, and only active entries affect balances. The UI consumes these contracts and never bypasses the service.

## Domain model direction

The first domain model includes:

- `LedgerEntry` with income, expense, investment, refund, and adjustment types
- `Category`
- `Commitment`
- `BalanceSnapshot`
- `PeriodSummary`
- `PlanningCycle` inputs for a local calendar month
- History projections with date, type, status, and grouped-day presentation metadata

The model preserves local dates and integer minor-unit amounts as first-class values. Actual ledger entries and planned commitments are separate concepts. Reconciliation snapshots compare calculated actual cash with a real balance and create explicit adjustment entries for the difference.

The calculation layer must expose actual closing balance and disposable balance separately. Disposable balance applies remaining commitment reservations after actual cash has been reconciled; it must never be used as the input to reconciliation.

Planning-cycle calculations are an additional derived domain boundary over the same entries and commitments. A cycle persists only its identity, expected salary inputs, and timestamps. Opening actual cash comes from active entries before the cycle, actual salary comes from active income entries inside the cycle, and closing/disposable values are calculated rather than duplicated in storage.

## Data safety requirements

- Local data must be excluded from version control.
- Export format should be documented and deterministic.
- Import should validate records before writing them.
- Destructive operations should have clear confirmation and recovery expectations.
- Screenshots and demo fixtures must use synthetic values.
- Browser storage is not the primary ledger; JSON backup is the lossless recovery path.
- The app should use a stable localhost origin and explain that clearing browser data does not remove the SQLite file.
- Reconciliation snapshots and their adjustment entries must be included in JSON backup/export so a restore preserves the user’s balance history.

## First-use and demo boundary

The first-use guide is presentation state only. Its versioned `localStorage` flag (`margin.first-use-guide.v1`) is deliberately outside the domain dataset and backup contract. A successful empty-dataset load makes the guide eligible; Settings can reopen it without changing ledger data.

The synthetic preview is a separate read-only service projection over a fresh in-memory fixture. `/api/demo`, `/api/demo/history`, and `/api/demo/planning-cycles/:cycleKey` reuse domain calculations but never access SQLite. The fixture uses reference date `2026-08-15`, salary on August 1, early-month movements, and a reserve due August 31. The browser maintains a non-persistent synthetic mode with a visible banner, sends no write requests while active, and performs a real-dataset reload on exit. The existing CLI seed/reset tools remain explicit developer tooling and are not called by browser-facing onboarding.

## Deployment and container boundary

- The finance application remains local and has no hosted API or hosted database.
- The static site is built independently from `site/` and published to GitHub Pages after it has a real build.
- Docker or Podman may be used to make local development and CI reproducible, but containers must not move financial data into a hosted service.
- Native OS storage is the default for easy setup. Docker remains optional and should use an explicitly mounted host path rather than being the only recovery mechanism.
- Container images, if introduced later, are packaging artifacts only and must contain code, dependencies, and synthetic fixtures—not local databases, credentials, or user records.
