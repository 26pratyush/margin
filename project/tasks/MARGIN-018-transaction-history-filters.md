# MARGIN-018 — Add transaction history filters and period summaries

- Epic: [#38 — Everyday tracking, safe correction, and onboarding](https://github.com/26pratyush/margin/issues/38)
- GitHub task: [#41](https://github.com/26pratyush/margin/issues/41)
- Priority: P1

## Goal

Let users review local transactions over useful periods without changing the global balance picture.

## Scope

- Add `Today`, `This week`, `This month`, `All time`, and inclusive `Custom range` presets using local calendar dates.
- Add focused type/status filters and clearly distinguish active from voided history.
- Show filtered counts and totals separately from global actual/disposable balances.
- Keep a reusable inclusive/exclusive date-boundary abstraction so selected custom end dates remain included.

## Acceptance criteria

- Week/month/year-boundary and custom inclusive-range examples are explicit and never shift through UTC.
- Filtering is read-only and does not mutate records or recalculate global balances from a subset.
- Empty, loading, invalid-range, negative/zero, voided, reset, and keyboard states are covered.
- UI tests agree with the domain calculation and do not add charts or broad analytics.

## Dependencies and non-goals

Depends on the correction semantics, with `MARGIN-017` preferred. No investment performance, hosted query service, or dashboard redesign.

## Implementation record

Implemented on `codex/MARGIN-018-transaction-history-filters` with a read-only `/api/history` projection over local entries and reconciliation snapshots. The service resolves local Monday weeks and inclusive custom date inputs into canonical `[startOn, endOn)` ranges, calculates filtered movement without changing global summaries, and presents balance syncs as explicit history items.

The Transactions screen defaults to `This month` and active records, supports All/Income/Expenses/Balance sync and Active/Voided/All filters, keeps custom filter state local, and renders a continuous newest-first history grouped by civil day. Voided correction lineage, zero-difference syncs, reconciliation review state, loading, empty, invalid-range, keyboard, and responsive states are covered.

Verification: `npm run quality` passed on 2026-08-30 with 69 service tests, 29 UI tests, service coverage above all configured floors, TypeScript checks, and production build. No persistence schema or backup format changed; no real financial data was used.
