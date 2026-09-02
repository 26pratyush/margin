# MARGIN-021 — Add everyday-tracking regression coverage and acceptance review

- Epic: [#38 — Everyday tracking, safe correction, and onboarding](https://github.com/26pratyush/margin/issues/38)
- GitHub task: [#44](https://github.com/26pratyush/margin/issues/44)
- Priority: P1

## Goal

Verify the epic as a complete, safe local product slice and record evidence before closure.

## Scope

- Add unit, service/storage integration, and React interaction coverage for correction, filtering, optional metadata, onboarding, and synthetic isolation.
- Run restart, JSON validation/restore, legacy-data, duplicate/stale-request, date-boundary, signed-balance, and accessibility checks.
- Run the complete quality gate and an isolated synthetic manual flow.
- Record commit, commands, browser/device coverage, known limitations, and follow-ups in `docs/TESTING.md`.

## Acceptance criteria

- Every child issue has executable or documented evidence; no workaround is hidden in mocks.
- Root quality, focused tests, type checks, build, and relevant site checks pass.
- Manual review uses synthetic values only and covers correction, filters, optional fields, demo isolation, and all derived balance states.
- Any defect is fixed in scope or recorded as a linked follow-up with a clear release decision.
- Documentation, issue status, and Project status are updated before the epic closes.

## Dependencies and non-goals

Depends on `MARGIN-017` through `MARGIN-020`. Do not weaken coverage thresholds or replace service-boundary assertions with UI-only mocks.

## Implementation record

Release preparation adds the real-workspace Transactions consumer for the existing correction and void commands. Active salary and expense rows expose keyboard-accessible Edit and Void actions; corrections validate the editable-field matrix and optimistic-concurrency timestamp, while voids require a reason and preserve recoverable history. Synthetic mode remains read-only and never renders these actions.

The release regression suite adds a vertical HTTP scenario covering direction-aware entries, month-end reserve planning, reconciliation, correction lineage, voided totals, filtered-history non-mutation, backup restore, and restart persistence. Existing MARGIN-017–020 unit, service/storage, and React coverage was audited rather than bypassed. Verification evidence is recorded in [`docs/TESTING.md`](../../docs/TESTING.md), and the release checklist is in [`docs/RELEASE-v0.2.0.md`](../../docs/RELEASE-v0.2.0.md).
