# MARGIN-029 — Keep Overview latest entries fresh and chronologically correct

- Issue: [#60 — Keep Overview latest entries fresh and chronologically correct](https://github.com/26pratyush/margin/issues/60)
- Epic: [#52 — Developer workflow, CI quality, and release safety](https://github.com/26pratyush/margin/issues/52)
- Priority: P1

## Goal

Keep the Overview `Latest entries` panel synchronized with the local ledger and aligned with the Transactions history ordering, without changing the authoritative dataset or balance calculations.

## Contract

- Overview reads `GET /api/history?period=all&type=all&status=all` for its preview.
- The service history projection remains authoritative for civil-date descending, creation-time descending, and ID tie-break ordering.
- Overview renders at most five history items, including balance-sync items and explicit voided/correction states when they are among the newest records.
- Dataset, global summary, and latest-history data are refreshed together after real workspace mutations and workspace transitions.
- The preview is presentation-only. It never recalculates balances, writes to SQLite, or replaces the full dataset used by other screens.
- Real and synthetic workspaces use their corresponding local or isolated history boundary; synthetic mode never calls a real write endpoint.

## Scope

- Replace raw `dataset.entries.slice(0, 5)` rendering with the existing history projection.
- Preserve local-first service ownership and the complete ledger.
- Cover stale/non-chronological dataset order, newest entry rendering, sync-row rendering, and history query selection in UI tests.
- Keep empty, loading, error, real, and synthetic workspace behavior safe and understandable.

## Acceptance criteria

- Newly created, corrected, voided, and reconciled records appear in the correct newest-first position after the existing refresh completes.
- The panel does not depend on SQLite record-ID order.
- No entries are deleted, replaced, or omitted from the authoritative dataset.
- Overview metrics remain sourced from `/api/summary` and do not use the five-item preview.
- Focused UI tests and the complete repository quality gate pass.

## Implementation record

The Overview now loads the all-time, all-type, all-status history projection alongside the dataset and global summary. It renders the first five projected items with the existing history entry and balance-sync presentation components. Refreshes clear the prior preview and commit the dataset, summary, and history response together, so an outdated preview is not retained after a mutation or workspace switch.
