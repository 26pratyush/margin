import assert from 'node:assert/strict'
import test from 'node:test'
import { calculatePlanningCycleSummary, cycleBounds } from '../../domain/planning.mjs'

const cycle = {
  id: '2026-08',
  cycleKey: '2026-08',
  startOn: '2026-08-01',
  endOn: '2026-09-01',
  expectedSalaryMinor: 10000000,
  expectedSalaryOn: '2026-08-01',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

function entry(overrides = {}) {
  return {
    id: 'entry',
    type: 'expense',
    amountMinor: 100,
    occurredOn: '2026-08-10',
    status: 'active',
    ...overrides,
  }
}

function commitment(overrides = {}) {
  return {
    id: 'commitment',
    kind: 'bill',
    name: 'Synthetic commitment',
    plannedAmountMinor: 100,
    dueOn: '2026-08-15',
    status: 'planned',
    linkedEntryIds: [],
    ...overrides,
  }
}

test('derives a normal cycle without duplicating actual salary or closing balance', () => {
  const summary = calculatePlanningCycleSummary({
    cycle,
    entries: [
      entry({ id: 'opening', type: 'income', amountMinor: 2000000, occurredOn: '2026-07-31' }),
      entry({ id: 'salary', type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01' }),
      entry({ id: 'expense', type: 'expense', amountMinor: 2500000 }),
      entry({ id: 'investment', type: 'investment', amountMinor: 1000000 }),
    ],
    commitments: [commitment({ plannedAmountMinor: 3000000, linkedEntryIds: ['investment'] })],
    evaluationOn: '2026-08-31',
  })

  assert.deepEqual(summary, {
    openingActualMinor: 2000000,
    rolloverMinor: 2000000,
    expectedSalaryMinor: 10000000,
    actualSalaryMinor: 10000000,
    salaryVarianceMinor: 0,
    salaryStatus: 'received',
    periodCreditsMinor: 10000000,
    periodDebitsMinor: 3500000,
    closingActualMinor: 8500000,
    reservedCommitmentMinor: 2000000,
    disposableBalanceMinor: 6500000,
  })
})

test('uses prior actual closing cash as rollover and does not carry disposable balance', () => {
  const summary = calculatePlanningCycleSummary({
    cycle: { ...cycle, expectedSalaryMinor: undefined, expectedSalaryOn: undefined },
    entries: [
      entry({ id: 'prior-close', type: 'income', amountMinor: 4000000, occurredOn: '2026-07-31' }),
      entry({ id: 'expense', type: 'expense', amountMinor: 1000000 }),
    ],
    commitments: [commitment({ plannedAmountMinor: 1500000 })],
    evaluationOn: '2026-08-31',
  })

  assert.equal(summary.openingActualMinor, 4000000)
  assert.equal(summary.closingActualMinor, 3000000)
  assert.equal(summary.reservedCommitmentMinor, 1500000)
  assert.equal(summary.disposableBalanceMinor, 1500000)
  assert.equal(summary.salaryStatus, 'unplanned')
})

test('keeps partial salary shortfall informational and preserves negative balances', () => {
  const partial = calculatePlanningCycleSummary({
    cycle,
    entries: [
      entry({ id: 'opening', type: 'income', amountMinor: 500000, occurredOn: '2026-07-31' }),
      entry({ id: 'salary', type: 'income', amountMinor: 6000000, occurredOn: '2026-08-01' }),
      entry({ id: 'expense', type: 'expense', amountMinor: 2000000 }),
    ],
    commitments: [commitment({ plannedAmountMinor: 3000000 })],
    evaluationOn: '2026-08-31',
  })
  assert.equal(partial.closingActualMinor, 4500000)
  assert.equal(partial.salaryVarianceMinor, -4000000)
  assert.equal(partial.salaryStatus, 'partial')
  assert.equal(partial.disposableBalanceMinor, 1500000)

  const negative = calculatePlanningCycleSummary({
    cycle: { ...cycle, expectedSalaryMinor: undefined, expectedSalaryOn: undefined },
    entries: [
      entry({
        id: 'opening-debit',
        type: 'adjustment',
        amountMinor: 1000000,
        direction: 'debit',
        occurredOn: '2026-07-31',
      }),
      entry({ id: 'salary', type: 'income', amountMinor: 5000000, occurredOn: '2026-08-01' }),
      entry({ id: 'expense', type: 'expense', amountMinor: 4500000 }),
    ],
    commitments: [commitment({ plannedAmountMinor: 1000000 })],
  })
  assert.equal(negative.closingActualMinor, -500000)
  assert.equal(negative.disposableBalanceMinor, -1500000)
})

test('does not infer missing or late salary and ignores voided records', () => {
  const missing = calculatePlanningCycleSummary({
    cycle,
    entries: [
      entry({ id: 'voided-salary', type: 'income', amountMinor: 10000000, status: 'voided' }),
      entry({ id: 'late-salary', type: 'income', amountMinor: 10000000, occurredOn: '2026-09-02' }),
    ],
    commitments: [],
    evaluationOn: '2026-09-01',
  })

  assert.equal(missing.actualSalaryMinor, 0)
  assert.equal(missing.closingActualMinor, 0)
  assert.equal(missing.salaryStatus, 'missing')
  assert.equal(missing.salaryVarianceMinor, -10000000)
})

test('supports zero balances and validates calendar-cycle boundaries', () => {
  const summary = calculatePlanningCycleSummary({
    cycle,
    entries: [],
    commitments: [],
    evaluationOn: '2026-08-15',
  })
  assert.equal(summary.closingActualMinor, 0)
  assert.equal(summary.disposableBalanceMinor, 0)
  assert.equal(summary.salaryStatus, 'expected')
  assert.deepEqual(cycleBounds('2026-12'), { startOn: '2026-12-01', endOn: '2027-01-01' })
  assert.throws(() => cycleBounds('2026-13'), RangeError)
})

test('honors cycle boundaries and only reserves active commitments due inside the cycle', () => {
  const summary = calculatePlanningCycleSummary({
    cycle,
    entries: [
      entry({ id: 'opening', type: 'income', amountMinor: 2000000, occurredOn: '2026-07-31' }),
      entry({ id: 'salary', type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01' }),
      entry({ id: 'linked-payment', amountMinor: 1000000, occurredOn: '2026-08-02' }),
      entry({ id: 'cycle-end', amountMinor: 9000000, occurredOn: '2026-09-01' }),
      entry({ id: 'voided', amountMinor: 7000000, status: 'voided' }),
    ],
    commitments: [
      commitment({
        id: 'current',
        plannedAmountMinor: 3000000,
        dueOn: '2026-08-01',
        linkedEntryIds: ['linked-payment'],
      }),
      commitment({ id: 'at-end', plannedAmountMinor: 5000000, dueOn: '2026-09-01' }),
      commitment({ id: 'cancelled', plannedAmountMinor: 4000000, status: 'cancelled' }),
      commitment({ id: 'settled', plannedAmountMinor: 2000000, status: 'settled' }),
    ],
    evaluationOn: '2026-08-31',
  })

  assert.equal(summary.openingActualMinor, 2000000)
  assert.equal(summary.periodCreditsMinor, 10000000)
  assert.equal(summary.periodDebitsMinor, 1000000)
  assert.equal(summary.closingActualMinor, 11000000)
  assert.equal(summary.reservedCommitmentMinor, 2000000)
  assert.equal(summary.disposableBalanceMinor, 9000000)
})
