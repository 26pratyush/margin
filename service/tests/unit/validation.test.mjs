import assert from 'node:assert/strict'
import test from 'node:test'
import { ValidationError, validateRecord, validateTransactionInput } from '../../validation.mjs'
import { syntheticDataset, syntheticEntry } from '../fixtures/synthetic.mjs'

test('accepts valid synthetic records and preserves extension fields', () => {
  const dataset = syntheticDataset({
    entries: [syntheticEntry({ categoryId: 'food', customSource: 'fixture' })],
    categories: [{ id: 'food', name: 'Food' }],
  })

  assert.equal(dataset.entries[0].customSource, 'fixture')
})

test('rejects invalid amounts, dates, and adjustment directions', () => {
  assert.throws(
    () => validateRecord('entries', syntheticEntry({ amountMinor: 0, occurredOn: '2026-02-30' })),
    (error) => error instanceof ValidationError && error.details.length >= 2,
  )
  assert.throws(
    () => validateRecord('entries', syntheticEntry({ type: 'adjustment' })),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('direction')),
  )
})

test('rejects duplicate ids and missing cross-record references', () => {
  const duplicate = syntheticEntry({ id: 'duplicate' })
  assert.throws(
    () => syntheticDataset({ entries: [duplicate, { ...duplicate }] }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('duplicate id')),
  )

  assert.throws(
    () => syntheticDataset({ entries: [syntheticEntry({ categoryId: 'missing-category' })] }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('categoryId')),
  )
})

test('rejects a snapshot that references a missing adjustment entry', () => {
  assert.throws(
    () =>
      syntheticDataset({
        balanceSnapshots: [
          {
            id: 'snapshot',
            asOf: '2026-08-20',
            calculatedActualBalanceMinor: 100,
            realBalanceMinor: 90,
            differenceMinor: -10,
            adjustmentEntryId: 'missing-adjustment',
          },
        ],
      }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('adjustmentEntryId')),
  )
})

test('validates and normalizes first-slice salary and expense commands', () => {
  assert.deepEqual(
    validateTransactionInput({
      type: 'expense',
      amountMinor: 125000,
      occurredOn: '2026-08-21',
      categoryName: '  Food  ',
      note: 'Lunch',
    }),
    {
      type: 'expense',
      amountMinor: 125000,
      occurredOn: '2026-08-21',
      categoryName: 'Food',
      note: 'Lunch',
      source: undefined,
    },
  )
  assert.deepEqual(validateTransactionInput({ type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01' }), {
    type: 'income',
    amountMinor: 10000000,
    occurredOn: '2026-08-01',
    categoryName: undefined,
    note: undefined,
    source: undefined,
  })
})

test('rejects invalid first-slice transaction commands', () => {
  assert.throws(
    () => validateTransactionInput({ type: 'expense', amountMinor: 0, occurredOn: '2026-02-30' }),
    (error) => error instanceof ValidationError && error.details.length >= 3,
  )
  assert.throws(
    () =>
      validateTransactionInput({ type: 'income', amountMinor: 100, occurredOn: '2026-08-01', categoryName: 'Salary' }),
    (error) =>
      error instanceof ValidationError && error.details.includes('categoryName is only supported for expenses'),
  )
})
