# MARGIN-008 — Build the first salary, expense, and balance slice

## Goal

Prove the full local loop with the smallest meaningful feature: add salary, add expense, and see what remains.

## User flow

1. Open the local Margin app.
2. Add or confirm a salary entry.
3. Add an expense with amount, category, and date.
4. Return to the dashboard.
5. See income, spending, and remaining disposable balance.

## Acceptance criteria

- Salary can be created and persisted locally.
- Expense can be created with a required amount, category, and date.
- The dashboard reflects the new records without requiring a reload if the chosen runtime supports it.
- The remaining balance calculation is covered by tests.
- Empty, invalid, and zero-value states are intentional.
- The flow uses synthetic seed data for screenshots and tests.

## Out of scope

Recurring expenses, SIP/RD automation, advanced charts, bank integrations, and multi-account support.
