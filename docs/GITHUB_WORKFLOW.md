# GitHub workflow

## Source of truth

GitHub is the project system of record for:

- Source code.
- Issues and sub-issues.
- Epics and milestones.
- Pull Requests.
- Project views and status.
- Long-form Wiki documentation.

## Issue hierarchy

Use this hierarchy:

```text
Epic
└── Feature or task
    └── Smaller task, only when needed
```

Keep individual issues small enough to complete in one focused change. Use the task brief in `project/tasks/` as the deeper context shared with future implementation chats.

## Issue types and labels

Use issue types where available. Otherwise use the labels described in [project/LABELS.md](../project/LABELS.md).

Suggested types:

- Epic
- Feature
- Task
- Bug
- Chore
- Documentation

## Branch and Pull Request flow

```text
Issue → branch → local checks → Pull Request → review → main
```

Branch names should include the issue key, for example `feat/MARGIN-008-salary-expense-balance`.

## Project views

The initial GitHub Project should contain:

- Roadmap: epics and target releases.
- Current wave: active dependency wave.
- Board: items grouped by status.
- Backlog: all unscheduled work.
- Bugs: items filtered to bugs.

## Merge rule

`main` represents the most stable state. A Pull Request should link its issue and pass the checks that exist for the current stack. The `Local app check / Verify local app` workflow runs the locked install, formatting check, lint, service/domain tests with coverage thresholds, TypeScript check, static build, and synthetic demo seed/reset path for every pull request and push to `main`. Do not merge real financial data, credentials, or unreviewed schema changes.

## Deployment and releases

- Pull Requests validate the changed app or site without deploying the finance application.
- The `site/` build is verified by the product-site workflow, and pushes to `main` publish the static site to GitHub Pages through GitHub Actions.
- The finance application remains local-only; GitHub Pages must never receive its database or user records.
- Versioned releases use `v0.x.y` tags and GitHub Releases. Container images are optional packaging artifacts, not a hosted runtime.
- Protect `main` with required pull requests and CI checks once a repeatable workflow exists; do not require a check that has not been created yet.
