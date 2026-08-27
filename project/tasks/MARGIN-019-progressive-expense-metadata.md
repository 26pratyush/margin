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
