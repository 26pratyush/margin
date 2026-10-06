# MARGIN-022 — Define the developer workflow and preflight contract

## Parent

- Epic: [#52 — Developer workflow, CI quality, and release safety](https://github.com/26pratyush/margin/issues/52)
- Issue: [#53 — MARGIN-022 developer workflow and preflight contract](https://github.com/26pratyush/margin/issues/53)
- Priority: P1
- Dependencies: none
- Follow-up implementation: MARGIN-023 through MARGIN-028

## Goal

Turn Margin's existing quality expectations into one explicit contract that a
fresh checkout, contributor, reviewer, repository skill, and GitHub Action can
follow without relying on tribal knowledge.

The canonical contract is [Developer preflight and evidence](../../docs/DEVELOPER_PREFLIGHT.md).

## Deliverables

- Inventory the current root, application, site, documentation, and workflow
  commands without changing their thresholds.
- Define the required preflight sequence and focused rerun for each failure
  class.
- Map formatting, lint, service/unit, UI, type/build, site, workflow,
  dependency/security, and documentation failures to an owner and stop rule.
- Define safe automatic corrections, review-required corrections, and hard
  stop conditions.
- Define branch, Pull Request, release, local-data, backup, credential, and
  synthetic-data evidence requirements.
- Link the canonical contract from contributor, workflow, testing, and skills
  documentation.

## Acceptance criteria

- A fresh checkout can identify the correct commands and expected pass/fail
  behavior from the repository documentation.
- Every current quality layer has an owner, primary command, focused rerun, and
  failure/escalation action.
- The contract protects local SQLite data, backups, credentials, and unrelated
  worktree changes.
- The contract remains consistent with the local-first architecture.
- MARGIN-023 through MARGIN-028 can reference the contract without redefining
  its boundaries.
- `npm run quality` passes, and the independent site gate passes when the site
  documentation or site boundary is part of verification.

## Verification

Use a clean checkout or temporary worktree for command verification. Use a
temporary absolute `MARGIN_DATA_DIR` for any data-related checks. Record exact
commands, runtime versions, results, and limitations in the Pull Request.

No application behavior, schema, backup format, quality threshold, GitHub
Action, repository skill, browser smoke framework, or hosted finance boundary
is introduced by this task.
