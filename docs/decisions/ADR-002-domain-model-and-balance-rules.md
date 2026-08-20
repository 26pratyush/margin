# ADR-002 — Domain model, balance rules, and reconciliation

- Status: Accepted
- Date: 2026-08-19
- Issue: [MARGIN-003](https://github.com/26pratyush/margin/issues/4)

## Decision summary

Margin uses a single-currency, date-based ledger for actual money movements and a separate commitment model for planned reservations. Reconciliation adjusts the calculated actual cash balance to a user-entered real account balance without pretending that unrecorded activity was individually captured.

The model is framework-independent. React, persistence adapters, and UI components must consume the domain contracts rather than own financial calculations.

## Money and dates

- Persist every amount as a positive integer number of minor units; never use floating-point arithmetic for money.
- v0.1 uses one currency per local ledger, defaulting to INR with two decimal places. Mixed currencies and FX conversion are out of scope.
- Use local civil dates in `YYYY-MM-DD`; do not convert financial dates through UTC.
- Period ranges are inclusive at the start and exclusive at the end: `[start, end)`.
- A monthly salary belongs to the calendar month containing its actual `occurredOn` date. A late or early payment is not silently moved to another month.
- Zero-value ledger entries are rejected. Zero balances and negative balances are valid results.

## Actual ledger entries

Actual entries describe money that has moved or a deliberate balance correction.

| Entry type   | Direction       | Meaning                                                 |
| ------------ | --------------- | ------------------------------------------------------- |
| `income`     | Credit          | Salary, bonus, or other money received                  |
| `expense`    | Debit           | Purchase or bill already paid                           |
| `investment` | Debit           | Actual investment contribution; not investment advice   |
| `refund`     | Credit          | Money returned from an expense or investment            |
| `adjustment` | Credit or debit | Opening balance, reconciliation, or explicit correction |

Each entry contains:

```text
id, type, amountMinor, occurredOn, status, categoryId?, source?, note?
commitmentId?, refundOfId?, replacesId?, adjustmentReason?
createdAt, updatedAt
```

Amounts are never negative. Direction is derived from the type except for `adjustment`, which explicitly stores credit or debit direction.

Transfers between accounts are deferred until the product supports multiple accounts. They should eventually be paired debit/credit entries with zero net effect on total wealth; they must not be faked as expenses in v0.1.

## Salary and recurring income

Each actual salary receipt is an explicit `income` entry. A monthly salary is therefore recorded once per month, with its real pay date and source label.

An eventual recurring-income template may help create the next expected entry, but it must never silently generate actual income or affect balances before the user confirms the occurrence.

## Planned commitments

A commitment is a reservation, not an actual transaction.

```text
Commitment
- id
- kind: purchase | investment | bill | saving
- name
- plannedAmountMinor
- dueOn
- status: planned | partially-settled | settled | cancelled
- linkedEntryIds
- createdAt, updatedAt
```

When money leaves, the user records an `expense` or `investment` linked to the commitment. The remaining reservation is:

```text
remainingCommitment
  = max(plannedAmountMinor - activeLinkedDebitAmount, 0)
```

This prevents double counting:

```text
₹30,000 commitment
₹10,000 linked payment
₹20,000 remaining reservation
```

An actual payment larger than the commitment has zero remaining reservation; the excess remains a real debit. A refund restores cash but does not automatically reopen a fulfilled commitment.

The period summary includes commitments due inside the selected period. A separate future-commitment view may show all active reservations without changing the selected-period formula.

## Corrections, voids, and refunds

Persisted financial facts are not silently deleted or overwritten.

- A correction voids the original entry and creates a replacement with `replacesId`.
- Only active entries participate in calculations.
- “Delete” for a posted entry means void with a reason; hard deletion is reserved for unsaved drafts.
- A refund is a positive credit and may reference the original debit using `refundOfId`.
- Partial refunds are valid. A refund greater than the unreversed original debit is rejected.
- An entry with linked refunds or commitment settlements cannot be voided until dependents are resolved or re-linked.
- An `adjustment` is used for opening balance, reconciliation, or explicit external correction—not as a hidden substitute for ordinary expenses.

Example correction:

```text
Original expense:     ₹100, status = voided
Replacement expense:   ₹80, replacesId = original.id
Calculated effect:     -₹80
```

## Reconciliation with the real account balance

The app is intentionally a large-transaction tracker, so the recorded ledger may be higher than the real account balance because small purchases were omitted.

Reconciliation compares actual cash, not disposable cash after commitments.

```text
calculatedActualBalance
  = opening balance + active credits - active debits

reconciliationDifference
  = realBalanceEnteredByUser - calculatedActualBalance
```

The app stores a `BalanceSnapshot`:

```text
BalanceSnapshot
- id
- asOf
- calculatedActualBalanceMinor
- realBalanceMinor
- differenceMinor
- adjustmentEntryId?
- note?
```

When the user chooses “Sync with real balance,” the app creates an `adjustment` linked to the snapshot:

- Negative difference: unrecorded spending or other missing debits.
- Positive difference: unrecorded income, refund, or a previous correction.
- First sync: may establish the opening balance.
- Later syncs: create new reconciliation events; they do not rewrite prior history.

Example:

```text
Recorded salary:       +₹100,000
Recorded big purchase:  -₹20,000
Calculated actual:      ₹80,000
Real account balance:    ₹77,500
Reconciliation entry:    -₹2,500  (untracked activity)
Adjusted actual:          ₹77,500
```

The commitment reserve is applied only after actual cash reconciliation:

```text
adjusted actual balance - remaining commitment reserve = disposable balance
```

If a backdated entry changes a previously reconciled date, affected snapshots are marked for review. The app does not silently rewrite the historical reconciliation.

## Balance calculations

For a selected period `[start, end)`:

```text
openingActual
  = sum of active signed ledger entries before start

periodCredits
  = income + refunds + credit adjustments in the period

periodDebits
  = expenses + investments + debit adjustments in the period

closingActual
  = openingActual + periodCredits - periodDebits

periodCommitmentReserve
  = remaining active commitments due in the period

disposableBalance
  = closingActual - periodCommitmentReserve
```

The UI must expose these separately:

- Income
- Gross expenses
- Refunds
- Investment outflows
- Reconciliation/untracked activity
- Actual closing balance
- Reserved commitments
- Disposable balance

This keeps “what was recorded,” “what was actually in the account,” and “what is reserved for future use” distinct.

## Synthetic reference examples

### Monthly salary, spending, and commitment

```text
Opening actual:          ₹0
Salary:             +₹100,000
Expense:             -₹20,000
Investment:          -₹10,000
Commitment reserve:   ₹30,000

Closing actual:        ₹70,000
Disposable balance:    ₹40,000
```

### Partial commitment settlement

```text
Commitment:            ₹30,000
Linked payment:        ₹10,000
Remaining reserve:     ₹20,000
Total cash reduction:  ₹30,000
```

### Refund

```text
Expense:               -₹20,000
Refund:                 +₹5,000
Net expense:           ₹15,000
```

### Reconciliation

```text
Calculated actual:     ₹80,000
Real actual:           ₹77,500
Untracked adjustment:   -₹2,500
Disposable after
commitment reserve:     ₹47,500  # with a ₹30,000 reserve
```

## Invariants and edge cases

- Amounts must be positive integers in the ledger’s minor unit.
- A missing income entry must not be inferred from a later balance sync.
- Commitments may exceed actual cash; the disposable balance becomes negative and the UI shows a warning rather than blocking the record.
- A cancelled commitment releases its remaining reservation without creating a cash movement.
- A settled commitment is not reserved again when its linked debit is displayed.
- Refunds cannot exceed the original unreversed debit.
- Voided entries and their invalid links cannot affect summaries.
- A zero balance is displayed as zero; negative actual or disposable balances are displayed with their sign.
- Invalid dates, invalid period ranges, duplicate IDs, mixed currencies, and negative/zero transaction amounts are rejected.
- Private browsing, cleared browser storage, changed origins, and stale backups are recovery concerns handled by MARGIN-006.

## Implementation boundary

MARGIN-003 establishes this normative model and its golden examples. MARGIN-004 materializes the TypeScript scaffold. MARGIN-006 implements SQLite persistence, snapshots, versioned JSON import/export, and safe reset. MARGIN-007 adds executable unit/property tests, and MARGIN-008 proves salary, expense, and remaining-balance behavior in the UI.
