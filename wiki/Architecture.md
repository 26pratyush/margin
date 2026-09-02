# Architecture

The finance application runs locally and owns local persistence. GitHub owns project history, documentation, project tracking, and releases. GitHub Pages hosts only the static product/demo website. There is no hosted Margin API or hosted finance database.

## Current local boundary

```text
Browser at localhost
        ↓
React + TypeScript presentation
        ↓
Framework-independent domain calculations
        ↓
Loopback Node service
        ↓
SQLite file and JSON backup/restore
```

The domain layer does not import React or SQLite. UI components do not calculate global balances or write directly to the database. The service owns dataset, summary, history, planning, commitment, reconciliation, and dedicated entry-lifecycle commands.

## v0.2.0 additions

The current release-preparation slice adds a read-only history projection with period/type/status filters and grouped civil-day presentation, atomic correction and terminal void operations, optional expense metadata with debit/credit direction, and balance-sync snapshots. Filtered history never replaces the global `/api/summary` calculation; only active entries affect balances.

The first-use guide stores only a versioned browser preference. Its synthetic preview uses fresh in-memory data through `/api/demo`, `/api/demo/history`, and `/api/demo/planning-cycles/:cycleKey`, with reference date `2026-08-15` and a reserve due `2026-08-31`. Demo mode is read-only, non-persistent, visibly labelled, and never accesses SQLite.

Docker or Podman may be used for reproducible local development and CI. Containers are packaging tools, not a hosted runtime for financial data.
