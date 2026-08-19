# MARGIN-003 — Define domain model and balance rules

## Goal

Define the first framework-independent model for income, expenses, categories, commitments, periods, and remaining money.

The normative decision record is [`docs/decisions/ADR-002-domain-model-and-balance-rules.md`](../../docs/decisions/ADR-002-domain-model-and-balance-rules.md).

## Initial rules to settle

- How income is dated and assigned to a month.
- How recurring commitments differ from completed expenses.
- How negative or zero balances are displayed.
- Whether commitments reduce disposable balance before they are paid.
- How refunds, corrections, and deleted records behave.
- Currency precision and rounding.
- How a user reconciles the calculated actual balance with the real account balance when small transactions are omitted.

## Acceptance criteria

- Entity definitions and relationships are documented.
- Example synthetic records produce a manually verified summary.
- Core balance calculations have explicit examples.
- Edge cases are listed for later tests.

## Constraint

Keep financial calculations outside presentation components.
