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

## Test boundaries

Tests are separated by the boundary they exercise:

- `service/tests/unit/` tests pure calculations, validation, and backup transformations without SQLite or HTTP.
- `service/tests/unit/planning.test.mjs` covers calendar-cycle boundaries, rollover, salary states, commitments, and signed balances.
- `service/tests/integration/` tests the SQLite storage adapter and loopback HTTP API using temporary directories.
- `service/tests/fixtures/` contains reusable synthetic financial records only.
- `app/src/**/*.test.{ts,tsx}` tests browser-side amount/date helpers and interactive form behavior with Vitest and Testing Library.
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

## Coverage policy

The current service coverage floors are intentionally modest but regression-oriented:

- Lines: 80%.
- Branches: 60%.
- Functions: 85%.

The coverage command includes production service modules and excludes test fixtures and test files. Thresholds should be raised as domain behavior grows; adding an uncovered branch should not silently lower the existing floor.

## Test data and privacy

Use synthetic or redacted values in fixtures, tests, screenshots, and CI output. Never use a real salary, expense, account identifier, database, credential, or exported backup in the repository.
