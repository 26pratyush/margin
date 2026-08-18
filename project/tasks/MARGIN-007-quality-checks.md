# MARGIN-007 — Add automated quality checks

## Goal

Create a small, reliable quality gate that runs locally and in GitHub Actions.

## Checks

- Formatting.
- Linting or static analysis appropriate to the chosen stack.
- Unit tests for domain calculations.
- Build or type-check validation where applicable.

## Acceptance criteria

- A documented local command runs the checks.
- GitHub Actions runs the same checks on Pull Requests.
- Failures are readable and actionable.
- Synthetic financial data is used in tests.
