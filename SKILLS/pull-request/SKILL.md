---
name: margin-pull-request
description: Prepare and, after explicit confirmation, apply safe issue-linked Margin branch pushes and Pull Requests using the repository template and preflight evidence.
metadata:
  short-description: Preview-first Margin Pull Requests
---

# Margin Pull Requests

Use this skill when a Margin issue is ready for branch push, Pull Request
creation, or an evidence update. The shared rules are in
[`GITHUB_WORKFLOW_CONTRACT.md`](../GITHUB_WORKFLOW_CONTRACT.md). The active
[Margin preflight skill](../preflight/SKILL.md) is a required prerequisite.

## Inputs and preconditions

Collect:

- issue number, task ID, parent epic, and matching task brief;
- repository path, current branch, intended base branch, and changed files;
- complete diff and any existing PR URL;
- focused checks, full `npm run quality` result, applicable site-gate result,
  manual verification, screenshots, limitations, and follow-up issues.

Stop before preview if the issue or task brief is missing, the branch is not
issue-keyed, the base branch is wrong, the worktree contains unexplained
changes, the diff crosses scope, or MARGIN-023 preflight is not complete.

## Discovery

Run read-only checks:

```bash
git rev-parse --show-toplevel
git status --short --branch
git diff --check
git diff --name-only <base>...HEAD
git log --oneline <base>..HEAD
gh auth status --hostname github.com
gh repo view 26pratyush/margin --json nameWithOwner,defaultBranchRef
gh issue view <number> --repo 26pratyush/margin
gh pr list --repo 26pratyush/margin --head <branch> --state all
```

Run the focused checks selected by MARGIN-023, then `npm run quality`. Run the
independent `site/` gate when site files, site screenshots, design-system or
deployment documentation, or the Pages workflow changed. Record exact results
and focused reruns; do not mark an unavailable check as passed.

## PR body and preview

Populate `.github/PULL_REQUEST_TEMPLATE.md` with:

- concise scope summary and why it is needed;
- `Closes #<issue>` or the correct non-closing reference;
- scope confirmation and intentional out-of-scope work;
- exact validation commands and results;
- UI screenshots or an explicit “None” statement;
- data, privacy, calculation, backup, export, and accessibility review;
- known limitations and follow-up issues.

The preview must show the proposed branch, base, title, body, labels, draft
state, existing-PR check, push command, PR command, and post-create read-back.
Use an issue-keyed branch such as
`docs/MARGIN-024-issue-pr-release-skills`; never push directly to `main`.

Stop with `Mutation: pending-confirmation`. After explicit confirmation, push
only the reviewed branch, create or update only the linked PR, and read it back
with `gh pr view`. Do not merge, approve, dismiss reviews, alter branch
protection, or change workflow permissions from this skill.
The redacted-origin check in the shared contract must pass before the push
preview can become `APPLIED`.

## Failure handling

- Failed checks or missing evidence produce `BLOCKED` or `FAIL`; do not make the
  PR green by weakening tests, thresholds, or required evidence.
- A dirty worktree is preserved and reported, not cleaned.
- Credentials, local databases, backups, or real financial data produce an
  immediate blocker.
- If the PR already exists, preview the exact body/title update and require a
  fresh confirmation before editing it.

## Handoff

Use the shared handoff format. An `APPLIED` result must include the PR URL,
branch, base, commit range, checks, and any known follow-up.
