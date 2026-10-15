# Margin GitHub workflow contract

The issue-management, Pull Request, and release skills share this contract.
They consume the [developer preflight and evidence contract](../docs/DEVELOPER_PREFLIGHT.md)
and the active [Margin preflight skill](preflight/SKILL.md); they do not redefine
those policies.

## Preview-first mutation boundary

The default mode is preview-first. A skill may inspect repository and GitHub
state, assemble the exact proposed command and body, and report the expected
effect. It must then stop with `Mutation: pending-confirmation` before it:

- creates, edits, links, moves, or closes an Issue;
- changes GitHub Project membership or status;
- pushes a branch or creates or updates a Pull Request;
- creates a tag or publishes a GitHub Release.

The user must explicitly confirm the exact preview before the skill applies it.
A later or broader request does not silently authorize unrelated mutations.
Cancellation, changed scope, or failed preconditions returns `BLOCKED` without
applying any mutation. Merging remains a maintainer action and is never part of
the Pull Request skill.

## Repository and authentication checks

Before preparing a mutation, verify the repository and account without exposing
credentials:

```bash
git rev-parse --show-toplevel
git status --short --branch
gh auth status --hostname github.com
gh repo view 26pratyush/margin --json nameWithOwner,defaultBranchRef
```

Before any branch push, tag, or release operation, run the same redacted remote
check required by MARGIN-023:

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

Do not print `GH_TOKEN`, `GITHUB_TOKEN`, credential-helper output, request
headers, or an unredacted remote URL. Stop for a wrong repository, wrong
account, missing access, embedded credentials, or a branch/worktree boundary
that cannot be explained. Use the user's configured fine-grained repository
access; never request or store a token in a file, Issue, Pull Request, release,
fixture, or command argument.

## Shared handoff

End every skill run with this exact shape:

```text
Status: PREVIEW | PASS | PASS_WITH_FOLLOW_UP | APPLIED | BLOCKED | FAIL
Mutation: none | pending-confirmation | applied
Target: issue | pull request | release
Repository/branch/base: ...
Commands and results: ...
Planned or applied changes: ...
Findings: ...
Evidence: ...
Open risks or blockers: ...
Next confirmation required: ...
```

Use `PREVIEW` when a proposed GitHub action is complete and waiting for
confirmation, `APPLIED` only after the confirmed mutation and read-back succeed,
`PASS` or `PASS_WITH_FOLLOW_UP` for the non-mutating preflight result defined by
MARGIN-023, `BLOCKED` when a safe prerequisite or decision is missing, and
`FAIL` when an authorized operation fails and remains unresolved. The field
shape remains identical for every skill; only the preflight result vocabulary
has this documented compatibility extension.

## Common safety rules

- Keep all changes tied to one issue, task brief, epic, or release scope.
- Preserve unrelated worktree changes; never reset, clean, overwrite, or delete
  them as a shortcut.
- Use synthetic or redacted data only. Never include local SQLite files,
  financial records, private backups, credentials, or secrets in GitHub content.
- Do not change application behavior, finance data contracts, workflows,
  dependencies, or quality thresholds from these skills.
- Read back every applied GitHub mutation and record its URL, number, SHA, tag,
  or status without recording credentials.
- If a command or GitHub capability is unavailable, report the exact limitation;
  do not invent a successful result or bypass the precondition.
- Delegated agents are read-only unless an isolated worktree and an explicitly
  disjoint patch scope are guaranteed. Delegates never commit, push, mutate
  GitHub, handle credentials, or touch local finance data.
