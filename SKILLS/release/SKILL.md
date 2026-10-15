---
name: margin-release
description: Prepare and, after explicit confirmation, apply a reproducible local-first Margin tag and GitHub Release from a validated merged main commit.
metadata:
  short-description: Preview-first Margin releases
---

# Margin releases

Use this skill when a merged Margin change is ready for a versioned tag or
GitHub Release. The shared rules are in
[`GITHUB_WORKFLOW_CONTRACT.md`](../GITHUB_WORKFLOW_CONTRACT.md). Read the
[developer release evidence contract](../../docs/DEVELOPER_PREFLIGHT.md) and
reuse [Margin preflight](../preflight/SKILL.md); do not redefine their safety
boundaries.

## Inputs and release boundary

Collect:

- target version using the repository's `v0.x.y` convention;
- validated `main` commit, merged PRs, issue scope, and prior known-good tag;
- release notes or release-preparation document;
- root and applicable site-gate results;
- runtime versions, synthetic-data verification, rollback notes, and known
  limitations.

A release is `BLOCKED` unless the candidate is on a clean local `main`, the
intended PRs are merged, the release scope is accepted, synthetic verification
is complete, the tag does not already exist, and required checks are current
for that exact commit. Never release from a feature branch, dirty worktree,
unmerged PR, incomplete synthetic verification, or unverified commit.

For reproducibility, resolve the authoritative default-branch SHA and validate
the candidate in a fresh temporary worktree before running release gates:

```bash
gh api repos/26pratyush/margin/git/ref/heads/main --jq .object.sha
git fetch --quiet origin main
git worktree add --detach /private/tmp/margin-release-<version> origin/main
git -C /private/tmp/margin-release-<version> status --porcelain
git -C /private/tmp/margin-release-<version> rev-parse HEAD
```

The temporary worktree must be clean and its `HEAD` must equal both the
authoritative GitHub `main` SHA and the fetched `origin/main` SHA. Run the
locked install and release gates from that worktree. Do not remove a worktree
or reset a user's checkout as a recovery shortcut.

## Read-only readiness checks

Run and record:

```bash
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git log -1 --oneline main
git tag --list 'v*'
git ls-remote --refs origin "refs/tags/<version>"
gh auth status --hostname github.com
gh repo view 26pratyush/margin --json nameWithOwner,defaultBranchRef
gh pr list --repo 26pratyush/margin --base main --state merged
gh release list --repo 26pratyush/margin
gh release view <previous-tag> --repo 26pratyush/margin
```

An existing remote tag blocks this workflow even when no GitHub Release exists.
Compare any returned tag target with the candidate SHA and stop for an existing
tag rather than overwriting, deleting, or retargeting it. The redacted-origin
check in the shared contract must also pass before a tag or Release preview can
become `APPLIED`.

Run the locked root install and `npm run quality` from the candidate. Run the
complete independent site gate when the release includes site-boundary changes.
Use a temporary absolute `MARGIN_DATA_DIR` for synthetic create/read/restart,
backup/restore, reset, or demo verification; never touch the normal local
ledger. Confirm release files contain no SQLite files, backups, credentials,
real financial records, or hosted finance runtime.

## Release notes and preview

Prepare release notes from verified evidence only. Include:

- version and validated commit SHA;
- merged PRs and user-visible scope;
- exact root/site checks and runtime versions;
- synthetic-data and local-data safety result;
- known limitations and follow-up issues;
- rollback target, such as the previous known-good tag.

The preview must show the exact annotated-tag message, tag target, release title,
release notes, previous rollback tag, and the commands that would create the tag
and GitHub Release. Confirm that the tag and release name are unused.

Stop with `Mutation: pending-confirmation`. After explicit confirmation, create
the annotated tag first, verify its target, then publish the GitHub Release and
read it back. If either operation fails, stop and report the exact state; do not
retry blindly or delete a tag to recover.

## Handoff

Use the shared handoff format. An `APPLIED` result must include the validated
commit, tag, release URL, checks, rollback target, and any known limitations.
