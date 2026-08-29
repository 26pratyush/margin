# ADR-004 — Ledger correction and entry lifecycle

- Status: Accepted
- Date: 2026-08-29
- Issue: [MARGIN-016 / #39](https://github.com/26pratyush/margin/issues/39)
- Parent: [EPIC-003 / #38](https://github.com/26pratyush/margin/issues/38)

## Decision summary

Posted salary and expense entries are corrected through an explicit void-and-replace command. The original entry remains in the local ledger as a voided historical fact, and the replacement is a new active entry linked with `replacesId`. A standalone void is a terminal status change that never hard-deletes or silently reactivates an entry.

This preserves the existing [ADR-002](ADR-002-domain-model-and-balance-rules.md) model: only active entries affect derived balances, commitments remain separate from cash movement, and reconciliation is based on actual cash rather than disposable balance.

The raw ID of a replacement is new; the durable logical identity is the linked entry lineage. The original ID is never reused, and history can always traverse from a replacement to its source.

## Scope

This contract supports active `income` and `expense` entries only. It does not add correction behavior for `investment`, `refund`, `adjustment`, `commitment`, or `planningCycle` records. It does not introduce generic deletion, recurring automation, hosted storage, or investment valuation.

## Editable-field matrix

The correction command accepts a patch over the supported fields below. Financial dates remain local civil dates in canonical `YYYY-MM-DD` form, and amounts remain positive integer minor units.

| Field                        | Active income              | Active expense             | Rule                                                                                                                     |
| ---------------------------- | -------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `amountMinor`                | Editable                   | Editable                   | Required positive safe integer; zero, negative, fractional, and overflow values are rejected.                            |
| `occurredOn`                 | Editable                   | Editable                   | Required real `YYYY-MM-DD` date; no UTC conversion.                                                                      |
| `name`                       | Preserved but not editable | Optional and editable      | Missing expense names are absent, not empty strings; history uses the fallback `Expense`.                                |
| `categoryId`                 | Not applicable             | Optional and editable      | Must reference an existing category when present; absence renders as `Uncategorized` and never creates a blank category. |
| `source`                     | Optional and editable      | Preserved but not editable | Income source remains the salary/income metadata supported by the current surface.                                       |
| `note`                       | Optional and editable      | Optional and editable      | A cleared note is absent.                                                                                                |
| `type`                       | Immutable                  | Immutable                  | A correction cannot convert salary to expense or vice versa.                                                             |
| `status`                     | Dedicated command only     | Dedicated command only     | `active` can become `voided`; `voided` is terminal.                                                                      |
| `id`, `createdAt`            | Immutable                  | Immutable                  | The original historical values are never replaced.                                                                       |
| `commitmentId`, `refundOfId` | Not user-editable          | Not user-editable          | Link changes are controlled by the correction transaction and dependency rules below.                                    |

Existing fields not supported by the user-facing patch are preserved on the replacement when they are valid for the entry type. Category creation remains part of the transaction-entry contract, not the correction decision.

## Lifecycle

### Correction

```text
active original
    │ POST /api/entries/:id/correct
    │ validated patch + expectedUpdatedAt + operationId
    ▼
voided original ──────── replacesId ───────▶ active replacement
```

The operation is one local SQLite transaction:

1. Verify that the original exists, is active, has the expected `updatedAt`, and is an income or expense.
2. Validate the patch without allowing a type or unsupported-link change.
3. Preserve the original financial fields, set `status: voided`, and add lifecycle metadata (`voidedAt`, `voidReason` when supplied, `operationId`, and `replacedById`).
4. Create a replacement with a new ID, current `createdAt`/`updatedAt`, the corrected fields, `replacesId` pointing to the original, and the same `operationId`.
5. Preserve or explicitly handle valid commitment links and mark affected reconciliation snapshots for review.
6. Recalculate all returned summaries from the resulting active ledger.

There is exactly one direct active replacement for a successfully corrected entry. If that replacement is corrected later, the new replacement extends the same lineage rather than creating a second active value for any one source entry. A replacement is not a second debit or credit: its voided source is excluded from every active calculation.

### Void

```text
active entry ── POST /api/entries/:id/void ──▶ voided entry (terminal)
```

Voiding preserves the original financial payload, ID, creation timestamp, and local record. It changes only lifecycle metadata and status, including the persisted `operationId` used for replay detection. A non-empty reason is required by the service command, while confirmation is required by the future UI. A voided record cannot be edited, voided again, reactivated, or hard-deleted through the product.

## Dependencies and links

- A replacement inherits a valid `commitmentId` when the corrected expense remains linked to the same commitment. The service updates the commitment's denormalized `linkedEntryIds` from the voided ID to the replacement ID in the same transaction.
- A standalone void of a commitment-linked debit is rejected until the commitment is explicitly unlinked or otherwise resolved. This prevents a payment from disappearing while leaving an ambiguous commitment reservation.
- An entry with active refund dependents cannot be corrected or voided until those dependents are resolved or explicitly re-linked. Refund records themselves remain outside this issue's correction scope.
- `replacesId` must point to an existing voided entry of the same type. Replacement links cannot form cycles, point to themselves, or create multiple active replacements for one original.
- Link handling must be deterministic across both the entry's `commitmentId` and the legacy/indexed `linkedEntryIds` representation. The entry link is authoritative; the commitment index is kept consistent for backup and read compatibility.

## Effects on derived state

All calculations continue to use active entries only:

- Current and past planning-cycle summaries recalculate from the replacement or from the remaining active ledger after a void.
- Changing `occurredOn` can move an entry across local calendar cycles. It does not create a rollover entry, infer salary, or mutate expected-salary inputs.
- Commitment reservations are recalculated from active linked debits. An over-sized payment still leaves zero remaining reservation; its full actual debit remains counted.
- Actual and disposable balances may be zero or negative. Corrections never clamp, hide, or convert a derived balance into an adjustment.
- Historical views include voided records with an unambiguous `Voided` state, while active totals and counts exclude them. Replacement lineage should be available for later history UI work.

## Reconciliation snapshots

`BalanceSnapshot` values are evidence of what was known at the time and are never silently rewritten. A correction or void marks a snapshot `reviewState: needs-review` when the original or replacement date affects that snapshot's `asOf` boundary or changes the entry's signed contribution to the snapshot.

The snapshot retains its original `calculatedActualBalanceMinor`, `realBalanceMinor`, `differenceMinor`, and `adjustmentEntryId`. No automatic reconciliation adjustment is created. A later explicit reconciliation may create a new snapshot and adjustment; it does not erase the prior evidence. Legacy snapshots without `reviewState` are treated as current until an affected correction marks them for review.

## Concurrency and repeated requests

The dedicated commands use optimistic concurrency and an idempotency key:

```text
POST /api/entries/:id/correct
{
  "operationId": "client-generated-opaque-id",
  "expectedUpdatedAt": "2026-08-29T10:00:00.000Z",
  "patch": { "amountMinor": 8000, "note": "Corrected synthetic amount" }
}

POST /api/entries/:id/void
{
  "operationId": "client-generated-opaque-id",
  "expectedUpdatedAt": "2026-08-29T10:00:00.000Z",
  "reason": "Synthetic duplicate entry"
}
```

- Invalid input returns `400` with field details and performs no write.
- A missing entry returns `404`.
- A stale `expectedUpdatedAt`, unresolved dependency, terminal entry, invalid replacement link, or conflicting operation returns `409` with a deterministic conflict code.
- Replaying the same `operationId` against the same target and equivalent payload returns the original successful result and creates no additional replacement or void event.
- Reusing an `operationId` for a different target or different payload returns an idempotency conflict; operation IDs are opaque, non-empty, and persisted on the affected lifecycle records.
- A different operation against a terminal original returns a terminal conflict rather than silently changing history.
- The service, not React, owns validation, transactions, idempotency, link updates, and derived summaries.

## Backup, restore, and compatibility

The existing v2 JSON backup envelope remains the contract. Lifecycle fields, persisted operation IDs, replacement links, optional expense metadata, and snapshot review state are included in `data` and the existing integrity digest. No new SQLite table, raw SQLite export, or backup format version is introduced by this decision.

Existing v0.1.0 records remain valid: missing optional lifecycle fields mean no void metadata or replacement lineage, while the existing `status` remains authoritative. Restore validates replacement references, same-type lineage, commitment links, operation IDs, and snapshot references before replacing the local dataset. A restored voided original remains voided and recoverable, and a restored replacement remains active exactly once.

## Synthetic examples

### Normal correction

```text
Original expense:    ₹100, status=active, id=expense-1
Correction:          ₹80

expense-1:           ₹100, status=voided
expense-2:           ₹80, status=active, replacesId=expense-1
Calculated effect:  -₹80
```

### Past-cycle correction

An expense dated `2026-08-31` corrected to `2026-09-01` is removed from the August active summary and added to September. August rollover and expected salary are not rewritten; both cycle summaries are derived again from active entries.

### Commitment-linked correction

```text
Commitment:          ₹30,000
Original payment:    ₹10,000, linked to the commitment
Corrected payment:   ₹12,000, same commitment link
Remaining reserve:   ₹18,000
```

### Reconciliation review

If a snapshot as of `2026-08-31` included a ₹100 expense, correcting it to ₹80 keeps the snapshot's captured values unchanged and marks it `needs-review`. The corrected active ledger now contributes ₹80, and a later explicit reconciliation decides whether a new adjustment is needed.

### Safety cases

- A zero or negative correction is rejected; a zero or negative derived balance is valid.
- A duplicate correction request with the same `operationId` returns the original replacement; it does not create a second debit.
- A stale form with an old `expectedUpdatedAt` returns `409` and leaves the newer record untouched.
- JSON export, reset, and restore preserve both the voided original and active replacement.

## Implementation boundary

`MARGIN-016` records this decision and does not change application behavior. `MARGIN-017` implements the dedicated service commands, validation, atomic persistence, link handling, reconciliation review marking, and backup compatibility. Later issues may add the UI, history filters, and progressive metadata presentation, but they must consume this contract rather than redefine it.
