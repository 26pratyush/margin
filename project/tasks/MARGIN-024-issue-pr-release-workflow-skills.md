# MARGIN-024 — Issue, Pull Request, and release workflow skills

**Parent epic:** [EPIC-004 — Developer workflow and release confidence](https://github.com/26pratyush/margin/issues/52)

**GitHub issue:** [#55](https://github.com/26pratyush/margin/issues/55)

**Depends on:** MARGIN-022 and MARGIN-023

**Priority:** P1

## Goal

Implement the remaining Margin developer workflow skills for safe Issue
management, Pull Request preparation, and versioned releases. These skills use
the canonical preflight and evidence contracts without changing application
behavior, finance data contracts, Actions, dependencies, or quality thresholds.

## Deliverables

- `SKILLS/GITHUB_WORKFLOW_CONTRACT.md` with the shared preview-first mutation
  boundary, authentication safety, common handoff format, and local-first
  rules.
- `SKILLS/issue-management/SKILL.md` for Issue intake, dependency and duplicate
  checks, epic/Project linking, blockers, and completion evidence.
- `SKILLS/pull-request/SKILL.md` for issue-keyed branches, preflight evidence,
  standard PR bodies, branch push, and PR creation/update previews.
- `SKILLS/release/SKILL.md` for clean validated `main` release candidates,
  release evidence, annotated tags, GitHub Releases, and rollback notes.
- Active READMEs, `docs/GITHUB_WORKFLOW.md`, this task brief, and the task index.
- A MARGIN-024 verification record in `docs/TESTING.md`.

## Mutation and safety contract

All three skills are preview-first. They may inspect state and prepare exact
commands, but must stop with `Mutation: pending-confirmation` before creating,
editing, linking, moving, or closing Issues; changing Project state; pushing or
creating/updating Pull Requests; or creating tags and Releases. The user must
confirm the exact preview. Merging is never performed by the Pull Request skill.

GitHub identity and access are verified without printing tokens or credential
helper output. The skills preserve unrelated worktree changes, use synthetic or
redacted data only, and stop for missing authority, wrong repository, ambiguous
scope, secrets, real finance data, destructive operations, or failed required
checks.

## Acceptance criteria

- Each active skill has valid frontmatter, a discriminating trigger, repository-
  aware inputs, safe discovery commands, bounded failure handling, and the
  shared handoff format.
- Issue management covers task-brief intake, parent/dependency validation,
  duplicate detection, labels, milestones, Project status, blockers, and
  completion evidence without auto-closing unrelated work.
- Pull Request workflow enforces MARGIN-023 preflight, the repository template,
  exact checks/results, privacy and UI evidence, issue linkage, and no merge
  action.
- Release workflow requires a clean validated `main` commit, merged scope,
  current gates, synthetic verification, release notes, rollback evidence, and
  explicit confirmation before tag or Release creation.
- No credential, SQLite, backup, real financial data, or hosted finance runtime
  can enter GitHub content or release artifacts through the documented workflow.
- Existing MARGIN-022 and MARGIN-023 policies remain the source of truth.

## Verification plan

Run read-only or dry-run scenarios for missing context, duplicate issues,
wrong repository or branch, dirty worktrees, failed checks, missing screenshots,
missing authentication, unmerged PRs, dirty `main`, existing tags, incomplete
synthetic verification, cancelled confirmations, and successful previews. Check
that no GitHub mutation occurs before confirmation and that applied results are
read back when explicitly authorized.

Validate all active skill frontmatter and local links, then run:

```bash
npm run format:check
git diff --check
npm run quality
```

Run the independent site gate only if site-boundary files change. Use Terra for
architecture, authority, privacy, and release-safety review; use Luna for
command inventory, documentation links, and scenario regression review.

## Non-goals

This task does not add GitHub Actions jobs, workflow/security scanners,
dependency upgrades, browser smoke coverage, product behavior, finance data
model changes, automatic merging, or automatic Project administration. Those
remain assigned to MARGIN-025 through MARGIN-028.
