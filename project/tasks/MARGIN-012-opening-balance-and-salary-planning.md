# MARGIN-012 — Implement the opening-balance and salary-planning model

## Parent

- Epic: [#22 — Core tracking and salary planning](https://github.com/26pratyush/margin/issues/22)
- Depends on: [#24 — MARGIN-011 planning and rollover rules](https://github.com/26pratyush/margin/issues/24)
- Builds on: [#15 — MARGIN-010 durable local SQLite storage](https://github.com/26pratyush/margin/issues/15); [#18 — MARGIN-006 versioned JSON backup boundary](https://github.com/26pratyush/margin/issues/18)

## Goal

Persist the minimum planning fact needed to evaluate an accepted calendar-month cycle while keeping actual ledger movement, expected salary, commitments, and disposable balance distinct.

## Contract

`PlanningCycle` records contain a deterministic `cycleKey`/`id`, canonical local `startOn` and exclusive `endOn` dates, optional expected salary inputs, and stable timestamps. Opening actual, actual salary, rollover, closing actual, remaining commitments, disposable balance, and salary status remain derived from existing ledger and commitment records.

The service exposes planning-cycle reads and writes through the loopback boundary. The browser UI does not calculate or persist planning values in this task.

## Persistence and compatibility

- Planning cycles use the existing collection-agnostic SQLite records table.
- SQLite record schema version 2 adds a per-record schema marker; existing records remain version 1.
- Dataset schema version 2 includes the `planningCycles` collection.
- Existing flat v1 and pre-planning v2 JSON backups restore with an empty planning-cycle collection.
- New JSON backups include planning cycles in deterministic order and preserve them losslessly.

## Validation and safety

- Cycle identity must match its calendar-month boundaries.
- Expected salary amounts are positive integer minor units.
- Expected salary dates must be valid and fall inside their cycle.
- Cycle identity and creation timestamps cannot be changed through updates.
- Failed validation, duplicate creation, restore, and reset operations preserve the existing local-data safety boundary.

## Out of scope

- The locker-style planning workspace.
- CSV restore, raw SQLite archives, bank integrations, recurring automation, hosted synchronization, or arbitrary allocation categories.
- Any new UI workflow or general-purpose budgeting engine.
