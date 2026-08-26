# EPIC-002 — Core tracking and salary planning

GitHub source: [Epic #22](https://github.com/26pratyush/margin/issues/22)

## Outcome

Create the next smallest product loop for Margin: a monthly salary-planning experience that keeps opening balance, new salary, actual spending, planned commitments, and remaining disposable amount distinct and understandable.

## Scope

### Included

- Define monthly planning, salary-cycle, opening-balance, and rollover semantics before changing the UI.
- Implement only the smallest domain and persistence representation required by the accepted rules.
- Keep actual ledger movement, expected salary, planned commitments, and disposable balance separate.
- Add a focused planning workspace using the existing restrained visual language.
- Add regression coverage at the domain, persistence, backup, and UI boundaries as each step lands.
- Review the completed flow against the local-first, JSON-backup, privacy, and design-system boundaries.

### Excluded

- Bank integrations, hosted accounts, cloud finance storage, recurring automation, and multi-account planning.
- CSV restore, raw SQLite archives, and a broad analytics or insights redesign.
- A general-purpose budgeting or arbitrary allocation engine before the smallest planning loop is proven.
- Developer workflow skills, PR-template changes, and broad GitHub Actions improvements.

## Child tasks

| Issue                                                 | Task                                                                           | Depends on                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------- |
| [#24](https://github.com/26pratyush/margin/issues/24) | `MARGIN-011` — Define monthly planning and rollover rules                      | MARGIN-003; MARGIN-008             |
| [#25](https://github.com/26pratyush/margin/issues/25) | `MARGIN-012` — Implement the opening-balance and salary-planning model         | MARGIN-011; MARGIN-010; MARGIN-006 |
| [#26](https://github.com/26pratyush/margin/issues/26) | `MARGIN-013` — Build the minimal salary-planning workspace                     | MARGIN-012                         |
| [#27](https://github.com/26pratyush/margin/issues/27) | `MARGIN-014` — Add salary-planning regression coverage and manual verification | MARGIN-013; MARGIN-007             |
| [#28](https://github.com/26pratyush/margin/issues/28) | `MARGIN-015` — Complete the planning release-boundary review                   | MARGIN-014                         |

Only the first child task should change the planning rules. Later tasks implement and verify the accepted behavior rather than introducing new semantics during UI or persistence work.

## Decision boundary

`MARGIN-011` records the normative behavior in [ADR-003 — Monthly planning and rollover](../../docs/decisions/ADR-003-monthly-planning-and-rollover.md) and its task brief at [MARGIN-011](../tasks/MARGIN-011-monthly-planning-and-rollover.md).

The existing actual-balance, commitment-reservation, reconciliation, local SQLite, and versioned JSON contracts remain authoritative. The planning slice adds a cycle-level view over those facts; it does not replace or reinterpret them.

## Sequence

1. Define and accept the monthly planning rules and synthetic examples.
2. Implement the minimum cycle and expected-salary model with migration and backup compatibility.
3. Build the smallest planning workspace in the existing app shell.
4. Add separated domain, persistence, backup, UI, and manual regression coverage.
5. Review the release boundary and record the next smallest product decision.

## Completion notes

When this epic is complete, update `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/LOCAL_DATA.md`, `docs/TESTING.md`, and the Wiki decision log with the implemented boundaries and verification evidence. MARGIN-015 owns the v0.1.0 release-boundary review and release notes at [docs/RELEASE-v0.1.0.md](../../docs/RELEASE-v0.1.0.md). Keep the next product slice separate from broader budgeting, automation, or hosted-data work.
