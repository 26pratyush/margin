# GitHub Project tracking setup

Create one GitHub Project named `Margin — Product Development` and connect the repository to it.

The project has been created for `26pratyush/margin`, and the initial Epic and child task issues are in Backlog. GitHub remains the interactive source of truth; this file defines the durable field, view, and workflow conventions.

## Current release status

`v0.1.0` was released from validated `main` commit `269a1f3` on 2026-08-26. See the [GitHub Release](https://github.com/26pratyush/margin/releases/tag/v0.1.0) and [live product website](https://26pratyush.github.io/margin/). Interactive browser review remains a documented follow-up; the next product slice is safe ledger correction and must be tracked separately.

## Next planned epic

[EPIC-003 / #38 — Everyday tracking, safe correction, and onboarding](https://github.com/26pratyush/margin/issues/38) is the next planned product body of work for v0.2. Its child issues are [#39](https://github.com/26pratyush/margin/issues/39) through [#44](https://github.com/26pratyush/margin/issues/44), sequenced from correction semantics and persistence through filters, progressive expense metadata, isolated synthetic onboarding, and final regression review. Investment valuation and developer-workflow improvements remain separate future work.

## Recommended fields

| Field          | Values or purpose                                     |
| -------------- | ----------------------------------------------------- |
| Status         | Backlog, Ready, In progress, Blocked, In review, Done |
| Type           | Epic, Feature, Task, Bug, Chore, Documentation        |
| Area           | App, Design, Demo site, Docs, Testing, DevOps         |
| Priority       | P0, P1, P2, P3                                        |
| Effort         | XS, S, M, L                                           |
| Wave           | Wave 0, Wave 1, Wave 2, Wave 3, Wave 4                |
| Target release | v0.1, v0.2, v0.3, v0.4, v1.0                          |
| Target date    | Optional date field                                   |

## Views

### Roadmap

Roadmap layout grouped by `Target release`, showing Epics and Features with target dates.

### Current wave

Board layout filtered to the active `Wave`, grouped by `Status`.

### Board

Board layout containing active work grouped by `Status`.

### Backlog

Table layout containing all unfinished items, sorted by `Priority`, then `Effort`.

### Bugs

Board or table filtered to `Type = Bug`, grouped by `Status`.

### Product website

Table filtered to `Area = Demo site`, showing website content, screenshots, and deployment tasks.

## Milestones

- v0.1 First local planning release
- v0.2 Core tracking
- v0.3 Commitments and insights
- v0.4 Safety and polish
- v1.0 Stable personal release

## Automation intentions

- New issues enter `Backlog`.
- Assigned issues move to `Ready` when acceptance criteria are present.
- Pull Requests move linked work to `In review`.
- Merged Pull Requests move linked work to `Done` only after acceptance is confirmed.
- Closed issues should be archived from active views after release.

## Operating rhythm

At the start of a work session, select one task from the current wave. At the end, update the issue, project status, and relevant documentation. Avoid starting work from an untracked idea.
