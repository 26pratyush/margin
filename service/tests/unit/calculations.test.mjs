import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateActualBalanceMinor, calculateRemainingCommitmentMinor } from '../../domain/calculations.mjs'
import { calculateLedgerSummary } from '../../domain/summary.mjs'
import { syntheticEntry } from '../fixtures/synthetic.mjs'

test('calculates actual balance from active cash movements', () => {
  const entries = [
    syntheticEntry({ id: 'salary', type: 'income', amountMinor: 100000 }),
    syntheticEntry({ id: 'expense', type: 'expense', amountMinor: 12500 }),
    syntheticEntry({ id: 'investment', type: 'investment', amountMinor: 20000 }),
    syntheticEntry({ id: 'refund', type: 'refund', amountMinor: 2500 }),
    syntheticEntry({ id: 'credit', type: 'adjustment', amountMinor: 1000, direction: 'credit' }),
    syntheticEntry({ id: 'debit', type: 'adjustment', amountMinor: 500, direction: 'debit' }),
  ]

  assert.equal(calculateActualBalanceMinor(entries), 70500)
})

test('ignores voided entries and returns zero for an empty ledger', () => {
  assert.equal(calculateActualBalanceMinor([]), 0)
  assert.equal(calculateActualBalanceMinor([syntheticEntry({ status: 'voided', amountMinor: 999999 })]), 0)
})

test('rejects an unsupported entry type instead of silently changing the balance', () => {
  assert.throws(
    () => calculateActualBalanceMinor([syntheticEntry({ type: 'unknown' })]),
    (error) => error instanceof RangeError && error.message.includes('Unsupported entry type'),
  )
})

test('rejects an unsupported adjustment direction instead of treating it as a debit', () => {
  assert.throws(
    () => calculateActualBalanceMinor([syntheticEntry({ type: 'adjustment', direction: 'unknown' })]),
    (error) => error instanceof RangeError && error.message.includes('Unsupported adjustment direction'),
  )
})

test('requires a collection of entries', () => {
  assert.throws(() => calculateActualBalanceMinor(null), TypeError)
})

test('calculates income, spending, commitments, and disposable balance', () => {
  const summary = calculateLedgerSummary({
    entries: [
      { id: 'salary', type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01', status: 'active' },
      { id: 'expense', type: 'expense', amountMinor: 2000000, occurredOn: '2026-08-02', status: 'active' },
      { id: 'voided', type: 'expense', amountMinor: 500000, occurredOn: '2026-08-03', status: 'voided' },
    ],
    commitments: [
      {
        id: 'sip',
        kind: 'investment',
        name: 'SIP',
        plannedAmountMinor: 3000000,
        dueOn: '2026-08-05',
        status: 'planned',
        linkedEntryIds: [],
      },
    ],
  })

  assert.equal(summary.incomeMinor, 10000000)
  assert.equal(summary.expenseMinor, 2000000)
  assert.equal(summary.spendingMinor, 2000000)
  assert.equal(summary.actualBalanceMinor, 8000000)
  assert.equal(summary.reservedCommitmentMinor, 3000000)
  assert.equal(summary.disposableBalanceMinor, 5000000)
  assert.equal(summary.activeEntryCount, 2)
})

test('does not reserve more than the remaining commitment after linked payments', () => {
  assert.equal(
    calculateRemainingCommitmentMinor({ id: 'bill', plannedAmountMinor: 750000, linkedEntryIds: [] }, [
      {
        id: 'payment',
        type: 'expense',
        amountMinor: 1000000,
        occurredOn: '2026-08-02',
        status: 'active',
        commitmentId: 'bill',
      },
    ]),
    0,
  )
})

test('allows a negative disposable balance when commitments exceed actual cash', () => {
  const summary = calculateLedgerSummary({
    entries: [{ id: 'salary', type: 'income', amountMinor: 100000, occurredOn: '2026-08-01', status: 'active' }],
    commitments: [
      {
        id: 'large-bill',
        kind: 'bill',
        name: 'Large bill',
        plannedAmountMinor: 250000,
        dueOn: '2026-08-05',
        status: 'planned',
      },
    ],
  })

  assert.equal(summary.disposableBalanceMinor, -150000)
})
