import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ValidationError,
  validatePlanningCycleInput,
  validatePlanningCyclePatch,
  validateRecord,
  validateTransactionInput,
} from '../../validation.mjs'
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

test('validates planning cycle identity, salary inputs, and writable fields', () => {
  assert.deepEqual(
    validatePlanningCycleInput({ cycleKey: '2026-08', expectedSalaryMinor: 10000000, expectedSalaryOn: '2026-08-01' }),
    { cycleKey: '2026-08', expectedSalaryMinor: 10000000, expectedSalaryOn: '2026-08-01' },
  )
  assert.deepEqual(validatePlanningCyclePatch({ expectedSalaryMinor: 12000000 }), {
    expectedSalaryMinor: 12000000,
  })
  assert.deepEqual(validatePlanningCyclePatch({ expectedSalaryOn: '2026-08-15' }), {
    expectedSalaryOn: '2026-08-15',
  })
})

test('rejects invalid planning cycle dates, amounts, references, and transitions', () => {
  assert.throws(
    () => validatePlanningCycleInput({ cycleKey: '2026-02', expectedSalaryMinor: 0 }),
    (error) =>
      error instanceof ValidationError && error.details.some((detail) => detail.includes('expectedSalaryMinor')),
  )
  assert.throws(
    () => validatePlanningCycleInput({ cycleKey: '2026-08', expectedSalaryMinor: 100, expectedSalaryOn: '2026-09-01' }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('within the cycle')),
  )
  assert.throws(
    () => validatePlanningCycleInput({ cycleKey: '2026-08', startOn: '2026-08-01' }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('not writable')),
  )
  assert.throws(
    () => validatePlanningCyclePatch({ cycleKey: '2026-09' }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('not writable')),
  )
  assert.throws(
    () =>
      validateRecord('planningCycles', {
        id: 'wrong-id',
        cycleKey: '2026-08',
        startOn: '2026-08-01',
        endOn: '2026-09-01',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }),
    (error) =>
      error instanceof ValidationError && error.details.some((detail) => detail.includes('must match cycleKey')),
  )
  assert.doesNotThrow(() =>
    validateRecord('planningCycles', {
      id: '2026-08',
      cycleKey: '2026-08',
      startOn: '2026-08-01',
      endOn: '2026-09-01',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    }),
  )
  assert.throws(
    () =>
      validateRecord('planningCycles', {
        id: '2026-08',
        cycleKey: '2026-08',
        startOn: '2026-08-01',
        endOn: '2026-09-01',
        createdAt: '2026-02-30T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      }),
    (error) =>
      error instanceof ValidationError && error.details.some((detail) => detail.includes('calendar timestamp')),
  )
})
