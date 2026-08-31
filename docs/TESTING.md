# Testing and quality gates

Margin keeps quality checks local, deterministic, and runnable in GitHub Actions with the same npm commands.

## Commands

```bash
npm run format          # Format supported source and documentation files
npm run format:check    # Check formatting without changing files
npm run lint            # Run ESLint with warnings treated as failures
npm test                # Run the service and UI test suites
npm run test:service    # Run only the service, storage, and HTTP tests
npm run test:ui         # Run the React component and browser-side helper tests
npm run test:coverage   # Run tests with enforced service coverage floors
npm run quality         # Run the complete local quality gate
```

`npm run quality` is the local pre-PR command. It runs formatting, linting, service tests with coverage thresholds, React component tests, TypeScript validation, and the production build. The `Local app check` workflow runs those same gates on pull requests and pushes to `main`, followed by the synthetic demo seed/reset checks.

The independent product-site gate runs from `site/`:

```bash
cd site
npm ci
npm run format:check
npm run check
npm test
npm run build
```

## Test boundaries

Tests are separated by the boundary they exercise:

- `service/tests/unit/` tests pure calculations, validation, and backup transformations without SQLite or HTTP.
- `service/tests/unit/planning.test.mjs` covers calendar-cycle boundaries, rollover, salary states, commitments, signed balances, and month-end planning inputs.
- `service/tests/integration/` tests the SQLite storage adapter and loopback HTTP API using temporary directories.
- `service/tests/fixtures/` contains reusable synthetic financial records only.
- `app/src/**/*.test.{ts,tsx}` tests browser-side amount/date helpers, signed balance parsing, month-end date resolution, interactive transaction direction, balance-sync form behavior, and history presentation with Vitest and Testing Library.
- Browser smoke tests should be added only when a larger stable vertical slice exists.

Tests should assert public domain or service behavior rather than SQLite table details. Prefer table-driven cases and explicit expected values over snapshots. Every test must be isolated, use deterministic IDs/dates, and leave temporary data behind only inside its temporary directory.

## Salary-planning manual verification

For the MARGIN-014 planning regression flow, use a new temporary data directory so the normal local ledger remains untouched. Start the app with an absolute directory override, for example:

```bash
MARGIN_DATA_DIR=/tmp/margin-planning-manual-<run-id> npm run dev
```

With synthetic values only, verify:

1. Add a salary and an expense, then confirm the ledger and summary update.
2. Open Planning, set an expected salary, and confirm expected salary does not change actual balance.
3. Record actual salary and confirm expected, actual, spending, reserved, disposable, and closing values remain distinct.
4. Add a planned reserve and confirm actual balance is unchanged while reserved and disposable values update together with the locker.
5. Restart the local service and reopen the app; confirm the planning cycle and derived values persist.
6. Export JSON, reset local records, verify the empty state, restore the backup, and confirm planning state returns.
7. Try invalid amounts, invalid dates, duplicate planning-cycle creation, and a reserve that makes disposable balance negative; confirm readable errors and valid negative results.

Record the verification date, commit, runtime/browser, result, and follow-up here after the flow is completed. Keep temporary databases, backups, and screenshots outside the repository unless they contain only synthetic data and are intentionally needed as review evidence.

### MARGIN-014 verification record

Verification date: 2026-08-25
Branch: `codex/MARGIN-014-salary-planning-regression` (MARGIN-014 changeset)
Runtime: Node.js 26.5.0, Vite 8.2.1, synthetic `MARGIN_DATA_DIR` under `/private/tmp`
Browser: Vite served the UI successfully; interactive browser control was unavailable in this session, so UI behavior was covered by the focused Vitest/Testing Library suite instead.
Result: Local service flow passed create/read/update, actual-versus-reserved/disposable calculations, invalid and duplicate input handling, real `npm run dev` restart persistence, JSON validation, reset-to-empty, restore round-trip, negative disposable (`-₹8,000.00`), and zero-balance (`₹0.00`) states. No real financial data was used.
Follow-up: Repeat the checklist in an interactive browser before release review when browser control is available.

### MARGIN-015 release review record

Verification date: 2026-08-26
Branch: `codex/MARGIN-015-release-boundary-review`
Validated commit: `269a1f329e0b3ebf0c7b17f7746ab55a405ca8a6` (`main`, tagged `v0.1.0`)
Runtime: Node.js 26.5.0, npm 11.17.0, Vite 8.2.1, synthetic `MARGIN_DATA_DIR` under `/private/tmp`
Automated result: `npm run quality` passed; the independent site gate (`format:check`, `check`, `test`, and `build`) passed; the local app and built site preview each returned HTTP 200. Root service coverage was 92.87% lines, 80.60% branches, and 94.29% functions.
Synthetic flow result: create/read/update, actual-versus-reserved/disposable calculations, real `npm run dev` restart persistence, invalid input (`400`), duplicate planning-cycle input (`409`), versioned JSON validation, reset-to-empty, restore round-trip, negative disposable (`-₹11,250.00`), and zero-balance (`₹0.00`) states all passed. No real financial data was used.
UI result: focused React/Testing Library coverage passed (22 app tests) and the independent site suite passed (3 tests). Interactive desktop/mobile/keyboard/focus/reduced-motion review could not be run because browser control was unavailable in this session; this remains a pre-publication follow-up, not a product behavior change.
Pages result: the public GitHub Pages workflow completed successfully for the merged `main` commit and the site is available at [26pratyush.github.io/margin](https://26pratyush.github.io/margin/). No separate product defect issue was required by this run.
Release gates: merge, Pages verification, the annotated `v0.1.0` tag, and the [GitHub Release](https://github.com/26pratyush/margin/releases/tag/v0.1.0) are complete. Interactive browser review remains a documented follow-up. The repository license gate is complete: [PolyForm Noncommercial License 1.0.0](../LICENSE.md) is present.

### MARGIN-017 correction-persistence review record

Verification date: 2026-08-29
Branch: `codex/MARGIN-017-safe-correction-persistence`
Runtime: Node.js 26.5.0, npm 11.17.0, synthetic temporary data directories only
Automated result: `npm run quality` passed with 64 service tests, 22 UI tests, TypeScript validation, and production build. Service coverage was 94.05% lines, 83.43% branches, and 97.11% functions.
Correction result: dedicated correction and void commands passed field-matrix, active-only balance/planning, lineage, repeated-submit, stale-record, cross-target idempotency, commitment/refund dependency, reconciliation review, zero/negative balance, restart, and backup/restore coverage.
Compatibility result: the v3 startup migration preserves existing IDs and financial fields, aligns legacy entry timestamps with SQLite row versions, and keeps flat v1 and envelope v2 JSON backups readable without changing the backup format.
Privacy result: no real financial data, credentials, external API, or hosted persistence was introduced.

### MARGIN-018 history-filter review record

Verification date: 2026-08-30
Branch: `codex/MARGIN-018-transaction-history-filters`
Runtime: Node.js 26.5.0, npm 11.17.0, synthetic temporary data directories only
Automated result: `npm run quality` passed with 69 service tests, 29 UI tests, TypeScript validation, and production build. Service coverage was 94.24% lines, 83.05% branches, and 97.55% functions.
History result: local Monday-week, today/month/year rollover, leap-date, custom inclusive range, invalid-range, type/status filtering, voided correction lineage, balance-sync adjustments, zero-difference syncs, reconciliation review labels, deterministic ordering, and global-summary invariants passed.
UI result: preset selection, custom range application and reset, keyboard-accessible filter controls, civil-day grouping, empty/loading/error states, active/voided presentation, sync presentation, and responsive layout coverage passed. Interactive browser control was unavailable in this session; the service and UI behavior is covered by deterministic synthetic tests.
Privacy result: no real financial data, credentials, external API, hosted query service, persistence schema change, or backup format change was introduced.

### MARGIN-019 progressive-expense-metadata review record

Verification date: 2026-08-30
Branch: `codex/MARGIN-019-progressive-expense-metadata`
Runtime: Node.js 26.5.0, npm 11.17.0, synthetic temporary data directories only
Automated result: `npm run quality` passed with 76 service tests, 37 UI tests, TypeScript validation, and production build. Service coverage was 93.96% lines, 83.35% branches, and 97.60% functions.
Metadata and ledger result: amount-only expense creation passed validation, HTTP/storage persistence, positive amount/date guards, blank metadata normalization, no-blank-category behavior, normalized category reuse, unchanged debit totals, explicit credit-expense movement, commitment protection, and lossless backup/restore.
Planning and sync result: planned reserves now use the final civil day of their month (including leap-day/year rollover cases); signed reconciliation input creates the existing single credit/debit adjustment or a zero-difference snapshot, persists snapshot creation time, and rejects unknown command fields before writing.
UI result: optional metadata labels, explicit `Uncategorized` selection, amount-only submission, expense debit/credit controls with debit default, signed/zero balance-sync input, sync errors, month-end due-date presentation, existing category selection, inline category creation, stable history fallback labels, and keyboard focus coverage passed. Interactive browser control was unavailable in this session; responsive and reduced-motion behavior remain defined by the existing CSS boundary.
Synthetic result: seeded local data, added synthetic amount-only and credit-expense records, confirmed debit/credit balance behavior and no new category for absent metadata, exercised balance reconciliation, and restored the exported backup successfully. No real financial data was used.
Privacy result: no real financial data, credentials, external API, hosted persistence, destructive migration, or backup-format change was introduced; the optional expense direction and snapshot creation timestamp remain compatible with legacy records.

## Coverage policy

The current service coverage floors are intentionally modest but regression-oriented:

- Lines: 80%.
- Branches: 60%.
- Functions: 85%.

The coverage command includes production service modules and excludes test fixtures and test files. Thresholds should be raised as domain behavior grows; adding an uncovered branch should not silently lower the existing floor.

## Test data and privacy

Use synthetic or redacted values in fixtures, tests, screenshots, and CI output. Never use a real salary, expense, account identifier, database, credential, or exported backup in the repository.
