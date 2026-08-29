# MARGIN-016 — Define safe ledger correction and entry-lifecycle rules

- Epic: [#38 — Everyday tracking, safe correction, and onboarding](https://github.com/26pratyush/margin/issues/38)
- GitHub task: [#39](https://github.com/26pratyush/margin/issues/39)
- Priority: P0

## Goal

Define the durable, user-visible rules for correcting an existing salary or expense without silently destroying ledger history or changing the meaning of balances.

## Scope

- Approve the editable-field matrix for active salary and expense entries.
- Define in-place versus void-and-replace correction behavior, stable identity, timestamps, and history.
- Define terminal void behavior and explicitly reject hard deletion as the user-facing correction path.
- Define effects on planning cycles, commitment links, reconciliation snapshots, actual balance, disposable balance, and backup/restore.
- Define repeated-submit, stale-record, and concurrency behavior.
- Define optional expense name/category behavior and the single representation for an uncategorized expense.

## Acceptance criteria

- The issue records an approved field-by-field edit matrix and lifecycle diagram.
- Corrections preserve original history or a clearly linked replacement history and never silently disappear.
- Voided entries are excluded from active calculations but remain visible and recoverable.
- Past-cycle, linked-commitment, reconciliation, zero, negative, restored, and duplicate-submit examples are documented with expected outcomes.
- The decision is recorded in a durable ADR or updated domain decision using synthetic examples only.

## Accepted decision

The contract is recorded in [ADR-004 — Ledger correction and entry lifecycle](../../docs/decisions/ADR-004-ledger-correction-and-entry-lifecycle.md). Corrections use an atomic void-and-replace flow with `replacesId`; standalone void is terminal; only active salary and expense entries are supported; commitment and refund dependencies, reconciliation review, optimistic concurrency, idempotency, and v2 JSON/SQLite compatibility are explicitly defined there.

## Dependencies and non-goals

EPIC-002, ADR-002, ADR-003, and the local SQLite/JSON boundaries are prerequisites. Do not implement UI, investment valuation, recurring automation, or generic deletion semantics here.
