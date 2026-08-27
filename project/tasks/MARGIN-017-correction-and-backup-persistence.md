# MARGIN-017 — Implement correction commands and backup-compatible persistence

- Epic: [#38 — Everyday tracking, safe correction, and onboarding](https://github.com/26pratyush/margin/issues/38)
- GitHub task: [#40](https://github.com/26pratyush/margin/issues/40)
- Priority: P0

## Goal

Implement the accepted safe-correction contract at the domain, service, SQLite, and JSON backup boundaries.

## Scope

- Add dedicated correction and void commands for supported active salary and expense entries.
- Preserve stable identity, status, correction history, timestamps, and links according to `MARGIN-016`.
- Recalculate actual, planning, commitment, reconciliation, and disposable outputs from the resulting active ledger.
- Extend migrations, backup validation, restore, and legacy compatibility only where required.
- Return deterministic not-found, validation, conflict, and repeated-submit responses.

## Acceptance criteria

- Valid correction and void commands work for supported records and reject unsupported or terminal records.
- Voided records survive restart and JSON round-trip while remaining excluded from active calculations.
- Existing v0.1.0 databases and backups remain readable without manual intervention.
- Tests cover duplicate requests, stale records, past cycles, category references, commitment links, reconciliation snapshots, and signed balances.

## Dependencies and non-goals

Depends on `MARGIN-016`. Do not expose generic collection deletion as the UX, and do not introduce hosted persistence or investment valuation.
