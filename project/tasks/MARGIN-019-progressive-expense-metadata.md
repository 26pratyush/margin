# MARGIN-019 — Make expense name and category progressive metadata

- Epic: [#38 — Everyday tracking, safe correction, and onboarding](https://github.com/26pratyush/margin/issues/38)
- GitHub task: [#42](https://github.com/26pratyush/margin/issues/42)
- Priority: P1

## Goal

Allow a fast expense save with only a valid amount while keeping missing descriptive metadata explicit and useful.

## Scope

- Keep amount and date required; make name, category, and note optional according to the accepted contract.
- Represent missing category as `Uncategorized` or the approved equivalent without creating a blank category.
- Preserve predefined/existing categories, inline creation, and normalized duplicate prevention.
- Provide deterministic fallback labels in history, filters, exports, backups, and restore.

## Acceptance criteria

- Amount-only expenses save; invalid, zero, negative, and missing amounts remain rejected.
- Missing metadata creates no blank or duplicate categories and does not mislead display or totals.
- Existing records, categories, backups, restores, and legacy data remain lossless.
- Form order, labels, keyboard/focus, screen-reader, responsive, and reduced-motion behavior are covered.

## Dependencies and non-goals

Depends on `MARGIN-016`, with `MARGIN-017` preferred. Do not introduce a general category-management system or change investment/recurring semantics.

## Implementation record

Implemented on `codex/MARGIN-019-progressive-expense-metadata`. Expense creation now requires only a positive amount and valid civil date; blank optional metadata normalizes to absent fields, and categories are created only for non-empty category input. The form presents name, category, and note as optional, keeps `Uncategorized` explicit, and the history surface uses a stable `Uncategorized expense` fallback without changing stored records, summaries, or backup contents.

Verification: `npm run quality` passed on 2026-08-30 with 71 service tests, 31 UI tests, TypeScript validation, production build, and service coverage above all configured floors. Synthetic local creation and backup/restore verification confirmed amount-only expenses preserve balances and do not create blank categories; no real financial data was used.

Branch integration note (2026-08-31): on the same `codex/MARGIN-019-progressive-expense-metadata` branch, the follow-on local tracking behaviors requested during review were integrated with the existing implementation: planned reserves use the last civil day of the current month; expenses persist an explicit debit/credit direction with debit as the backward-compatible default; and Overview exposes signed balance sync through `/api/reconcile`, refreshing actual/disposable balances after the service records its adjustment or zero-difference snapshot. The integrated branch passes `npm run quality` with 76 service tests, 37 UI tests, and service coverage of 93.96% lines, 83.35% branches, and 97.60% functions.
