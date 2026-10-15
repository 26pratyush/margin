---
name: margin-issue-management
description: Prepare and, after explicit confirmation, apply safe GitHub Issue and Project updates for Margin tasks, epics, dependencies, blockers, and completion evidence.
metadata:
  short-description: Preview-first Margin Issue management
---

# Margin issue management

Use this skill when a Margin task needs an Issue created, updated, linked to an
epic, moved in the Project, blocked, or closed. The shared rules are in
[`GITHUB_WORKFLOW_CONTRACT.md`](../GITHUB_WORKFLOW_CONTRACT.md). Read the
canonical [developer preflight contract](../../docs/DEVELOPER_PREFLIGHT.md) and
run [Margin preflight](../preflight/SKILL.md) for repository changes before
reporting completion.

## Inputs

Collect:

- repository path and `26pratyush/margin` identity;
- requested operation: create, update, link, status, block, or close;
- issue number or task identifier, if one exists;
- matching task brief, parent epic, dependencies, acceptance criteria, and
  non-goals;
- requested labels, type, priority, milestone, assignee, and Project status;
- optional implementation, test, Pull Request, or release evidence.

If the task brief, parent, dependency state, or requested operation is unclear,
return `BLOCKED` before preparing a mutation. Do not infer a new epic, issue
number, label, or Project field from an unrelated task.

## Discovery and duplicate checks

Run read-only checks before drafting content:

```bash
git rev-parse --show-toplevel
git status --short --branch
gh auth status --hostname github.com
gh repo view 26pratyush/margin --json nameWithOwner,defaultBranchRef
gh issue view <number> --repo 26pratyush/margin
gh issue list --repo 26pratyush/margin --state all --search "<task id or distinctive title> in:title"
gh project list --owner 26pratyush
```

Confirm that an existing issue is the intended target, that a proposed issue
does not duplicate an open or recently closed item, and that the parent epic
and dependency issues are the expected ones. Inspect Project items and fields
only as needed; do not change them during discovery.

## Issue content contract

Draft issue bodies from the matching task brief. Include only the sections the
operation needs, in this order:

1. Goal or problem.
2. Parent epic and dependencies.
3. Scope and acceptance criteria.
4. Implementation or verification notes.
5. Non-goals, safety boundaries, and follow-up work.

Use repository labels from `project/LABELS.md`. Preserve existing issue content
when updating it; show the exact replacement or appended section in the
preview. Use `status:blocked` only with concrete blocker evidence, the needed
decision or dependency, and a next action.

## Preview and apply

The preview must show:

- target repository and operation;
- existing issue or duplicate-check result;
- exact title, body sections, labels, milestone, assignee, parent/sub-issue
  relationship, and Project status to be applied;
- the exact `gh issue`, `gh api`, or Project command family that would be used;
- expected URLs, numbers, and read-back checks;
- any fields that cannot be changed by the available CLI capability.

Stop with `Mutation: pending-confirmation`. Apply only after the user confirms
that exact preview. For parent/sub-issue or Project operations, discover the
current IDs and field option IDs immediately before applying; never guess them.
Use `gh issue create`, `gh issue edit`, `gh issue close`, and the narrowest
supported Project/API operation. Do not batch unrelated issues or close a
parent automatically because a child changed.

After applying, read the Issue and Project item back, record the resulting URL
and status, and report `APPLIED` only when the result matches the preview.

## Handoff

Use the shared handoff format. For `BLOCKED`, identify the missing issue,
dependency, authority, Project capability, or decision. For `APPLIED`, include
the resulting Issue/Project URLs and the exact evidence added.
