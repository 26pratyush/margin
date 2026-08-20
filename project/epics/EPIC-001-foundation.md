# EPIC-001 — Foundation and first local vertical slice

## Outcome

Create a dependable project and application foundation, then prove it with a small local flow that records income and expenses and calculates what remains.

## Why this epic exists

Future work will happen across separate issues and chats. This epic establishes the shared vocabulary, technical direction, local workflow, and minimum vertical slice needed so later work does not start from disconnected prototypes.

## Scope

### Included

- Repository and GitHub workflow baseline.
- Local application stack decision.
- Initial domain model and balance rules.
- Reproducible local setup.
- Initial app shell and dark visual foundation.
- Local persistence boundary.
- Automated quality checks.
- First salary/expense/balance vertical slice.

### Excluded

- Bank integrations.
- Hosted user accounts.
- Cloud finance data.
- Full analytics suite.
- Complete SIP/RD planning experience.
- Final public website content.

## Tasks

| Task         | Title                                              | Wave | Depends on                                          |
| ------------ | -------------------------------------------------- | ---- | --------------------------------------------------- |
| `MARGIN-001` | Establish project baseline and GitHub workflow     | 0    | —                                                   |
| `MARGIN-002` | Choose local application stack and runtime         | 1    | MARGIN-001                                          |
| `MARGIN-003` | Define domain model and balance rules              | 1    | MARGIN-001; partly MARGIN-002                       |
| `MARGIN-004` | Bootstrap reproducible local development           | 2    | MARGIN-002                                          |
| `MARGIN-005` | Create application shell and design foundation     | 2    | MARGIN-004                                          |
| `MARGIN-006` | Create local persistence and backup boundary       | 2    | MARGIN-003; MARGIN-004                              |
| `MARGIN-007` | Add automated quality checks                       | 3    | MARGIN-004                                          |
| `MARGIN-008` | Build salary, expense, and remaining-balance slice | 3    | MARGIN-003; MARGIN-005; MARGIN-006                  |
| `MARGIN-009` | Create static product-site foundation              | 4    | MARGIN-001; useful screenshots depend on MARGIN-008 |

## Acceptance criteria

- A new chat can understand the product boundary by reading `README.md` and `docs/PROJECT_CONTEXT.md`.
- The chosen local stack and persistence approach are documented with setup commands.
- The first domain rules are represented outside the UI and covered by tests.
- A fresh checkout can start the local project using documented commands.
- The local app has an intentional shell, empty states, and dark visual tokens.
- Synthetic data can be created, stored, and reset locally.
- A user can add a salary, add an expense, and see the resulting remaining balance.
- The repository has a repeatable check command and a GitHub workflow for it.
- The product website can be built independently of the finance app.

## Completion notes

When closing this epic, update:

- `docs/PROJECT_CONTEXT.md` with final stack decisions.
- `docs/ARCHITECTURE.md` with the implemented boundaries.
- `docs/DEPLOYMENT.md` with site build/deploy details.
- `project/ROADMAP.md` with the next milestone.
- The GitHub Wiki decision log.
