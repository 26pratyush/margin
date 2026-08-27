# MARGIN-018 — Add transaction history filters and period summaries

- Epic: [#38 — Everyday tracking, safe correction, and onboarding](https://github.com/26pratyush/margin/issues/38)
- GitHub task: [#41](https://github.com/26pratyush/margin/issues/41)
- Priority: P1

## Goal

Let users review local transactions over useful periods without changing the global balance picture.

## Scope

- Add `All time`, `This week`, and `This month` presets using local calendar dates.
- Add focused type/status filters and clearly distinguish active from voided history.
- Show filtered counts and totals separately from global actual/disposable balances.
- Keep a reusable inclusive/exclusive date-boundary abstraction for later custom ranges.

## Acceptance criteria

- Week/month/year-boundary examples are explicit and never shift through UTC.
- Filtering is read-only and does not mutate records or recalculate global balances from a subset.
- Empty, loading, invalid-range, negative/zero, voided, reset, and keyboard states are covered.
- UI tests agree with the domain calculation and do not add charts or broad analytics.

## Dependencies and non-goals

Depends on the correction semantics, with `MARGIN-017` preferred. No investment performance, hosted query service, or dashboard redesign.
