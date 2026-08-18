# GitHub Project tracking setup

Create one GitHub Project named `Margin — Product Development` and connect the repository to it.

## Recommended fields

| Field | Values or purpose |
| --- | --- |
| Status | Backlog, Ready, In progress, Blocked, In review, Done |
| Type | Epic, Feature, Task, Bug, Chore, Documentation |
| Area | App, Design, Demo site, Docs, Testing, DevOps |
| Priority | P0, P1, P2, P3 |
| Effort | XS, S, M, L |
| Wave | Wave 0, Wave 1, Wave 2, Wave 3, Wave 4 |
| Target release | v0.1, v0.2, v0.3, v0.4, v1.0 |
| Target date | Optional date field |

## Views

### Roadmap

Roadmap layout grouped by `Target release`, showing Epics and Features with target dates.

### Current wave

Board layout filtered to the active `Wave`, grouped by `Status`.

### Backlog

Table layout containing all unfinished items, sorted by `Priority`, then `Effort`.

### Bugs

Board or table filtered to `Type = Bug`, grouped by `Status`.

### Product website

Table filtered to `Area = Demo site`, showing website content, screenshots, and deployment tasks.

## Milestones

- v0.1 Foundation
- v0.2 Core tracking
- v0.3 Commitments and insights
- v0.4 Safety and polish
- v1.0 Personal release

## Automation intentions

- New issues enter `Backlog`.
- Assigned issues move to `Ready` when acceptance criteria are present.
- Pull Requests move linked work to `In review`.
- Merged Pull Requests move linked work to `Done` only after acceptance is confirmed.
- Closed issues should be archived from active views after release.

## Operating rhythm

At the start of a work session, select one task from the current wave. At the end, update the issue, project status, and relevant documentation. Avoid starting work from an untracked idea.
