import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSyntheticDemoHistory,
  getSyntheticDemoPlanning,
  getSyntheticDemoWorkspace,
  SYNTHETIC_DEMO_REFERENCE_ON,
} from '../../domain/demo.mjs'

test('builds a deterministic mid-month synthetic workspace without shared mutable state', () => {
  const first = getSyntheticDemoWorkspace()
  first.dataset.entries[0].note = 'Mutated test value'
  const second = getSyntheticDemoWorkspace()

  assert.equal(first.mode, 'synthetic')
  assert.equal(first.referenceOn, SYNTHETIC_DEMO_REFERENCE_ON)
  assert.equal(first.referenceOn, '2026-08-15')
  assert.equal(first.dataset.entries.length, 3)
  assert.equal(first.dataset.commitments[0].dueOn, '2026-08-31')
  assert.equal(first.summary.actualBalanceMinor, 8875000)
  assert.equal(first.summary.reservedCommitmentMinor, 3000000)
  assert.equal(first.summary.disposableBalanceMinor, 5875000)
  assert.equal(second.dataset.entries[0].note, 'Synthetic data only')
})

test('projects the synthetic month and planning cycle against the fixed reference date', () => {
  const history = getSyntheticDemoHistory()
  const planning = getSyntheticDemoPlanning('2026-08')

  assert.equal(history.range.startOn, '2026-08-01')
  assert.equal(history.range.endOn, '2026-09-01')
  assert.equal(history.items.length, 3)
  assert.equal(history.summary.creditsMinor, 10000000)
  assert.equal(history.summary.debitsMinor, 1125000)
  assert.equal(planning.cycle?.cycleKey, '2026-08')
  assert.equal(planning.summary.actualSalaryMinor, 10000000)
  assert.equal(planning.summary.periodDebitsMinor, 1125000)
  assert.equal(planning.summary.reservedCommitmentMinor, 3000000)
  assert.equal(planning.summary.disposableBalanceMinor, 5875000)
})

test('rejects invalid synthetic history filters through the validation boundary', () => {
  assert.throws(
    () => getSyntheticDemoHistory({ period: 'custom', startOn: '2026-08-20', endOn: '2026-08-20' }),
    (error) => error.name === 'ValidationError' && error.message === 'Invalid demo history filters',
  )
})
