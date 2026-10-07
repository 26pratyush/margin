---
name: margin-preflight
description: Run Margin's repository-aware preflight before a Pull Request or release, classify failures, apply only safe in-scope corrections, coordinate isolated audits, and produce review-ready evidence.
metadata:
  short-description: Safe Margin preflight and failure correction
---

# Margin preflight

Use this skill for Margin implementation, documentation, workflow, dependency,
release, or review work before requesting a Pull Request or release review.
The canonical policy is
[the developer preflight and evidence contract](../../docs/DEVELOPER_PREFLIGHT.md).
This skill operationalizes that policy; it does not replace it.

## Inputs

Collect these inputs before changing anything:

- Issue number and task ID, including the parent epic and acceptance criteria.
- Absolute repository path.
- Current branch and intended base branch.
- Changed files, diff, or reported CI failure.
- Optional CI output, environment details, or reviewer findings.

If issue context, repository identity, or scope cannot be established, report
`BLOCKED` and ask for the missing context. Do not guess the issue or inspect a
different repository because it is convenient.

## Safety boundary

The main agent is the sole integrator and decision-maker.

- Never commit, push, open or edit a Pull Request, edit GitHub Projects, or
  message a third party as part of preflight.
- Never print, copy, request, transmit, or store credentials, tokens, private
  backups, or real financial data.
- Never reset, seed, restore, delete, or migrate the user's normal local data
  directory. Use a temporary absolute `MARGIN_DATA_DIR` for data checks.
- Never run `git reset --hard`, broad `git clean`, destructive database commands,
  or unreviewed permission/workflow changes.
- Preserve unrelated changes. A dirty worktree is evidence to record, not a
  reason to overwrite the worktree.
- If an isolated worktree cannot be guaranteed for a delegated writer, make the
  delegation read-only or perform it serially in the main agent.

## Status contract

Return exactly one overall status:

- `PASS`: required checks passed and no unresolved finding remains.
- `PASS_WITH_FOLLOW_UP`: required checks passed, with non-blocking documented
  risks or unavailable optional checks.
- `BLOCKED`: safe progress requires missing authority, context, environment,
  or a user decision.
- `FAIL`: a required check or safety invariant failed and remains unresolved.

Every finding uses this record:

```text
id: PF-###
severity: blocker | high | medium | low
layer: safety | environment | formatting | lint | service | ui | build | site | workflow | dependency | documentation | architecture
evidence: command and concise result; never include secrets
affected files: repository-relative paths
failure class: code | test-contract | environment | scope/authority | architecture
owner: responsible layer or decision-maker
root cause: concise cause after classifying the failure
safe correction or decision needed: exact bounded action or required choice
focused rerun: command to run after correction
status: open | corrected | accepted-follow-up | blocked
```

## Operating procedure

### 1. Establish repository and scope truth

Run read-only checks from the requested repository:

```bash
git rev-parse --show-toplevel
git status --short --branch
git diff --check
git diff --name-only
git ls-files --others --exclude-standard
node --version
npm --version
```

The origin check is performed by the redacted command below; do not add an
unredacted `git remote get-url origin` invocation to a report.

Do not print an origin URL until it has been checked for embedded userinfo.
Use a redacted identity check and stop if credentials appear in the remote:

```bash
origin_url="$(git config --get remote.origin.url || true)"
case "$origin_url" in
  *://*:*@*|*://*@*)
    echo "STOP: origin contains embedded credentials"
    exit 1
    ;;
esac
printf '%s\n' "$origin_url" | sed -E 's#(https?://)[^/@]+@#\1[redacted]@#'
```

Validate the redacted host and repository path against `26pratyush/margin`.
Never echo the unredacted value, token, credential helper output, or an
authentication header.

Also verify that the relevant lockfiles, `package.json`, `.github/workflows/`,
`AGENTS.md`, issue context, and task brief exist. Compare the current branch to
the intended base without rewriting either branch.

Review changed and untracked paths for database, backup, credential, generated,
or private-data risk. A filename match is a signal to inspect safely, not proof
of a violation; do not echo file contents merely to diagnose a possible secret.

If the repository is not `26pratyush/margin`, the branch is wrong for the issue,
the worktree contains unexplained unrelated edits, or a suspicious data/secret
file is present, create a finding and stop before mutation.

### 2. Select the smallest useful checks

Use changed paths and the current scripts rather than running every possible
command immediately:

| Changed area                             | First checks                                                   | Required final checks                         |
| ---------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| Documentation, `SKILLS/`, or task briefs | `npm run format:check`, `git diff --check`, link/scope review  | `npm run quality`                             |
| `service/` domain, storage, or API       | `npm run test:service`, then `npm run test:coverage`           | `npm run quality`                             |
| `app/` UI or browser helpers             | `npm run test:ui`                                              | `npm run quality`                             |
| TypeScript or build configuration        | `npm run check`, then `npm run build`                          | `npm run quality`                             |
| `site/` or site-boundary files           | Site `format:check`, `check`, `test`, and `build` from `site/` | Root quality plus the site gate               |
| Workflows or dependency manifests        | Inspect the diff and available CI/security checks              | Relevant workflow checks plus root/site gates |
| Data, backup, reset, or demo behavior    | Temporary `MARGIN_DATA_DIR` and synthetic fixtures             | Relevant focused checks plus root quality     |

Do not claim a check exists because it is mentioned in a task brief. Verify the
script or workflow before running it; classify missing tooling as an environment
or scope finding.

The site gate also applies when any of these changed paths touch the site
boundary: `site/**`, site screenshots, `docs/DESIGN_SYSTEM.md`,
`docs/DEPLOYMENT.md`, or `.github/workflows/site-pages.yml`. A root-only
documentation change does not require the site gate.

### 3. Classify failures before correcting

For each failure, capture the finding record before editing. Distinguish:

- **Code defect:** the command runs and exposes incorrect behavior.
- **Test-contract defect:** the test or expected value is stale or ambiguous;
  do not change it just to make the run pass.
- **Environment defect:** missing runtime, dependency, browser, network, or
  platform assumption.
- **Scope/authority defect:** wrong branch, missing issue context, credentials,
  required permission, or unrelated user changes.
- **Architecture defect:** UI bypasses service/domain boundaries, derived
  financial values are duplicated, local data crosses a hosted boundary, or
  backup/schema compatibility is broken.

Environment failures must not be reported as code fixes. Missing authority or
ambiguous behavior produces `BLOCKED`, not a guessed workaround.

### 4. Correct only safe findings

Safe automatic corrections are limited to formatting and clearly mechanical
changes in files already inside the issue scope. For every correction:

1. State the finding and exact bounded change.
2. Preserve unrelated files and local data.
3. Inspect the diff.
4. Rerun the focused failing command immediately.
5. Rerun the complete relevant layer after the focused check passes.

Require review or a user decision for behavior changes, schema/migrations,
backup/import/export/reset semantics, dependency or lockfile changes, workflow
permissions, thresholds, test deletion, broad lint suppression, or ambiguous
expected behavior.

Stop immediately for secrets, real financial data, destructive operations,
hosted finance behavior, unsafe permissions, or an unexplained scope change.

### 5. Run bounded correction rounds

Run at most three detect-correct-rerun rounds for the same unresolved finding.
Each round must reduce the finding set or produce better evidence. Stop with
`BLOCKED` or `FAIL` when:

- The same failure survives three rounds.
- Independent reviewers disagree about expected behavior.
- A correction would cross the issue boundary.
- The required environment or authority is unavailable.
- A fix would weaken tests, thresholds, safety checks, or architectural rules.

Do not loop on a failing command without changing the evidence or cause.

### 6. Perform independent review

When delegation is available and the task is complex enough to benefit from it,
use disjoint roles in isolated worktrees. Provide each reviewer only the issue
context, relevant contract, changed paths, and one bounded question.

Preferred model routing:

- `gpt-5.6-terra`: architecture, data safety, security, backup/schema
  compatibility, edge cases, and high-severity findings.
- `gpt-6-luna`: command inventory, focused test selection, documentation/link
  checks, and fast independent regression scans.

Default roles:

1. **Preflight auditor:** repository identity, branch/worktree state, runtime,
   dependencies, scripts, workflows, and scope.
2. **Architecture auditor:** domain/service/UI boundaries, local-first rules,
   backup compatibility, date/currency semantics, and hidden regressions.
3. **Regression auditor:** edge cases, failed-test interpretation, docs drift,
   and focused rerun coverage.

Delegated agents may patch only an explicitly assigned, disjoint file set in an
isolated worktree. They must return findings, evidence, changed paths, and
rerun commands; they must not commit, push, contact GitHub, handle credentials,
or modify user data. The main agent reviews every patch before integration.

If model selection, subagent spawning, or isolated worktrees are unavailable,
run the same roles read-only or serially. Never use a shared-worktree editor as
a faster fallback.

### 7. Run the final gate and produce evidence

Before reporting readiness:

```bash
npm run quality
git diff --check
git status --short --branch
git diff --stat
```

Run the independent site gate when site-related files are changed. Perform a
final review for architecture, local data, privacy, backup/export, accessibility
where relevant, documentation, and PR-template evidence. Include exact command
results, focused reruns, known limitations, and unresolved follow-ups.

For data, backup, reset, restore, or demo changes, add targeted synthetic
coverage before the full gate. Confirm versioned backup/schema compatibility,
legacy migration behavior, local-civil-date and period-boundary behavior, and
relevant zero, negative, invalid, voided, and backdated cases. Any mutating
workflow or CLI check must use an explicit temporary `MARGIN_DATA_DIR`; flag a
workflow that relies on an implicit runner data directory for follow-up rather
than changing the workflow in this skill.

## Examples

### Documentation-only change

Verify branch/scope, run formatting and whitespace/link review, then the root
quality gate. Do not run data reset or seed commands merely because the change
mentions local data. Report that no UI, model, backup, or data behavior changed.

### Service or domain change

Run the focused service test first, inspect calculations and persistence/API
boundaries, run coverage, then the full root gate. Add synthetic boundary cases
for zero, negative, invalid, voided, backdated, and restart behavior when the
change touches those concepts.

### UI change

Run the focused UI suite, check loading/error/empty/keyboard/responsive states,
confirm that React does not calculate authoritative financial values or bypass
the service, then run the full root gate.

### Site-only change

Run all site commands from `site/`, confirm no finance API or user data is
included, and run root quality if root documentation or shared configuration
also changed.

## Handoff format

End the preflight report with:

```text
Status: PASS | PASS_WITH_FOLLOW_UP | BLOCKED | FAIL
Issue/branch: ...
Files reviewed or changed: ...
Checks: command → result
Corrections and focused reruns: ...
Findings: ...
Open risks/blockers: ...
PR evidence ready: yes/no
Recommended next issue: ...
```

Do not claim completion when required checks, documentation, issue linkage,
review evidence, or the Pull Request are still missing.
