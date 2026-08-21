import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateActualBalanceMinor } from '../../domain/calculations.mjs'
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
