# ADR-003 — Monthly planning and rollover rules

- Status: Accepted; implemented incrementally through MARGIN-012
- Date: 2026-08-22
- Issue: [MARGIN-011](https://github.com/26pratyush/margin/issues/24)
- Parent: [EPIC-002](https://github.com/26pratyush/margin/issues/22)

## Decision summary

Margin's first planning loop uses local calendar-month cycles. A cycle explains the relationship between money already held, salary expected or actually received, actual ledger movement, active commitment reservations, and disposable balance without turning expected money into actual cash.

The planning view is a derived view over the existing ledger, commitment, reconciliation, and backup contracts. It does not replace the actual-balance calculation or persist duplicate closing and disposable amounts.

## Cycle identity and dates

- A cycle is identified by a calendar month key such as `2026-08`.
- The cycle range is `[2026-08-01, 2026-09-01)`: inclusive at the start and exclusive at the next cycle start.
- Financial dates are local civil dates in canonical `YYYY-MM-DD` form for storage, domain values, APIs, and backups. The user-facing UI formats them according to locale, including `DD/MM/YYYY` for India.
- No planning value is shifted through UTC.
- Actual salary belongs to the cycle containing its actual `occurredOn` date. An expected payment date does not reassign a late receipt to an earlier cycle.
- A future non-calendar salary period is out of scope for this slice.

## Opening balance and rollover

The opening balance is actual cash already held before the cycle begins:

```text
openingActual
  = sum of active signed ledger entries before cycle.start
```

The first tracked cycle may establish an opening balance through an explicit active `adjustment` entry with `adjustmentReason: opening-balance`. The planning model must not infer an opening balance from an expected salary or from an unexplained later account balance.

The next cycle's opening actual balance is the previous cycle's actual closing balance. It is not the previous cycle's disposable balance, because commitments are reservations rather than cash movements. Unfulfilled commitments remain active reservations until they are settled or cancelled.

Rollover therefore does not create an income entry, a new transaction, or a second copy of the balance. If a backdated ledger entry changes a previous cycle, derived values change and affected reconciliation snapshots remain subject to review under ADR-002.

## Expected and actual salary

Expected salary is a persisted planning fact for a cycle. It has no effect on actual or disposable balance until an active `income` entry is recorded.

Actual salary is derived by summing active income entries in the cycle. The model does not persist a second actual-salary amount or silently create an income entry.

The planning state is interpreted as follows:

- No expected amount: the cycle has no salary expectation.
- Expected with no receipt: the cycle remains expected while open and is missing after its expected cycle closes.
- Actual below expected: the cycle is partial; the difference is an informational shortfall, not a debit.
- Actual received on or above expectation: the actual receipt is counted as income; any variance is informational.
- Receipt after the expected cycle: the earlier cycle remains short or missing, and the later cycle receives the actual income.

Zero actual income is valid. Expected income must never be used to inflate actual cash, disposable cash, or rollover.

## Actual movement, commitments, and disposable balance

For a cycle `[start, end)`:

```text
periodCredits
  = income + refunds + credit adjustments in [start, end)

periodDebits
  = expenses + investments + debit adjustments in [start, end)

closingActual
  = openingActual + periodCredits - periodDebits

remainingCommitment
  = max(plannedAmount - activeLinkedDebitAmount, 0)

reservedCommitments
  = remaining active commitments due in [start, end)

disposableBalance
  = closingActual - reservedCommitments
```

Actual expenses and investments reduce cash when they occur. A commitment is not a cash movement. A linked active debit reduces the remaining reservation, so the same payment is not counted as both an actual debit and a second full commitment reserve.

Commitments may exceed actual cash; negative actual or disposable balances are valid results. Zero balances are also valid results. Cancellation releases a reservation without creating a cash movement.

## Persisted versus derived planning state

The minimum future planning record contains:

```text
PlanningCycle
- id or deterministic cycleKey, for example 2026-08
- startOn
- endOn
- expectedSalaryMinor?
- expectedSalaryOn?
- createdAt
- updatedAt
```

The following remain derived from existing facts:

- Actual salary received.
- Opening and closing actual balances.
- Rollover amount.
- Remaining commitments.
- Disposable balance.
- Salary status and variance.

The exact persistence migration, validation, repository boundary, and backup compatibility belong to `MARGIN-012`. This decision does not authorize a general allocation engine or recurring salary automation.

`MARGIN-012` implements the minimum `planningCycles` persistence collection and derives all balance and salary outcomes from existing ledger and commitment facts. The UI and allocation workspace remain separate follow-up work.

## Golden synthetic examples

All values use INR and are synthetic.

| Case             | Expected result                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal month     | Opening ₹20,000 + actual salary ₹100,000 − expense ₹25,000 − investment ₹10,000 = closing actual ₹85,000. A ₹30,000 commitment with ₹10,000 linked payment leaves a ₹20,000 reserve and ₹65,000 disposable. |
| Rollover month   | Previous actual close ₹40,000 becomes the next opening. With no salary, a ₹10,000 expense, and an unpaid ₹15,000 current-cycle commitment, closing actual is ₹30,000 and disposable is ₹15,000.             |
| Partial income   | Expected ₹100,000 and actual ₹60,000 with opening ₹5,000 and expense ₹20,000 gives closing actual ₹45,000. A ₹30,000 reserve leaves ₹15,000 disposable; the ₹40,000 shortfall is not a debit.               |
| Negative balance | Opening -₹10,000 + salary ₹50,000 − expense ₹45,000 = closing actual -₹5,000. A ₹10,000 reserve gives disposable -₹15,000.                                                                                  |
| Zero balance     | Opening ₹0 and expected salary ₹75,000 with no actual receipt, movements, or reserve gives closing actual and disposable of ₹0.                                                                             |
| Missing salary   | Expected ₹100,000 with no receipt and opening ₹10,000 leaves actual balance ₹10,000; no income is inferred.                                                                                                 |
| Late salary      | An August expectation with no August receipt remains short or missing. A receipt on September 2 is September income and is not backdated.                                                                   |

## Consequences

- The planning surface can explain held, arriving, moved, committed, and available money without conflating them.
- The model remains compatible with the local-first SQLite and versioned JSON boundaries.
- The domain can add cycle-level calculations without changing the meaning of existing global summaries.
- Executable domain, persistence, backup, and UI regression coverage is intentionally delivered by later EPIC-002 tasks after the model and workspace exist.
