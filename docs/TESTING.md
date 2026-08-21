# Testing and quality gates

Margin keeps quality checks local, deterministic, and runnable in GitHub Actions with the same npm commands.

## Commands

```bash
npm run format          # Format supported source and documentation files
npm run format:check    # Check formatting without changing files
npm run lint            # Run ESLint with warnings treated as failures
npm test                # Run the service and domain test suite
npm run test:coverage   # Run tests with enforced service coverage floors
npm run quality         # Run the complete local quality gate
```

`npm run quality` is the local pre-PR command. It runs formatting, linting, tests with coverage thresholds, TypeScript validation, and the production build. The `Local app check` workflow runs those same gates on pull requests and pushes to `main`, followed by the synthetic demo seed/reset checks.

## Test boundaries

Tests are separated by the boundary they exercise:

- `service/tests/unit/` tests pure calculations, validation, and backup transformations without SQLite or HTTP.
- `service/tests/integration/` tests the SQLite storage adapter and loopback HTTP API using temporary directories.
- `service/tests/fixtures/` contains reusable synthetic financial records only.
- Future UI behavior tests belong with the app test toolchain once the salary/expense flow has interactive forms. Browser smoke tests should be added only when a stable vertical slice exists.

Tests should assert public domain or service behavior rather than SQLite table details. Prefer table-driven cases and explicit expected values over snapshots. Every test must be isolated, use deterministic IDs/dates, and leave temporary data behind only inside its temporary directory.

## Coverage policy

The current service coverage floors are intentionally modest but regression-oriented:

- Lines: 80%.
- Branches: 60%.
- Functions: 85%.

The coverage command includes production service modules and excludes test fixtures and test files. Thresholds should be raised as domain behavior grows; adding an uncovered branch should not silently lower the existing floor.

## Test data and privacy

Use synthetic or redacted values in fixtures, tests, screenshots, and CI output. Never use a real salary, expense, account identifier, database, credential, or exported backup in the repository.
