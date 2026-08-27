# EPIC-003 — Everyday tracking, safe ledger correction, and onboarding

GitHub source: [Epic #38](https://github.com/26pratyush/margin/issues/38)

## Outcome

Make Margin trustworthy and low-friction for everyday use after the v0.1.0 planning release: users can correct an honest ledger mistake safely, review activity over useful periods, record a lightweight expense without forced metadata, and understand the local app through a synthetic first-use path.

## Scope

### Included

- Define and implement safe correction semantics for active salary and expense entries.
- Preserve a correction-safe lifecycle: edits retain entry identity, voids preserve the original record, and hard deletion is not introduced.
- Keep balance, planning, commitment, reconciliation, backup, and restore calculations derived from the corrected active ledger.
- Add focused transaction-history filtering for supported periods with canonical local-date boundaries.
- Make expense name and category progressive metadata, with an intentional uncategorized state.
- Add a small first-use guide and an explicit synthetic-data mode that can never overwrite or upload a user's local ledger.
- Extend domain, persistence, backup, UI, accessibility, and synthetic manual-review coverage with each behavior.

### Excluded

- Investment portfolio tracking, current market value, profit/loss, liquidation, quote providers, tax lots, or investment advice.
- Bank integrations, automatic imports, hosted accounts, cloud sync, payment processing, or financial recommendations.
- General recurring-transaction automation or automatic future salary scheduling.
- CSV restore, raw SQLite archives, or a broad analytics/dashboard redesign. JSON remains the lossless restore format.
- Developer skills, broad GitHub Actions improvements, and repository workflow automation.
- A large tutorial system, gamification, notifications, or arbitrary budgeting/allocation rules.

## Child issues

| Issue                                                 | Task                                                                           | Priority | Depends on                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | -------- | -------------------------------- |
| [#39](https://github.com/26pratyush/margin/issues/39) | `MARGIN-016` — Define safe ledger correction and entry-lifecycle rules         | P0       | EPIC-002; ADR-002; ADR-003       |
| [#40](https://github.com/26pratyush/margin/issues/40) | `MARGIN-017` — Implement correction commands and backup-compatible persistence | P0       | MARGIN-016                       |
| [#41](https://github.com/26pratyush/margin/issues/41) | `MARGIN-018` — Add transaction history filters and period summaries            | P1       | MARGIN-016; MARGIN-017 preferred |
| [#42](https://github.com/26pratyush/margin/issues/42) | `MARGIN-019` — Make expense name and category progressive metadata             | P1       | MARGIN-016; MARGIN-017 preferred |
| [#43](https://github.com/26pratyush/margin/issues/43) | `MARGIN-020` — Add first-use guidance and an isolated synthetic demo mode      | P2       | EPIC-002; local-first boundary   |
| [#44](https://github.com/26pratyush/margin/issues/44) | `MARGIN-021` — Add everyday-tracking regression coverage and acceptance review | P1       | MARGIN-017 through MARGIN-020    |

Only `MARGIN-016` should establish correction, lifecycle, and optional-metadata semantics. Later issues implement and verify those decisions rather than redefining them in UI code.

## Dependencies

- [EPIC-002 / #22 — Core tracking and salary planning](https://github.com/26pratyush/margin/issues/22) is complete.
- [v0.1.0](https://github.com/26pratyush/margin/releases/tag/v0.1.0) is published from the validated local-first planning loop.
- [ADR-002 — Domain model and balance rules](../../docs/decisions/ADR-002-domain-model-and-balance-rules.md) remains authoritative for entry signs, active/voided records, reconciliation, and derived balances.
- [ADR-003 — Monthly planning and rollover](../../docs/decisions/ADR-003-monthly-planning-and-rollover.md) remains authoritative for planning-cycle semantics.
- Existing local SQLite, JSON backup/restore, and UI quality boundaries remain unchanged unless a child issue documents a backward-compatible extension.

## Acceptance criteria

- A user can edit an active salary or expense with explicit validation and confirmation; the record keeps its identity and dependent summaries recalculate.
- A user can void an active salary or expense with explicit confirmation; the original record remains recoverable in local data and backup, is excluded from active calculations, and cannot silently disappear.
- Correction behavior is covered for current and past planning cycles, commitments/reconciliation links, negative/zero balances, duplicate submissions, invalid input, and backup restore.
- Transaction history can be filtered by supported period presets without UTC date shifting or changing stored canonical dates.
- Expense creation accepts only the amount as mandatory; missing name/category values are represented intentionally and do not create empty or duplicate categories.
- The first-use guide and synthetic mode are clearly separate from real local data, reversible, keyboard accessible, reduced-motion safe, and never call a hosted finance backend.
- All changes use synthetic fixtures only and pass the repository quality gate, focused tests, build/type checks, and documented manual verification.
- No investment valuation, bank, hosted-data, recurring-automation, or developer-workflow behavior is introduced by this epic.

## Idea triage

The complete screenshot idea/status table is available in [Wiki-ready next work](../../wiki/Next-Work.md).

- Investment space with current value/profit-loss: deferred to a later epic because valuations, cost basis, realized versus unrealized performance, and liquidation semantics are not yet defined.
- Optional expense name/category: included narrowly in `MARGIN-019`, with an explicit uncategorized state.
- Tutorial with synthetic starting values: included narrowly in `MARGIN-020`, only with isolated local state.
- Skills and better Actions workflows: deferred to a separate developer-workflow epic.
- Data storage/model, JSON recovery, locker, release preparation, regression foundation, and licensing: delivered in v0.1.0; future changes must remain backward-compatible and issue-scoped.

## Sequence

1. Accept correction and metadata semantics in `MARGIN-016`.
2. Implement safe correction and backup-compatible persistence in `MARGIN-017`.
3. Add read-only history filters in `MARGIN-018`.
4. Make expense metadata progressive in `MARGIN-019`.
5. Add the isolated guide/demo path in `MARGIN-020`.
6. Run the full regression and manual acceptance review in `MARGIN-021`.
