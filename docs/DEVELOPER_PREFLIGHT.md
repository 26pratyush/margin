# Developer preflight and evidence contract

This document is the repository-wide contract for developer preflight, failure
triage, Pull Request evidence, and release evidence. It is the implementation
contract for [MARGIN-022 / issue #53](https://github.com/26pratyush/margin/issues/53)
under [EPIC-004 / issue #52](https://github.com/26pratyush/margin/issues/52).

The contract applies to the local-first Margin repository. It does not add
finance behavior, change quality thresholds, introduce a hosted backend, or
grant automation permission to mutate user data.

## Safety invariants

- Work on a focused issue branch. Do not commit directly to `main`.
- Preserve unrelated user changes. Inspect them; do not reset, clean, or
  overwrite them as a shortcut.
- Use synthetic or redacted data only. Real financial records, SQLite files,
  exported backups, credentials, and tokens must remain outside the repository.
- Run data-related checks with a temporary `MARGIN_DATA_DIR`; never reset or
  seed the user's normal local data directory during preflight.
- Treat import, export, restore, reset, migrations, workflow permissions, and
  dependency changes as review-sensitive operations.
- GitHub Actions may read repository source and publish the static site, but
  must never receive local finance data or broad personal credentials.

## Command inventory

Run commands from the repository root unless a working directory is shown.
The expected successful result is exit code `0` with no warnings that the
command treats as failures.

| Layer          | Command                 | Purpose                                                                                     |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| Setup          | `npm ci`                | Install the locked root dependencies.                                                       |
| Formatting     | `npm run format:check`  | Check supported source and documentation formatting without writing.                        |
| Formatting     | `npm run format`        | Apply formatting only to the current scoped change after reviewing the diff.                |
| Lint           | `npm run lint`          | Run ESLint with warnings treated as failures.                                               |
| Service        | `npm run test:service`  | Run service, storage, and HTTP tests without UI tests.                                      |
| UI             | `npm run test:ui`       | Run React and browser-side helper tests.                                                    |
| Coverage       | `npm run test:coverage` | Run service coverage with the committed floors: 80% lines, 60% branches, and 85% functions. |
| Types          | `npm run check`         | Type-check the application.                                                                 |
| Build          | `npm run build`         | Build the production application.                                                           |
| Full root gate | `npm run quality`       | Run formatting, lint, coverage, UI tests, type-check, and build.                            |

For the independent product site, run these commands from `site/`:

```bash
npm ci
npm run format:check
npm run check
npm test
npm run build
```

The current GitHub workflows are:

- `.github/workflows/local-app-check.yml` — root formatting, lint, service
  coverage, type-check, build, and synthetic demo seed/reset checks on Pull
  Requests and pushes to `main`.
- `.github/workflows/site-pages.yml` — independent site checks and GitHub Pages
  deployment on relevant Pull Requests and pushes to `main`.

Workflow validation, dependency/security scanning, and browser smoke coverage
are planned follow-up work in MARGIN-026 and MARGIN-027. This contract does not
pretend those checks exist before their issues are implemented.

## Required preflight sequence

### 1. Establish scope and safety

Before editing or testing:

```bash
git status --short --branch
git diff --check
```

Confirm that the branch includes the issue key, the worktree is understood,
and the intended diff is limited to the issue. If unrelated changes are
present, preserve them and record the boundary before continuing.

### 2. Iterate with focused checks

Run the smallest relevant check after each coherent change:

1. Formatting: `npm run format:check`.
2. Lint: `npm run lint`.
3. Service/domain changes: `npm run test:service`, then
   `npm run test:coverage` when coverage-relevant code changes.
4. UI changes: `npm run test:ui`.
5. Type or production-build changes: `npm run check` and `npm run build`.
6. Site changes: run the complete independent site gate from `site/`.
7. Data or demo changes: use a temporary `MARGIN_DATA_DIR` and synthetic data;
   verify the relevant create/read/restart/reset/restore behavior without
   touching the normal local dataset.

### 3. Complete the PR gate

Before opening a Pull Request, run:

```bash
npm run quality
```

Run the site gate as well when site files, site screenshots, design-system
documentation, deployment documentation, or the Pages workflow changed.

### 4. Review evidence and scope

Finish with:

```bash
git diff --check
git status --short --branch
git diff --stat
```

Review the complete diff for unrelated files, secrets, real financial data,
SQLite files, generated artifacts, backup files, weakened tests, changed
thresholds, and undocumented behavior. Record exact commands and results in
the Pull Request and, for release work, in the testing/release documentation.

## Failure triage and focused reruns

| Failure class           | Owner                              | Primary check                                                | Smallest useful rerun                                              | Stop or escalate when                                                            |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Formatting              | Changed source/documentation owner | `npm run format:check`                                       | Format only the scoped files, then rerun the check                 | Formatting would rewrite unrelated files or generated data.                      |
| Lint                    | Changed source owner               | `npm run lint`                                               | Rerun lint after the smallest source correction                    | The fix changes behavior, suppresses a rule, or crosses issue scope.             |
| Service/domain/coverage | Service or domain owner            | `npm run test:service` / `npm run test:coverage`             | Run the failing test file or service suite, then the coverage gate | Expected behavior, thresholds, migrations, or financial semantics are unclear.   |
| UI                      | App owner                          | `npm run test:ui`                                            | Rerun the failing test or UI suite                                 | A fix changes accessibility, responsive behavior, or an unrelated screen.        |
| Type/build              | App/build owner                    | `npm run check` / `npm run build`                            | Rerun the failing command after the narrow fix                     | The fix requires dependency, bundler, or public-contract changes.                |
| Product site            | Site owner                         | Site format/check/test/build commands                        | Rerun the failing site command from `site/`                        | The change affects finance-app boundaries, deployment permissions, or real data. |
| Workflow                | Workflow owner                     | Pull Request workflow result and YAML diff review            | Rerun the affected workflow after a scoped correction              | Permissions, secrets, triggers, action versions, or release behavior change.     |
| Dependency/security     | Dependency or release owner        | Current repository security/dependency check, when available | Rerun the affected check after a lockfile-scoped correction        | A package, credential, advisory, or broad token decision is involved.            |
| Documentation           | Change owner                       | Link, command, and scope review plus `git diff --check`      | Recheck the edited document and referenced command                 | The documentation conflicts with architecture, privacy, or product decisions.    |

When CI fails but local checks pass, preserve the CI output, compare Node/npm
and working-directory assumptions, and rerun the smallest affected command in a
clean checkout. Do not weaken a check or add a bypass merely to make a Pull
Request green.

## Correction boundaries

### Safe to apply automatically

- Formatting within files already in the issue scope.
- Clearly mechanical corrections whose output can be reviewed in the diff.
- Re-running a deterministic focused check after that correction.

### Requires review or an explicit decision

- Product or domain behavior changes.
- Schema, migration, backup, import/export, reset, or data-lifecycle changes.
- Dependency or lockfile updates.
- Workflow triggers, permissions, secrets, action versions, or release steps.
- Coverage thresholds, test deletion, snapshot replacement, or broad lint
  suppression.
- Any fix where the expected behavior is ambiguous or the failure exposes a
  missing issue.

### Stop immediately

Stop and report the evidence when the work would require:

- A destructive reset, `git reset --hard`, broad `git clean`, or deletion of
  user data or backups.
- Copying, printing, committing, or transmitting credentials or tokens.
- Using real financial records in fixtures, screenshots, tests, or CI.
- Overwriting unrelated user changes.
- Introducing hosted storage, bank integrations, accounts, or cloud finance
  data without an explicit product decision.
- Silently bypassing a failing required check.

## Pull Request evidence

Use an issue-keyed branch such as:

```text
docs/MARGIN-022-developer-workflow-preflight
```

Every Pull Request should include:

- A concise summary of the scoped change.
- The linked issue, using `Closes #<issue>` when the PR should close it.
- Exact validation commands and their pass/fail results.
- The focused rerun used for any corrected failure.
- Data-model, calculation, export, backup, privacy, or accessibility impact,
  including an explicit “not applicable” where appropriate.
- Screenshots or a statement that no UI changed.
- Known limitations, follow-up issues, and any checks unavailable in the
  current environment.
- Confirmation that no real financial data, credentials, SQLite files, or
  private backups were added.

Review the final diff and workflow checks before requesting merge. Do not merge
from a dirty or ambiguous worktree.

## Release evidence

A release candidate must be reproducible from a clean checkout:

1. Check out the intended commit or tag.
2. Run the locked root install and applicable quality gates.
3. Run the independent site gate when the release includes site changes.
4. Verify synthetic-data and local-data safety behavior in a temporary data
   directory.
5. Record the commit SHA, tag, runtime versions, commands, results, known
   limitations, and follow-up issues.
6. Record rollback guidance that identifies the last known-good tag or commit.

Release artifacts must not contain credentials, real financial data, SQLite
files, private backups, or hosted finance data. The finance application remains
local-only; GitHub Pages publishes only the static product site.

## Follow-up issue boundaries

Later EPIC-004 issues consume this contract:

- MARGIN-023 implements repository-aware preflight and correction guidance.
- MARGIN-024 completes issue, Pull Request, and release workflow skills.
- MARGIN-025 aligns GitHub Actions with the local quality gate.
- MARGIN-026 adds workflow, dependency, and security validation.
- MARGIN-027 adds deterministic headless browser smoke coverage.
- MARGIN-028 performs the final acceptance review and release-documentation
  update.

Those issues may implement the contract, but they must not redefine its safety
boundaries without updating MARGIN-022 and recording the decision.
