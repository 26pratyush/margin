# MARGIN-007 — Add automated quality checks

## Goal

Create a small, reliable quality gate that runs locally and in GitHub Actions.

## Checks

- Formatting.
- ESLint static analysis appropriate to the chosen stack.
- Unit tests for domain calculations, validation, and backup transformations.
- Integration tests for SQLite persistence and the loopback HTTP boundary.
- Coverage thresholds for service production modules.
- Build and TypeScript validation.

## Test design

- Keep pure unit tests separate from storage and HTTP integration tests.
- Use deterministic synthetic fixtures and isolated temporary data directories.
- Cover regression paths, normal/sanity paths, invalid inputs, boundary values, and rollback behavior.
- Keep test assertions on public contracts rather than SQLite implementation details.

## Acceptance criteria

- `npm run quality` documents and runs the complete local quality gate.
- GitHub Actions runs the same quality scripts on Pull Requests and pushes to `main`.
- Formatting, linting, test, coverage, type-check, and build failures are readable and actionable.
- Future service tests can be added under unit or integration boundaries without changing the root command.
- Synthetic financial data is used in tests.
