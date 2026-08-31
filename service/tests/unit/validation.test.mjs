import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ValidationError,
  validatePlanningCycleInput,
  validatePlanningCyclePatch,
  validateEntryCorrectionInput,
  validateEntryCorrectionPatch,
  validateEntryVoidInput,
  validateReconciliationInput,
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
      direction: 'debit',
      name: '  Lunch  ',
      categoryName: '  Food  ',
      note: 'Lunch',
    }),
    {
      type: 'expense',
      amountMinor: 125000,
      occurredOn: '2026-08-21',
      direction: 'debit',
      name: 'Lunch',
      categoryName: 'Food',
      note: 'Lunch',
      source: undefined,
    },
  )
  assert.deepEqual(validateTransactionInput({ type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01' }), {
    type: 'income',
    amountMinor: 10000000,
    occurredOn: '2026-08-01',
    name: undefined,
    categoryName: undefined,
    note: undefined,
    source: undefined,
  })
  assert.deepEqual(
    validateTransactionInput({
      type: 'expense',
      amountMinor: 2400,
      occurredOn: '2026-08-21',
      direction: 'debit',
      name: '   ',
      categoryName: '  ',
      note: '  ',
    }),
    {
      type: 'expense',
      amountMinor: 2400,
      occurredOn: '2026-08-21',
      direction: 'debit',
      name: undefined,
      categoryName: undefined,
      note: undefined,
      source: undefined,
    },
  )
})

test('rejects invalid first-slice transaction commands', () => {
  assert.throws(
    () => validateTransactionInput({ type: 'expense', amountMinor: 0, occurredOn: '2026-02-30' }),
    (error) => error instanceof ValidationError && error.details.length >= 2,
  )
  assert.throws(
    () =>
      validateTransactionInput({ type: 'income', amountMinor: 100, occurredOn: '2026-08-01', categoryName: 'Salary' }),
    (error) =>
      error instanceof ValidationError && error.details.includes('categoryName is only supported for expenses'),
  )
  assert.throws(
    () => validateTransactionInput({ type: 'income', amountMinor: 100, occurredOn: '2026-08-01', name: 'Salary' }),
    (error) => error instanceof ValidationError && error.details.includes('name is only supported for expenses'),
  )
  assert.throws(
    () =>
      validateTransactionInput({ type: 'expense', amountMinor: 100, occurredOn: '2026-08-01', direction: 'sideways' }),
    (error) =>
      error instanceof ValidationError && error.details.includes('direction must be credit or debit for an expense'),
  )
  assert.throws(
    () => validateTransactionInput({ type: 'income', amountMinor: 100, occurredOn: '2026-08-01', direction: 'credit' }),
    (error) => error instanceof ValidationError && error.details.includes('direction is only supported for expenses'),
  )
})

test('validates signed reconciliation inputs without changing the amount meaning', () => {
  assert.deepEqual(
    validateReconciliationInput({ asOf: '2026-08-31', realBalanceMinor: -1250, note: '  Overdraft  ' }),
    { asOf: '2026-08-31', realBalanceMinor: -1250, note: 'Overdraft' },
  )
  assert.deepEqual(validateReconciliationInput({ asOf: '2026-08-31', realBalanceMinor: 0 }), {
    asOf: '2026-08-31',
    realBalanceMinor: 0,
  })
  assert.throws(
    () => validateReconciliationInput({ asOf: '2026-02-30', realBalanceMinor: 100, extra: true }),
    (error) => error instanceof ValidationError && error.details.length === 2,
  )
})

test('validates correction and void commands with explicit nullable patches', () => {
  assert.deepEqual(
    validateEntryCorrectionInput({
      operationId: ' correction-1 ',
      expectedUpdatedAt: '2026-08-20T10:00:00.000Z',
      patch: { amountMinor: 80, name: '  Groceries  ', categoryId: null, note: null },
    }),
    {
      operationId: 'correction-1',
      expectedUpdatedAt: '2026-08-20T10:00:00.000Z',
      patch: { amountMinor: 80, name: 'Groceries', categoryId: null, note: null },
    },
  )
  assert.deepEqual(
    validateEntryVoidInput({
      operationId: ' void-1 ',
      expectedUpdatedAt: '2026-08-20T10:00:00.000Z',
      reason: '  Duplicate  ',
    }),
    {
      operationId: 'void-1',
      expectedUpdatedAt: '2026-08-20T10:00:00.000Z',
      reason: 'Duplicate',
    },
  )
})

test('rejects unsafe correction fields and type-specific edits', () => {
  assert.throws(
    () =>
      validateEntryCorrectionInput({
        operationId: 'correction-1',
        expectedUpdatedAt: '2026-08-20T10:00:00.000Z',
        patch: { amountMinor: 0, type: 'expense' },
      }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('not writable')),
  )
  assert.throws(
    () => validateEntryCorrectionPatch({ id: 'salary', type: 'income' }, { name: 'New name', categoryId: 'food' }),
    (error) => error instanceof ValidationError && error.details.length === 2,
  )
  assert.throws(
    () =>
      validateEntryVoidInput({
        operationId: 'void-1',
        expectedUpdatedAt: '2026-08-20T10:00:00.000Z',
        reason: 'duplicate',
        status: 'voided',
      }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('not writable')),
  )
})

test('validates replacement lineage and snapshot review state', () => {
  const source = syntheticEntry({ id: 'source', status: 'voided', replacedById: 'replacement', operationId: 'op-1' })
  const replacement = syntheticEntry({
    id: 'replacement',
    status: 'active',
    replacesId: 'source',
    operationId: 'op-1',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  })
  const dataset = syntheticDataset({
    entries: [source, replacement],
    balanceSnapshots: [
      {
        id: 'snapshot',
        asOf: '2026-08-31',
        calculatedActualBalanceMinor: 100,
        realBalanceMinor: 100,
        differenceMinor: 0,
        reviewState: 'needs-review',
      },
    ],
  })
  assert.equal(dataset.entries[1].replacesId, 'source')
  assert.equal(dataset.balanceSnapshots[0].reviewState, 'needs-review')
  assert.throws(
    () => syntheticDataset({ entries: [source, { ...replacement, replacesId: 'missing' }] }),
    (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('replacesId')),
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
