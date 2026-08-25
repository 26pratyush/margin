# MARGIN-014 — Add salary-planning regression coverage and manual verification

## Parent

- Epic: [#22 — Core tracking and salary planning](https://github.com/26pratyush/margin/issues/22)
- Depends on: [#26 — MARGIN-013 minimal salary-planning workspace](https://github.com/26pratyush/margin/issues/26)
- Uses: [#8 — MARGIN-007 quality checks](MARGIN-007-quality-checks.md)

## Goal

Make the completed monthly salary-planning loop safe to extend by covering its public domain, persistence, backup, and UI boundaries, then verify the complete local flow with synthetic data in a fresh data directory.

## Coverage contract

- Keep pure planning calculations in `service/tests/unit/planning.test.mjs`.
- Keep SQLite restart, migration, reset, reconciliation, and duplicate-write behavior in `service/tests/integration/storage.test.mjs`.
- Keep loopback API behavior in `service/tests/integration/server.test.mjs`.
- Keep backup round-trip and legacy compatibility in `service/tests/unit/backup.test.mjs` and storage integration tests.
- Keep browser interaction and state behavior in `app/src/**/*.test.{ts,tsx}` using Vitest and Testing Library.
- Reuse deterministic synthetic fixtures and assert public contracts rather than SQLite table details.

The existing suites already cover most accepted planning scenarios. This task adds only the missing cases and makes the coverage boundaries explicit.

## Manual verification contract

Run the local application with a new temporary `MARGIN_DATA_DIR` and synthetic values only. Verify:

1. Salary and expense creation update the local ledger and summary.
2. Planning-cycle creation and expected-salary update survive a service restart.
3. Actual salary, spending, planned reserve, disposable balance, and locker state remain distinct.
4. Invalid amount/date/reserve input is rejected without a write.
5. JSON export, safe reset, restore preview, and restore preserve planning state.
6. Negative and zero-balance states remain visible and are not clamped.

Record the date, commit, environment, result, and any follow-up in `docs/TESTING.md`. Do not commit the temporary database, backup, screenshots containing real data, or generated demo data.

## Browser-smoke decision

No Playwright, Cypress, or other large browser framework is introduced for this slice. Vitest and Testing Library cover deterministic UI states and interactions; the fresh local flow supplies the end-to-end sanity check. A dedicated browser-smoke suite can be reconsidered when the app has a larger stable multi-page workflow.

## Out of scope

- New planning behavior or changes to ADR-003 semantics.
- Hosted deployment, account testing, bank integrations, performance benchmarking, or recurring automation.
- Schema, backup-format, PR-template, or broad GitHub Actions redesign.
