# MARGIN-011 — Define monthly planning and rollover rules

## Parent

- Epic: [#22 — Core tracking and salary planning](https://github.com/26pratyush/margin/issues/22)
- Prerequisites: [#4 — MARGIN-003 domain model](https://github.com/26pratyush/margin/issues/4); [#9 — MARGIN-008 salary/expense/balance slice](https://github.com/26pratyush/margin/issues/9)
- Normative decision: [`ADR-003 — Monthly planning and rollover`](../../docs/decisions/ADR-003-monthly-planning-and-rollover.md)

## Goal

Define the smallest trustworthy meaning of a monthly planning cycle before adding new storage or UI. The result must explain what was already held, what is arriving, what has actually moved, what is committed, and what remains available.

## Rules to settle

### Cycle boundaries

- A cycle is identified by a local calendar month, such as `2026-08`.
- Its range is `[2026-08-01, 2026-09-01)`: inclusive at the start and exclusive at the next cycle start.
- Dates remain local civil dates in `YYYY-MM-DD`; no salary or balance date is shifted through UTC.
- The cycle starts and ends by calendar date, not by the date on which a user opens the app or by an inferred pay-period boundary.

### Opening balance and rollover

- `openingActual` is the signed total of active ledger entries before the cycle start.
- The first tracked cycle may establish its opening balance with an explicit `adjustment` entry whose reason is `opening-balance`.
- `closingActual` is the opening actual balance plus the cycle's active credits minus its active debits.
- The next cycle opens with the previous cycle's actual closing balance, not the previous disposable balance.
- Unspent cash is not a new income entry. Unfulfilled commitments remain reservations until settled or cancelled.
- A backdated entry can change a derived opening or closing value; existing reconciliation-review rules still apply.

### Expected and actual salary

- Expected salary is a planning fact and has no effect on actual or disposable balance.
- Salary becomes actual only when the user records an active `income` ledger entry.
- Actual salary is counted in the cycle containing its real `occurredOn` date, even when it arrives late.
- A partial receipt contributes only the amount actually received; the expected shortfall is not a debit.
- A missing or zero receipt does not create inferred income from the expected amount or from a later balance reconciliation.
- A late receipt leaves the earlier cycle short on actual income and contributes to the later cycle instead.

### Spending, commitments, and disposable balance

- Actual expenses and investments reduce actual cash when their active ledger entries occur.
- A commitment is a reservation, not a cash movement.
- A linked active expense or investment reduces the commitment's remaining reservation and is not counted again as a reserve.
- For a cycle summary, the reserve is the remaining amount of active commitments due inside that cycle. A separate future-commitment view may show active reservations outside the selected cycle.
- A commitment can exceed actual cash; disposable balance may therefore be negative.
- Cancellation releases the remaining reservation without creating a cash movement.

For a cycle `[start, end)`:

```text
openingActual
  = sum of active signed ledger entries before start

periodCredits
  = income + refunds + credit adjustments in [start, end)

periodDebits
  = expenses + investments + debit adjustments in [start, end)

closingActual
  = openingActual + periodCredits - periodDebits

remainingCommitment
  = max(plannedAmount - activeLinkedDebitAmount, 0)

reservedCommitments
  = sum of remaining active commitments due in [start, end)

disposableBalance
  = closingActual - reservedCommitments
```

These rules preserve the existing distinction between actual balance, reserved commitments, and disposable balance. This issue does not change the existing all-ledger summary implementation; `MARGIN-012` will add the focused cycle-level representation and calculations.

## Synthetic examples

All examples use INR minor units in the eventual fixtures and are shown here in rupees for readability.

| Case             | Inputs                                                                                                            | Expected outputs                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal month     | Opening ₹20,000; actual salary ₹100,000; expense ₹25,000; investment ₹10,000 linked to a ₹30,000 commitment       | Closing actual ₹85,000; remaining reserve ₹20,000; disposable ₹65,000                                                                                   |
| Rollover month   | Previous actual close ₹40,000; no actual salary; expense ₹10,000; current-cycle commitment ₹15,000 remains unpaid | Opening actual ₹40,000; closing actual ₹30,000; reserve ₹15,000; disposable ₹15,000. The previous disposable amount is not used as the opening balance. |
| Partial income   | Opening ₹5,000; expected salary ₹100,000; actual salary ₹60,000; expense ₹20,000; commitment reserve ₹30,000      | Closing actual ₹45,000; salary shortfall ₹40,000 as an informational variance; disposable ₹15,000                                                       |
| Negative balance | Opening actual -₹10,000; actual salary ₹50,000; expense ₹45,000; reserve ₹10,000                                  | Closing actual -₹5,000; disposable -₹15,000; no clamping or blocked write                                                                               |
| Zero balance     | Opening ₹0; expected salary ₹75,000; no actual salary, movements, or reservations                                 | Closing actual ₹0; disposable ₹0; expected salary does not become income                                                                                |
| Missing salary   | Expected salary ₹100,000; actual salary ₹0 by cycle close; opening ₹10,000; no movements                          | Closing actual ₹10,000; salary state is missing after close; no inferred ₹100,000 credit                                                                |
| Late salary      | August expects ₹100,000 but receives nothing; ₹100,000 arrives on September 2                                     | August remains short on actual income; the receipt is September income and is not backdated into August                                                 |

These examples are the golden behavior fixtures for `MARGIN-012`. Executable regression coverage is added at the domain and persistence boundaries in `MARGIN-014`, after the model exists.

## Minimum handoff for MARGIN-012

The smallest persisted planning fact should be a cycle record with:

- A deterministic cycle identity, such as `2026-08`.
- Local `startOn` and exclusive `endOn` dates, or an equivalent derivable month key.
- Optional expected salary amount in positive minor units.
- Optional expected salary date in local `YYYY-MM-DD` format.
- Stable created and updated timestamps if the persistence boundary requires them.

The following remain derived rather than duplicated persisted fields:

- Actual salary received.
- Opening and closing actual balances.
- Rollover amount.
- Remaining commitment reserve.
- Disposable balance.
- Salary state and variance.

Actual salary remains an existing `income` entry. Existing commitments, reconciliation snapshots, and explicit opening adjustments remain the source of truth for their respective facts.

## Acceptance criteria

- The rules are recorded in the project decision/documentation boundary and linked from EPIC-002.
- Normal, rollover, partial-income, negative-balance, zero-balance, missing-salary, and late-salary examples have synthetic inputs and expected outputs.
- The rules preserve existing actual-balance, reserved-commitment, and disposable-balance meanings.
- The minimum data required for the next model issue is explicit, without designing a broad budgeting system.
- No UI, hosted storage, bank integration, recurring automation, or new persistence schema is added in this issue.

## Out of scope

- Implementing the persistence model or SQLite migration.
- Building the locker-style workspace.
- CSV restore or raw SQLite archive support.
- Developer workflow skills, PR templates, or GitHub Actions changes.
