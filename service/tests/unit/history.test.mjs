import assert from 'node:assert/strict'
import test from 'node:test'
import { addCivilDays, projectHistory, resolveHistoryRange } from '../../domain/history.mjs'

function entry(overrides = {}) {
  return {
    id: 'entry',
    type: 'expense',
    amountMinor: 100,
    occurredOn: '2026-08-30',
    status: 'active',
    createdAt: '2026-08-30T10:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    ...overrides,
  }
}

function snapshot(overrides = {}) {
  return {
    id: 'snapshot',
    asOf: '2026-08-30',
    calculatedActualBalanceMinor: 1000,
    realBalanceMinor: 900,
    differenceMinor: -100,
    adjustmentEntryId: 'sync-adjustment',
    ...overrides,
  }
}

test('resolves local Monday weeks, month boundaries, year rollover, and custom ranges', () => {
  assert.deepEqual(resolveHistoryRange({ period: 'this-week', referenceOn: '2026-08-30' }), {
    period: 'this-week',
    startOn: '2026-08-24',
    endOn: '2026-08-31',
  })
  assert.deepEqual(resolveHistoryRange({ period: 'this-month', referenceOn: '2026-12-15' }), {
    period: 'this-month',
    startOn: '2026-12-01',
    endOn: '2027-01-01',
  })
  assert.equal(addCivilDays('2028-02-28', 1), '2028-02-29')
  assert.equal(addCivilDays('2028-02-29', 1), '2028-03-01')
  assert.deepEqual(resolveHistoryRange({ period: 'custom', startOn: '2026-12-31', endOn: '2027-01-02' }), {
    period: 'custom',
    startOn: '2026-12-31',
    endOn: '2027-01-02',
  })
})

test('projects active and voided entries without changing the global-balance semantics', () => {
  const result = projectHistory({
    period: 'custom',
    startOn: '2026-08-29',
    endOn: '2026-09-01',
    type: 'all',
    status: 'all',
    entries: [
      entry({ id: 'voided', amountMinor: 1000, occurredOn: '2026-08-29', status: 'voided' }),
      entry({ id: 'replacement', amountMinor: 1200, occurredOn: '2026-08-29', createdAt: '2026-08-30T12:00:00.000Z' }),
      entry({ id: 'expense', amountMinor: 300, occurredOn: '2026-08-30', createdAt: '2026-08-30T11:00:00.000Z' }),
      entry({
        id: 'sync-adjustment',
        type: 'adjustment',
        amountMinor: 500,
        direction: 'debit',
        adjustmentReason: 'reconciliation',
        occurredOn: '2026-08-30',
        createdAt: '2026-08-30T13:00:00.000Z',
      }),
    ],
    balanceSnapshots: [snapshot(), snapshot({ id: 'zero-sync', differenceMinor: 0, adjustmentEntryId: undefined })],
  })

  assert.equal(result.items.filter((item) => item.kind === 'balance-sync').length, 2)
  assert.equal(result.items.filter((item) => item.kind === 'entry' && item.entry.id === 'sync-adjustment').length, 0)
  assert.equal(result.summary.visibleCount, 5)
  assert.equal(result.summary.activeCount, 3)
  assert.equal(result.summary.voidedCount, 1)
  assert.equal(result.summary.syncCount, 2)
  assert.equal(result.summary.creditsMinor, 0)
  assert.equal(result.summary.debitsMinor, 2000)
  assert.equal(result.summary.netMovementMinor, -2000)
})

test('filters balance-sync events and preserves zero-difference syncs without fabricating movement', () => {
  const result = projectHistory({
    period: 'this-month',
    type: 'balance-sync',
    status: 'active',
    referenceOn: '2026-08-30',
    entries: [
      entry({
        id: 'sync-adjustment',
        type: 'adjustment',
        amountMinor: 250,
        direction: 'credit',
        adjustmentReason: 'reconciliation',
      }),
      entry({ id: 'ordinary-expense', amountMinor: 1000 }),
    ],
    balanceSnapshots: [
      snapshot({ differenceMinor: 250 }),
      snapshot({ id: 'zero-sync', differenceMinor: 0, adjustmentEntryId: undefined }),
    ],
  })

  assert.equal(result.items.length, 2)
  assert.equal(result.summary.visibleCount, 2)
  assert.equal(result.summary.activeCount, 1)
  assert.equal(result.summary.syncCount, 2)
  assert.equal(result.summary.creditsMinor, 250)
  assert.equal(result.summary.debitsMinor, 0)
})

test('defaults to the current month and active records and rejects invalid filters', () => {
  const result = projectHistory({
    referenceOn: '2026-08-30',
    entries: [
      entry({ id: 'active', occurredOn: '2026-08-01' }),
      entry({ id: 'voided', occurredOn: '2026-08-02', status: 'voided' }),
      entry({ id: 'outside', occurredOn: '2026-07-31' }),
    ],
  })

  assert.deepEqual(result.range, { period: 'this-month', startOn: '2026-08-01', endOn: '2026-09-01' })
  assert.deepEqual(
    result.items.map((item) => item.entry.id),
    ['active'],
  )
  assert.throws(() => projectHistory({ period: 'custom', startOn: '2026-08-20', endOn: '2026-08-20', entries: [] }), {
    name: 'RangeError',
  })
  assert.throws(() => projectHistory({ type: 'unknown', entries: [] }), { name: 'RangeError' })
})
