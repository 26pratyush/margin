import assert from 'node:assert/strict'
import test from 'node:test'
import { BackupError, createBackupEnvelope, decodeBackup } from '../../backup.mjs'
import { createSyntheticDataset } from '../../validation.mjs'

test('creates a versioned canonical backup with a stable integrity digest', () => {
  const dataset = createSyntheticDataset()
  const exportedAt = '2026-08-20T10:00:00.000Z'
  const first = createBackupEnvelope(dataset, { exportedAt })
  const second = createBackupEnvelope({ ...dataset, entries: [...dataset.entries].reverse() }, { exportedAt })

  assert.deepEqual(first, second)
  assert.equal(first.formatVersion, 2)
  assert.equal(first.integrity.algorithm, 'sha256')
  assert.equal(first.data.entries.length, 2)
})

test('decodes the current backup and preserves the full dataset', () => {
  const backup = createBackupEnvelope(createSyntheticDataset(), { exportedAt: '2026-08-20T10:00:00.000Z' })
  const decoded = decodeBackup(backup)

  assert.equal(decoded.summary.sourceFormatVersion, 2)
  assert.equal(decoded.summary.counts.entries, 2)
  assert.equal(decoded.dataset.commitments[0].id, 'synthetic-sip')
})

test('accepts the legacy flat v1 backup shape', () => {
  const legacy = { ...createSyntheticDataset(), exportedAt: '2026-08-20T10:00:00.000Z' }
  const decoded = decodeBackup(legacy)

  assert.equal(decoded.summary.sourceFormatVersion, 1)
  assert.equal(decoded.dataset.entries.length, 2)
  assert.equal(decoded.summary.warnings.length, 1)
})

test('rejects a modified backup before it reaches storage', () => {
  const backup = createBackupEnvelope(createSyntheticDataset(), { exportedAt: '2026-08-20T10:00:00.000Z' })
  const tampered = { ...backup, data: { ...backup.data, entries: [] } }

  assert.throws(
    () => decodeBackup(tampered),
    (error) => {
      assert.equal(error instanceof BackupError, true)
      assert.equal(error.code, 'BACKUP_INTEGRITY_ERROR')
      return true
    },
  )
})

test('rejects backup versions newer than the current app', () => {
  assert.throws(
    () => decodeBackup({ format: 'margin-backup', formatVersion: 99 }),
    (error) => {
      assert.equal(error instanceof BackupError, true)
      assert.equal(error.code, 'UNSUPPORTED_BACKUP_VERSION')
      return true
    },
  )
})
