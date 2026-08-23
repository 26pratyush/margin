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
  database.close()

  const storage = await openStorage({ dataDirectory: directory })
  try {
    const dataset = storage.getDataset()
    assert.equal(dataset.entries.length, 1)
    assert.equal(dataset.entries[0].id, 'legacy-entry')
    assert.deepEqual(dataset.planningCycles, [])
    assert.equal(dataset.schemaVersion, 2)
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
    assert.equal(storage.getDataset().entries.find((entry) => entry.id === 'synthetic-expense')?.name, 'Legacy lunch')
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
    assert.equal(result.snapshot.adjustmentEntryId, result.adjustment.id)
    assert.equal(result.adjustment.direction, 'debit')
    assert.equal(storage.getActualBalance(), 9800000)
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
