import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { BackupError } from '../../backup.mjs'
import { openStorage } from '../../storage.mjs'
import { ConflictError, ValidationError, createSyntheticDataset } from '../../validation.mjs'

async function withStorage(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-test-'))
  const storage = await openStorage({ dataDirectory: directory })
  try {
    await callback(storage)
  } finally {
    storage.close()
    await rm(directory, { recursive: true, force: true })
  }
}

test('uses a platform-specific default directory without changing the database contract', () => {
  assert.match(path.basename(path.dirname('/Users/example/Library/Application Support/Margin/margin.sqlite')), /Margin/)
})

test('persists synthetic records after closing and reopening the service', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-restart-'))
  const first = await openStorage({ dataDirectory: directory })
  first.replaceDataset(createSyntheticDataset())
  first.close()

  const second = await openStorage({ dataDirectory: directory })
  try {
    const dataset = second.getDataset()
    assert.equal(dataset.entries.length, 2)
    assert.equal(dataset.commitments.length, 1)
  } finally {
    second.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('creates salary and expense records atomically and reuses expense categories', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-entry-command-'))
  const first = await openStorage({ dataDirectory: directory })
  try {
    const salary = first.createTransaction({
      type: 'income',
      amountMinor: 10000000,
      occurredOn: '2026-08-01',
      source: 'Salary',
    })
    const firstExpense = first.createTransaction({
      type: 'expense',
      amountMinor: 125000,
      occurredOn: '2026-08-02',
      name: 'Lunch',
      categoryName: 'Food',
    })
    const secondExpense = first.createTransaction({
      type: 'expense',
      amountMinor: 50000,
      occurredOn: '2026-08-03',
      name: 'Coffee',
      categoryName: ' food ',
    })

    assert.equal(salary.entry.type, 'income')
    assert.equal(firstExpense.entry.name, 'Lunch')
    assert.equal(firstExpense.entry.categoryId, secondExpense.entry.categoryId)
    assert.equal(first.getDataset().entries.length, 3)
    assert.equal(first.getDataset().categories.length, 1)
    assert.equal(first.getSummary().disposableBalanceMinor, 9825000)
  } finally {
    first.close()
  }

  const second = await openStorage({ dataDirectory: directory })
  try {
    assert.equal(second.getDataset().entries.length, 3)
    assert.equal(second.getSummary().expenseMinor, 175000)
  } finally {
    second.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('saves amount-only expenses without creating blank categories', async () => {
  await withStorage(async (storage) => {
    const result = storage.createTransaction({
      type: 'expense',
      amountMinor: 2400,
      occurredOn: '2026-08-21',
      name: '  ',
      categoryName: '  ',
      note: '  ',
    })

    assert.equal(result.category, null)
    assert.equal(result.entry.amountMinor, 2400)
    assert.equal(result.entry.type, 'expense')
    assert.equal(result.entry.direction, 'debit')
    assert.equal('name' in result.entry, false)
    assert.equal('categoryId' in result.entry, false)
    assert.equal('note' in result.entry, false)
    assert.equal(storage.getDataset().categories.length, 0)
    assert.equal(storage.getSummary().expenseMinor, 2400)

    const backup = storage.exportBackup()
    assert.equal('name' in backup.data.entries[0], false)
    assert.equal('categoryId' in backup.data.entries[0], false)
    const restored = await storage.restoreBackup(backup)
    assert.equal(restored.dataset.entries.length, 1)
    assert.equal(restored.dataset.entries[0].direction, 'debit')
    assert.equal('name' in restored.dataset.entries[0], false)
    assert.equal('categoryId' in restored.dataset.entries[0], false)
    assert.equal(restored.dataset.categories.length, 0)
  })
})

test('corrects an active expense with void-and-replace semantics across planning cycles', async () => {
  await withStorage(async (storage) => {
    storage.createTransaction({
      type: 'income',
      amountMinor: 10000000,
      occurredOn: '2026-08-01',
      source: 'Salary',
    })
    const created = storage.createTransaction({
      type: 'expense',
      amountMinor: 100000,
      occurredOn: '2026-08-31',
      name: 'Groceries',
      categoryName: 'Living',
    })
    storage.createPlanningCycle({ cycleKey: '2026-08', expectedSalaryMinor: 10000000 })
    storage.createPlanningCycle({ cycleKey: '2026-09' })

    const result = storage.correctEntry(created.entry.id, {
      operationId: 'correction-expense-1',
      expectedUpdatedAt: created.entry.updatedAt,
      patch: { amountMinor: 80000, occurredOn: '2026-09-01', note: 'Corrected synthetic amount' },
    })

    assert.equal(result.original.id, created.entry.id)
    assert.equal(result.original.status, 'voided')
    assert.equal(result.original.amountMinor, 100000)
    assert.equal(result.replacement.status, 'active')
    assert.equal(result.replacement.type, 'expense')
    assert.equal(result.replacement.amountMinor, 80000)
    assert.equal(result.replacement.replacesId, created.entry.id)
    assert.equal(result.replacement.categoryId, created.entry.categoryId)
    assert.equal(storage.getDataset().entries.length, 3)
    assert.equal(storage.getSummary().expenseMinor, 80000)
    assert.equal(storage.getSummary().actualBalanceMinor, 9920000)
    assert.equal(
      storage.getPlanningCycleSummary('2026-08', { evaluationOn: '2026-08-31' }).summary.periodDebitsMinor,
      0,
    )
    assert.equal(
      storage.getPlanningCycleSummary('2026-09', { evaluationOn: '2026-09-30' }).summary.periodDebitsMinor,
      80000,
    )
  })
})

test('voids entries, marks reconciliation review, and makes repeated voids idempotent', async () => {
  await withStorage(async (storage) => {
    const created = storage.createTransaction({
      type: 'income',
      amountMinor: 10000000,
      occurredOn: '2026-08-01',
      source: 'Salary',
    })
    storage.reconcile({ asOf: '2026-08-31', realBalanceMinor: 10000000, note: 'Synthetic check' })

    const result = storage.voidEntry(created.entry.id, {
      operationId: 'void-income-1',
      expectedUpdatedAt: created.entry.updatedAt,
      reason: 'Duplicate synthetic entry',
    })
    assert.equal(result.entry.status, 'voided')
    assert.equal(result.entry.voidReason, 'Duplicate synthetic entry')
    assert.equal(result.dataset.entries.length, 1)
    assert.equal(result.dataset.balanceSnapshots[0].reviewState, 'needs-review')
    assert.equal(result.summary.actualBalanceMinor, 0)

    const replay = storage.voidEntry(created.entry.id, {
      operationId: 'void-income-1',
      expectedUpdatedAt: created.entry.updatedAt,
      reason: 'Duplicate synthetic entry',
    })
    assert.deepEqual(replay.entry, result.entry)
    assert.equal(storage.getDataset().entries.length, 1)
    const restored = await storage.restoreBackup(storage.exportBackup())
    assert.equal(restored.dataset.entries[0].status, 'voided')
    assert.equal(restored.dataset.balanceSnapshots[0].reviewState, 'needs-review')
    assert.equal(restored.summary.counts.entries, 1)
    assert.throws(
      () =>
        storage.voidEntry(created.entry.id, {
          operationId: 'void-income-2',
          expectedUpdatedAt: result.entry.updatedAt,
          reason: 'Another reason',
        }),
      (error) => error instanceof ConflictError && error.code === 'TERMINAL_ENTRY',
    )
  })
})

test('rejects stale corrections and prevents duplicate or conflicting operation ids', async () => {
  await withStorage(async (storage) => {
    const created = storage.createTransaction({
      type: 'expense',
      amountMinor: 100000,
      occurredOn: '2026-08-20',
      name: 'Lunch',
      categoryName: 'Food',
    })
    const command = {
      operationId: 'correction-idempotent-1',
      expectedUpdatedAt: created.entry.updatedAt,
      patch: { amountMinor: 80000 },
    }
    const result = storage.correctEntry(created.entry.id, command)
    const replay = storage.correctEntry(created.entry.id, command)
    assert.equal(replay.replacement.id, result.replacement.id)
    assert.equal(storage.getDataset().entries.length, 2)

    const other = storage.createTransaction({
      type: 'income',
      amountMinor: 500000,
      occurredOn: '2026-08-21',
    })
    assert.throws(
      () =>
        storage.correctEntry(other.entry.id, {
          ...command,
          expectedUpdatedAt: other.entry.updatedAt,
        }),
      (error) => error instanceof ConflictError && error.code === 'IDEMPOTENCY_CONFLICT',
    )

    assert.throws(
      () =>
        storage.correctEntry(created.entry.id, {
          ...command,
          patch: { amountMinor: 70000 },
        }),
      (error) => error instanceof ConflictError && error.code === 'IDEMPOTENCY_CONFLICT',
    )
    assert.throws(
      () =>
        storage.correctEntry(result.replacement.id, {
          operationId: 'correction-idempotent-2',
          expectedUpdatedAt: created.entry.updatedAt,
          patch: { amountMinor: 70000 },
        }),
      (error) => error instanceof ConflictError && error.code === 'STALE_ENTRY',
    )

    const next = storage.correctEntry(result.replacement.id, {
      operationId: 'correction-idempotent-2',
      expectedUpdatedAt: result.replacement.updatedAt,
      patch: { amountMinor: 70000 },
    })
    const firstOperationReplay = storage.correctEntry(created.entry.id, command)
    assert.equal(firstOperationReplay.replacement.id, result.replacement.id)
    assert.equal(firstOperationReplay.replacement.status, 'voided')
    assert.equal(next.replacement.amountMinor, 70000)
  })
})

test('applies the editable-field matrix and rejects invalid category changes without writing', async () => {
  await withStorage(async (storage) => {
    const income = storage.createTransaction({
      type: 'income',
      amountMinor: 10000000,
      occurredOn: '2026-08-01',
      source: 'Original salary',
      note: 'Original note',
    })
    const correctedIncome = storage.correctEntry(income.entry.id, {
      operationId: 'correction-income-fields-1',
      expectedUpdatedAt: income.entry.updatedAt,
      patch: { source: 'Corrected salary', note: null },
    })
    assert.equal(correctedIncome.replacement.source, 'Corrected salary')
    assert.equal('note' in correctedIncome.replacement, false)
    assert.equal('name' in correctedIncome.replacement, false)

    const expense = storage.createTransaction({
      type: 'expense',
      amountMinor: 100000,
      occurredOn: '2026-08-02',
      name: 'Lunch',
      categoryName: 'Food',
      source: 'Receipt',
    })
    const beforeInvalidCategory = storage.getDataset()
    assert.throws(
      () =>
        storage.correctEntry(expense.entry.id, {
          operationId: 'correction-expense-category-invalid',
          expectedUpdatedAt: expense.entry.updatedAt,
          patch: { categoryId: 'missing-category' },
        }),
      (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('categoryId')),
    )
    assert.deepEqual(storage.getDataset().entries, beforeInvalidCategory.entries)
    assert.throws(
      () =>
        storage.correctEntry(expense.entry.id, {
          operationId: 'correction-expense-source-invalid',
          expectedUpdatedAt: expense.entry.updatedAt,
          patch: { source: 'Must remain protected' },
        }),
      (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('source')),
    )
    const correctedExpense = storage.correctEntry(expense.entry.id, {
      operationId: 'correction-expense-fields-1',
      expectedUpdatedAt: expense.entry.updatedAt,
      patch: { name: null, categoryId: null },
    })
    assert.equal('name' in correctedExpense.replacement, false)
    assert.equal('categoryId' in correctedExpense.replacement, false)
    assert.equal(correctedExpense.replacement.source, 'Receipt')
  })
})

test('keeps correction lineage and active calculations consistent after restart', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-correction-restart-'))
  const first = await openStorage({ dataDirectory: directory })
  const created = first.createTransaction({
    type: 'expense',
    amountMinor: 100000,
    occurredOn: '2026-08-20',
    name: 'Lunch',
    categoryName: 'Food',
  })
  const corrected = first.correctEntry(created.entry.id, {
    operationId: 'correction-restart-1',
    expectedUpdatedAt: created.entry.updatedAt,
    patch: { amountMinor: 80000 },
  })
  first.close()

  const second = await openStorage({ dataDirectory: directory })
  try {
    const dataset = second.getDataset()
    const original = dataset.entries.find((entry) => entry.id === created.entry.id)
    const replacement = dataset.entries.find((entry) => entry.id === corrected.replacement.id)
    assert.equal(original.status, 'voided')
    assert.equal(replacement.status, 'active')
    assert.equal(replacement.replacesId, original.id)
    assert.equal(second.getSummary().expenseMinor, 80000)
  } finally {
    second.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('preserves zero and negative derived balances while correcting active entries', async () => {
  await withStorage(async (storage) => {
    storage.createTransaction({ type: 'income', amountMinor: 100, occurredOn: '2026-08-01' })
    const expense = storage.createTransaction({
      type: 'expense',
      amountMinor: 200,
      occurredOn: '2026-08-02',
      name: 'Synthetic overspend',
      categoryName: 'Living',
    })
    assert.equal(storage.getSummary().actualBalanceMinor, -100)

    const corrected = storage.correctEntry(expense.entry.id, {
      operationId: 'correction-zero-balance-1',
      expectedUpdatedAt: expense.entry.updatedAt,
      patch: { amountMinor: 100 },
    })
    assert.equal(storage.getSummary().actualBalanceMinor, 0)

    storage.voidEntry(corrected.replacement.id, {
      operationId: 'void-zero-balance-1',
      expectedUpdatedAt: corrected.replacement.updatedAt,
      reason: 'Remove synthetic overspend',
    })
    assert.equal(storage.getSummary().actualBalanceMinor, 100)
  })
})

test('updates commitment links during correction and blocks unsafe dependent changes', async () => {
  await withStorage(async (storage) => {
    storage.createRecord('commitments', {
      id: 'rent',
      kind: 'bill',
      name: 'Synthetic rent',
      plannedAmountMinor: 300000,
      dueOn: '2026-08-05',
      status: 'planned',
      linkedEntryIds: ['payment-1'],
    })
    const payment = storage.createRecord('entries', {
      id: 'payment-1',
      type: 'expense',
      amountMinor: 100000,
      occurredOn: '2026-08-05',
      status: 'active',
      name: 'Rent payment',
      commitmentId: 'rent',
    })
    const corrected = storage.correctEntry(payment.id, {
      operationId: 'correction-commitment-1',
      expectedUpdatedAt: payment.updatedAt,
      patch: { amountMinor: 120000 },
    })
    const commitment = storage.getRecord('commitments', 'rent')

    assert.equal(corrected.replacement.commitmentId, 'rent')
    assert.deepEqual(commitment.linkedEntryIds, [corrected.replacement.id])
    assert.equal(storage.getSummary().reservedCommitmentMinor, 180000)
    assert.throws(
      () =>
        storage.voidEntry(corrected.replacement.id, {
          operationId: 'void-linked-payment-1',
          expectedUpdatedAt: corrected.replacement.updatedAt,
          reason: 'Unsafe linked void',
        }),
      (error) => error instanceof ConflictError && error.code === 'DEPENDENCY_CONFLICT',
    )
  })
})

test('blocks correction when an active refund depends on the entry and rejects generic entry mutation', async () => {
  await withStorage(async (storage) => {
    const payment = storage.createTransaction({
      type: 'expense',
      amountMinor: 100000,
      occurredOn: '2026-08-05',
      name: 'Purchase',
      categoryName: 'Living',
    })
    storage.createRecord('entries', {
      id: 'refund-1',
      type: 'refund',
      amountMinor: 20000,
      occurredOn: '2026-08-10',
      status: 'active',
      refundOfId: payment.entry.id,
    })

    assert.throws(
      () =>
        storage.correctEntry(payment.entry.id, {
          operationId: 'correction-refund-1',
          expectedUpdatedAt: payment.entry.updatedAt,
          patch: { amountMinor: 90000 },
        }),
      (error) => error instanceof ConflictError && error.code === 'DEPENDENCY_CONFLICT',
    )
    assert.throws(
      () => storage.updateRecord('entries', payment.entry.id, payment.entry),
      (error) => error instanceof ConflictError && error.code === 'ENTRY_MUTATION_REQUIRES_COMMAND',
    )
    assert.throws(
      () => storage.deleteRecord('entries', payment.entry.id),
      (error) => error instanceof ConflictError && error.code === 'ENTRY_MUTATION_REQUIRES_COMMAND',
    )
  })
})

test('rejects unsupported entry types and preserves correction lineage through backup restore', async () => {
  await withStorage(async (storage) => {
    const investment = storage.createRecord('entries', {
      id: 'investment-1',
      type: 'investment',
      amountMinor: 100000,
      occurredOn: '2026-08-05',
      status: 'active',
    })
    assert.throws(
      () =>
        storage.correctEntry(investment.id, {
          operationId: 'correction-investment-1',
          expectedUpdatedAt: investment.updatedAt,
          patch: { amountMinor: 90000 },
        }),
      (error) => error instanceof ConflictError && error.code === 'UNSUPPORTED_ENTRY_TYPE',
    )

    const expense = storage.createTransaction({
      type: 'expense',
      amountMinor: 100000,
      occurredOn: '2026-08-20',
      name: 'Lunch',
      categoryName: 'Food',
    })
    const corrected = storage.correctEntry(expense.entry.id, {
      operationId: 'correction-backup-1',
      expectedUpdatedAt: expense.entry.updatedAt,
      patch: { amountMinor: 80000, note: 'Preserve this correction' },
    })
    const backup = storage.exportBackup()
    const restored = await storage.restoreBackup(backup)

    const original = restored.dataset.entries.find((entry) => entry.id === expense.entry.id)
    const replacement = restored.dataset.entries.find((entry) => entry.id === corrected.replacement.id)
    assert.equal(original.status, 'voided')
    assert.equal(original.replacedById, replacement.id)
    assert.equal(replacement.status, 'active')
    assert.equal(replacement.replacesId, original.id)
    assert.equal(replacement.note, 'Preserve this correction')
  })
})

test('persists a planning cycle and derives its summary from actual ledger facts', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-planning-restart-'))
  const first = await openStorage({ dataDirectory: directory })
  first.createTransaction({
    type: 'income',
    amountMinor: 10000000,
    occurredOn: '2026-08-01',
    source: 'Synthetic salary',
  })
  first.createTransaction({
    type: 'expense',
    amountMinor: 2000000,
    occurredOn: '2026-08-02',
    name: 'Groceries',
    categoryName: 'Living',
  })
  first.createRecord('commitments', {
    id: 'rent',
    kind: 'bill',
    name: 'Synthetic rent',
    plannedAmountMinor: 3000000,
    dueOn: '2026-08-05',
    status: 'planned',
    linkedEntryIds: [],
  })

  const created = first.createPlanningCycle({
    cycleKey: '2026-08',
    expectedSalaryMinor: 10000000,
    expectedSalaryOn: '2026-08-01',
  })
  assert.equal(created.cycle.id, '2026-08')
  assert.equal(created.summary.actualSalaryMinor, 10000000)
  assert.equal(created.summary.closingActualMinor, 8000000)
  assert.equal(created.summary.disposableBalanceMinor, 5000000)
  first.close()

  const second = await openStorage({ dataDirectory: directory })
  try {
    const result = second.getPlanningCycleSummary('2026-08', { evaluationOn: '2026-08-31' })
    assert.equal(result.cycle.expectedSalaryMinor, 10000000)
    assert.equal(result.summary.reservedCommitmentMinor, 3000000)

    const dateUpdated = second.updatePlanningCycle('2026-08', { expectedSalaryOn: '2026-08-15' })
    assert.equal(dateUpdated.cycle.expectedSalaryOn, '2026-08-15')

    const updated = second.updatePlanningCycle('2026-08', { expectedSalaryMinor: 12000000 })
    assert.equal(updated.cycle.expectedSalaryMinor, 12000000)
    assert.equal(updated.summary.salaryVarianceMinor, -2000000)

    assert.throws(
      () => second.createPlanningCycle({ cycleKey: '2026-08' }),
      (error) => error instanceof ConflictError,
    )
    assert.throws(
      () => second.updateRecord('planningCycles', '2026-08', { ...updated.cycle, cycleKey: '2026-09' }),
      (error) => error instanceof ValidationError && error.message.includes('identity cannot change'),
    )
    assert.throws(
      () => second.updateRecord('planningCycles', '2026-08', []),
      (error) => error instanceof ValidationError,
    )
  } finally {
    second.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('applies reconciliation adjustments to planning without changing reservation semantics', async () => {
  await withStorage(async (storage) => {
    storage.createPlanningCycle({
      cycleKey: '2026-08',
      expectedSalaryMinor: 10000000,
      expectedSalaryOn: '2026-08-01',
    })
    storage.createRecord('commitments', {
      id: 'planned-saving',
      kind: 'saving',
      name: 'Synthetic reserve',
      plannedAmountMinor: 300000,
      dueOn: '2026-08-05',
      status: 'planned',
      linkedEntryIds: [],
    })

    const reconciliation = storage.reconcile({
      asOf: '2026-08-02',
      realBalanceMinor: 500000,
      note: 'Synthetic reconciliation',
    })
    const planning = storage.getPlanningCycleSummary('2026-08', { evaluationOn: '2026-08-31' })

    assert.equal(reconciliation.adjustment.direction, 'credit')
    assert.equal(planning.summary.periodCreditsMinor, 500000)
    assert.equal(planning.summary.closingActualMinor, 500000)
    assert.equal(planning.summary.reservedCommitmentMinor, 300000)
    assert.equal(planning.summary.disposableBalanceMinor, 200000)

    const reset = storage.reset()
    assert.equal(reset.planningCycles.length, 0)
    assert.equal(reset.balanceSnapshots.length, 0)
  })
})

test('migrates an existing v1 SQLite database without losing records', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-migration-'))
  const databasePath = path.join(directory, 'margin.sqlite')
  const database = new DatabaseSync(databasePath)
  database.exec(`
    CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE records (
      collection TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (collection, record_id)
    );
    CREATE INDEX records_collection_idx ON records (collection, record_id);
    CREATE TABLE dataset_meta (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
  `)
  database
    .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
    .run(1, '2026-08-01T00:00:00.000Z')
  const legacy = createSyntheticDataset()
  delete legacy.planningCycles
  legacy.schemaVersion = 1
  database.prepare('INSERT INTO dataset_meta (key, value_json) VALUES (?, ?)').run('dataset', JSON.stringify(legacy))
  database
    .prepare('INSERT INTO records (collection, record_id, payload_json, updated_at) VALUES (?, ?, ?, ?)')
    .run(
      'entries',
      'legacy-entry',
      JSON.stringify({ ...legacy.entries[0], id: 'legacy-entry' }),
      '2026-08-01T00:00:00.000Z',
    )
  database.prepare('INSERT INTO records (collection, record_id, payload_json, updated_at) VALUES (?, ?, ?, ?)').run(
    'entries',
    'timestamped-entry',
    JSON.stringify({
      ...legacy.entries[0],
      id: 'timestamped-entry',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    }),
    '2026-08-03T00:00:00.000Z',
  )
  database.close()

  const storage = await openStorage({ dataDirectory: directory })
  try {
    const dataset = storage.getDataset()
    assert.equal(dataset.entries.length, 2)
    assert.equal(dataset.entries[0].id, 'legacy-entry')
    assert.equal(dataset.entries[1].updatedAt, '2026-08-02T00:00:00.000Z')
    const corrected = storage.correctEntry('timestamped-entry', {
      operationId: 'legacy-migration-correction-1',
      expectedUpdatedAt: '2026-08-02T00:00:00.000Z',
      patch: { amountMinor: 9000000 },
    })
    assert.equal(corrected.replacement.amountMinor, 9000000)
    assert.deepEqual(dataset.planningCycles, [])
    assert.equal(dataset.schemaVersion, 3)
    assert.equal(storage.createPlanningCycle({ cycleKey: '2026-08' }).cycle.id, '2026-08')
  } finally {
    storage.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejects an invalid restore before changing existing data', async () => {
  await withStorage(async (storage) => {
    storage.replaceDataset(createSyntheticDataset())
    const before = storage.exportDataset()
    assert.throws(
      () => storage.replaceDataset({ ...before, entries: [{ id: 'bad', amountMinor: -1 }] }),
      ValidationError,
    )
    assert.deepEqual(storage.getDataset().entries, before.entries)
  })
})

test('exports a versioned backup and creates a recovery snapshot before restore', async () => {
  await withStorage(async (storage) => {
    const dataset = createSyntheticDataset()
    dataset.entries = dataset.entries.map((entry) =>
      entry.type === 'expense' ? { ...entry, name: 'Legacy lunch' } : entry,
    )
    storage.replaceDataset(dataset)
    const backup = storage.exportBackup()
    assert.equal(backup.formatVersion, 2)
    assert.equal(backup.integrity.algorithm, 'sha256')

    const result = await storage.restoreBackup(backup)
    const recoveryFiles = await readdir(path.join(storage.dataDirectory, 'recovery'))

    assert.equal(result.summary.recoverySnapshotCreated, true)
    assert.equal(recoveryFiles.length, 1)
    assert.equal(storage.getDataset().entries.length, 2)
    assert.equal(storage.getDataset().planningCycles[0].expectedSalaryMinor, 10000000)
    const planning = storage.getPlanningCycleSummary('2026-08', { evaluationOn: '2026-08-31' })
    assert.equal(planning.summary.closingActualMinor, 9875000)
    assert.equal(planning.summary.reservedCommitmentMinor, 3000000)
    assert.equal(storage.getDataset().entries.find((entry) => entry.id === 'synthetic-expense')?.name, 'Legacy lunch')

    const legacy = {
      ...dataset,
      formatVersion: 1,
      schemaVersion: 1,
      planningCycles: undefined,
      entries: dataset.entries.map((entry) => {
        const legacyEntry = { ...entry }
        delete legacyEntry.createdAt
        delete legacyEntry.updatedAt
        return legacyEntry
      }),
    }
    const legacyResult = await storage.restoreBackup(legacy)
    assert.deepEqual(legacyResult.dataset.planningCycles, [])
    assert.equal(typeof legacyResult.dataset.entries[0].createdAt, 'string')
    assert.equal(typeof legacyResult.dataset.entries[0].updatedAt, 'string')
  })
})

test('rejects a tampered backup without changing existing data', async () => {
  await withStorage(async (storage) => {
    storage.replaceDataset(createSyntheticDataset())
    const before = storage.getDataset()
    const backup = storage.exportBackup()
    const tampered = { ...backup, data: { ...backup.data, entries: [] } }

    await assert.rejects(
      () => storage.restoreBackup(tampered),
      (error) => {
        assert.equal(error instanceof BackupError, true)
        assert.equal(error.code, 'BACKUP_INTEGRITY_ERROR')
        return true
      },
    )
    assert.deepEqual(storage.getDataset().entries, before.entries)
  })
})

test('persists a reconciliation snapshot and adjustment without rewriting prior entries', async () => {
  await withStorage(async (storage) => {
    storage.replaceDataset(createSyntheticDataset())
    const before = storage.getDataset()
    const result = storage.reconcile({ asOf: '2026-08-20', realBalanceMinor: 9800000, note: 'Bank balance check' })
    const after = storage.getDataset()

    assert.equal(before.entries.length, 2)
    assert.equal(after.entries.length, 3)
    assert.equal(after.balanceSnapshots.length, 1)
    assert.match(result.snapshot.createdAt, /^\d{4}-\d{2}-\d{2}T/)
    assert.equal(result.snapshot.adjustmentEntryId, result.adjustment.id)
    assert.equal(result.adjustment.direction, 'debit')
    assert.equal(storage.getActualBalance(), 9800000)
  })
})

test('rejects unknown reconciliation fields before creating a snapshot or adjustment', async () => {
  await withStorage(async (storage) => {
    assert.throws(
      () => storage.reconcile({ asOf: '2026-08-20', realBalanceMinor: 100, extra: 'ignored?' }),
      (error) => error instanceof ValidationError && error.details.some((detail) => detail.includes('not writable')),
    )
    assert.equal(storage.getDataset().entries.length, 0)
    assert.equal(storage.getDataset().balanceSnapshots.length, 0)
  })
})

test('reset clears Margin records without deleting the configured data directory', async () => {
  await withStorage(async (storage) => {
    storage.replaceDataset(createSyntheticDataset())
    const reset = storage.reset()
    assert.equal(reset.entries.length, 0)
    assert.equal(reset.commitments.length, 0)
    assert.equal(reset.planningCycles.length, 0)
    assert.equal(storage.dataDirectory.startsWith(os.tmpdir()), true)
  })
})

test('existing reset removes first-slice salary, expense, and category records', async () => {
  await withStorage(async (storage) => {
    storage.createTransaction({ type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01' })
    storage.createTransaction({
      type: 'expense',
      amountMinor: 125000,
      occurredOn: '2026-08-02',
      name: 'Lunch',
      categoryName: 'Food',
    })

    const reset = storage.reset()

    assert.equal(reset.entries.length, 0)
    assert.equal(reset.categories.length, 0)
    assert.equal(storage.getSummary().actualBalanceMinor, 0)
  })
})
