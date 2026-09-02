# Margin agent instructions

This file is the operating contract for Codex, coding agents, and future implementation chats working in this repository.

## Read first

Before making changes, read these files in order:

1. `README.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/ARCHITECTURE.md`
4. `project/DEPENDENCIES.md`
5. The relevant GitHub Issue
6. The matching task brief in `project/tasks/`

For UI work, also read the relevant task in `project/tasks/` and inspect existing screens before introducing new patterns. For deployment work, read `docs/DEPLOYMENT.md`.

## Product boundary

Margin is a local-first personal finance application.

- The working finance app runs locally.
- Personal financial data must not be sent to a hosted backend by default.
- Render hosts only the static product/demo website in `site/`.
- GitHub stores source code, planning, Issues, Pull Requests, and documentation.
- Never add bank integrations, hosted accounts, cloud finance storage, or investment advice without an explicit product decision.

## Data safety

- Use synthetic or redacted data in tests, fixtures, screenshots, and demos.
- Never commit salary records, expense records, account details, database files, credentials, or secrets.
- Keep local data in ignored paths.
- Treat import, export, backup, reset, and deletion flows as security-sensitive.
- Do not paste private financial data into Issues, Pull Requests, or Wiki pages.

## Issue-first workflow

Work should begin from a GitHub Issue. Do not start unrelated implementation because it seems useful.

1. Identify the issue number, task ID, parent Epic, dependency wave, and acceptance criteria.
2. Check that dependencies are complete. If not, record the blocker and stop or work only on an explicitly independent part.
3. Read the linked task brief and relevant project context.
4. Inspect the existing code and documentation before deciding where to change it.
5. State a short implementation plan in the Issue or Pull Request.
6. Make the smallest coherent change that satisfies the issue.
7. Update documentation when a decision, command, data contract, or workflow changes.
8. Run the available preflight checks before opening a Pull Request.
9. Open a Pull Request using `.github/PULL_REQUEST_TEMPLATE.md`.
10. Update the Issue and Project status with the result, test evidence, and follow-up work.

Use one focused issue per chat or agent by default. If work must span multiple issues, explain why before changing scope.

## Dependency waves

Respect the sequence in `project/DEPENDENCIES.md`:

```text
Project baseline → architecture decisions → local foundation
→ quality and first vertical slice → product website and release preparation
```

The foundation and first planning release (`EPIC-001`/`EPIC-002`, `MARGIN-001` through `MARGIN-015`) are complete. The current active product body is `EPIC-003`, whose everyday-tracking and safe-correction work runs through `MARGIN-021`; begin new work from the active GitHub issue and matching task brief rather than restarting the foundation sequence.

## Branches and Pull Requests

Use a focused branch containing the task ID:

```text
feat/MARGIN-008-salary-expense-balance
fix/MARGIN-012-negative-balance-display
docs/MARGIN-004-local-setup
chore/MARGIN-007-ci-checks
```

Codex desktop branches use the `codex/` prefix by default. Preserve an explicitly requested branch name when one is provided.

Do not push directly to `main` once normal development begins. Keep Pull Requests limited to the linked issue and include:

- A summary of the change.
- The linked issue, such as `Closes #9`.
- Validation commands and results.
- Screenshots for meaningful UI changes.
- Data, calculation, export, backup, privacy, and accessibility considerations.
- Known limitations and follow-up issues.

## Definition of done

An issue is ready to close only when:

- Its acceptance criteria are met.
- Relevant tests, checks, or manual verification pass.
- The change is merged through a Pull Request.
- Documentation and project status are updated.
- No real financial data or secrets were introduced.

If blocked, do not silently work around the dependency. Add `status:blocked`, explain the evidence, identify the decision or person needed, and leave the repository in a safe state.

## Documentation rules

- `README.md` is the concise public entry point.
- `docs/` contains versioned technical and project context that should change with code.
- `project/` contains roadmaps, dependency waves, epics, and task briefs.
- `wiki/` contains Wiki-ready long-form pages and stable product context.
- Record meaningful architecture or product changes in the Wiki decision log and `docs/PROJECT_CONTEXT.md`.

## Handoff report

At the end of a chat or agent run, report:

1. Issue and branch worked on.
2. Files changed.
3. Behavior or decision completed.
4. Checks run and their results.
5. Open questions or blockers.
6. Recommended next issue.

Do not claim a task is complete if the required Pull Request, checks, documentation, or acceptance evidence is missing.

## Local skill directory

`SKILLS/` contains placeholders for future repository-specific agent skills. These folders are not active skill implementations yet. When a skill is added, document its trigger, inputs, required checks, and expected output in its own `SKILL.md`.
