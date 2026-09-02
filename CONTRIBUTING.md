# Contributing to Margin

Margin is being developed as a local-first personal finance product. Contributions should preserve that boundary and keep the product understandable.

## Before starting

- Read [the project context](docs/PROJECT_CONTEXT.md).
- Check the relevant epic and task brief in `project/`.
- Confirm that the issue's acceptance criteria are clear.
- Do not use real personal financial data in screenshots, tests, fixtures, or commits.

## Local development

Use Node.js 24 LTS and npm. From the repository root, install the locked dependencies and start the local browser app:

```bash
npm ci
npm run dev
```

Before opening a Pull Request, run at least:

```bash
npm run quality
```

The quality command runs formatting, linting, service/domain tests with coverage thresholds, TypeScript validation, and the production build. Keep unit tests separate from storage/HTTP integration tests as described in [Testing and quality gates](docs/TESTING.md).

For focused iteration, use `npm run test:service` for the Node service/domain suite and `npm run test:ui` for the Vitest/Testing Library suite. If a change touches `site/`, also run its independent `npm run format:check`, `npm run check`, `npm test`, and `npm run build` commands from `site/`.

The synthetic demo path is available through `npm run demo:seed` and `npm run demo:reset`. It operates only on the generated `app/public/demo-data.json` file. Never place real financial records in the demo fixture, repository, screenshots, or issues.

## Branches

Use focused branches named after the work:

```text
feat/MARGIN-008-salary-expense-balance
fix/MARGIN-012-negative-balance-display
docs/MARGIN-004-local-setup
```

## Pull Requests

Every Pull Request should:

- Link the GitHub Issue it addresses.
- Explain the user or developer impact.
- State what was tested locally.
- Include screenshots for meaningful UI changes.
- Call out data-model, privacy, or backup implications.
- Avoid unrelated cleanup.

## Definition of done

A task is complete when its acceptance criteria are met, relevant tests or checks pass, documentation is updated when needed, and the change is merged through a Pull Request.
