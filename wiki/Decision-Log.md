# Decision Log

## D-001 — Local-first application

Margin's working finance application runs locally. This protects the initial product from unnecessary cloud complexity and keeps real financial data out of the hosted demo.

## D-002 — GitHub Pages hosts only the product website

GitHub Pages is used for a static portfolio/product site containing screenshots, explanations, and project links. It is not a runtime for the finance app.

## D-003 — One repository, separate app and site directories

The local app and static product site live in separate top-level directories so they can evolve independently while sharing product context.

## Open decisions

- Optional PWA installation or desktop packaging if browser constraints justify it.

## Delivery policy

- Docker or Podman is optional local development and packaging tooling, not a hosted finance runtime.
- GitHub Actions and GitHub Pages are the planned free delivery path for the public static site.
- GitHub tags and Releases are the planned versioning path for source and synthetic build artifacts.

## D-004 — Browser-local application for v0.1

The finance application runs as a React and TypeScript browser SPA built with Vite and served locally from `localhost`. It has no hosted backend or account system.

## D-005 — SQLite with explicit JSON export and restore

Local records use a loopback-only Node service backed by SQLite behind a persistence interface. JSON is the lossless, versioned backup format, CSV is not the v0.1 restore path, and browser storage is never treated as the primary ledger or only backup.

## D-006 — Reconciliation is an explicit adjustment

Margin compares the real account balance to calculated actual cash, not disposable balance after commitments. The difference is recorded as a linked reconciliation adjustment so omitted small transactions are visible without being falsely reconstructed.

## D-007 — Monthly planning separates held, arriving, moved, committed, and available money

Margin's first planning loop uses local calendar-month cycles. Opening actual balance is derived from active ledger movements before the cycle; actual salary is counted only when an income entry occurs; expected salary is informational until then; and rollover uses actual closing cash rather than disposable balance. Remaining commitments are reserved after actual cash is calculated, so planned money is not mistaken for money already spent.

The normative rules and synthetic examples are recorded in [ADR-003 — Monthly planning and rollover rules](../docs/decisions/ADR-003-monthly-planning-and-rollover.md).

## D-008 — Planning cycles persist inputs and derive outcomes

Planning cycles are stored locally as deterministic calendar-month records containing expected salary inputs and timestamps. The SQLite record boundary is versioned without creating a parallel planning table, and JSON backup/restore preserves the new collection while migrating older backups with no planning state to an empty collection. Opening actual cash, actual salary, rollover, closing actual, commitment reservations, disposable balance, and salary variance remain derived from the existing ledger and commitments.

## D-009 — v0.1.0 is the first coherent local planning release

The initial release is named `v0.1.0` because the completed scope is an initial-development product boundary, not a promise that the public data and API contracts can never change. It includes the smallest usable salary, expense, planning, commitment, disposable-balance, locker, and JSON recovery loop. Hosted accounts, bank integrations, recurring automation, broad analytics, and desktop packaging remain deferred. The next product slice must be selected and tracked separately after the release review.

## D-010 — Ledger correction is the next smallest product slice

After v0.1.0, the recommended next slice is safe ledger correction: editing or voiding an existing salary or expense with explicit confirmation and recalculated summaries. This improves trust in the local ledger before adding analytics, recurring automation, or hosted integrations. It remains a separate product issue and is not part of the release boundary.

## D-011 — PolyForm Noncommercial licensing

Margin is source-available under the PolyForm Noncommercial License 1.0.0. It permits personal and other permitted noncommercial use, modification, and redistribution while reserving commercial rights. This intentionally is not OSI-approved open source because the Open Source Definition requires commercial use to be allowed. Third-party dependencies and assets retain their own licenses.

## D-012 — Post-v0.1 work prioritizes everyday trust

After the v0.1.0 release, EPIC-003 prioritizes safe correction of ordinary salary and expense records, period-based history review, progressive expense metadata, and isolated synthetic onboarding. Investment portfolio valuation is deferred until Margin defines cost basis, current-value sources, realized versus unrealized performance, and liquidation semantics. Developer skills and broad Actions improvements remain a separate workflow epic.
