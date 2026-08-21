import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { BackupError } from '../../backup.mjs'
import { openStorage } from '../../storage.mjs'
import { ValidationError, createSyntheticDataset } from '../../validation.mjs'

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
      categoryName: 'Food',
    })
    const secondExpense = first.createTransaction({
      type: 'expense',
      amountMinor: 50000,
      occurredOn: '2026-08-03',
      categoryName: ' food ',
    })

    assert.equal(salary.entry.type, 'income')
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
    storage.replaceDataset(createSyntheticDataset())
    const backup = storage.exportBackup()
    assert.equal(backup.formatVersion, 2)
    assert.equal(backup.integrity.algorithm, 'sha256')

    const result = await storage.restoreBackup(backup)
    const recoveryFiles = await readdir(path.join(storage.dataDirectory, 'recovery'))

    assert.equal(result.summary.recoverySnapshotCreated, true)
    assert.equal(recoveryFiles.length, 1)
    assert.equal(storage.getDataset().entries.length, 2)
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
    assert.equal(storage.dataDirectory.startsWith(os.tmpdir()), true)
  })
})

test('existing reset removes first-slice salary, expense, and category records', async () => {
  await withStorage(async (storage) => {
    storage.createTransaction({ type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01' })
    storage.createTransaction({ type: 'expense', amountMinor: 125000, occurredOn: '2026-08-02', categoryName: 'Food' })

    const reset = storage.reset()

    assert.equal(reset.entries.length, 0)
    assert.equal(reset.categories.length, 0)
    assert.equal(storage.getSummary().actualBalanceMinor, 0)
  })
})
