import { chmod, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createBackupEnvelope, decodeBackup, validateBackup as validateBackupDocument } from './backup.mjs'
import { calculateActualBalanceMinor } from './domain/calculations.mjs'
import {
  ConflictError,
  createEmptyDataset,
  collectionNames,
  validateDataset,
  validateRecord,
  ValidationError,
} from './validation.mjs'

const MIGRATIONS = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS records (
        collection TEXT NOT NULL,
        record_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (collection, record_id)
      )`,
      `CREATE INDEX IF NOT EXISTS records_collection_idx ON records (collection, record_id)`,
      `CREATE TABLE IF NOT EXISTS dataset_meta (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      )`,
    ],
  },
]

export function defaultDataDirectory(
  platform = process.platform,
  homeDirectory = os.homedir(),
  environment = process.env,
) {
  if (platform === 'darwin') return path.join(homeDirectory, 'Library', 'Application Support', 'Margin')
  if (platform === 'win32')
    return path.join(environment.LOCALAPPDATA || path.join(homeDirectory, 'AppData', 'Local'), 'Margin')
  return path.join(environment.XDG_DATA_HOME || path.join(homeDirectory, '.local', 'share'), 'margin')
}

function resolveDataDirectory(explicitDirectory) {
  const candidate = explicitDirectory || process.env.MARGIN_DATA_DIR || defaultDataDirectory()
  if (!path.isAbsolute(candidate)) throw new Error('MARGIN_DATA_DIR must be an absolute path')
  const resolved = path.resolve(candidate)
  if (resolved === path.parse(resolved).root)
    throw new Error('Refusing to use a filesystem root as Margin data directory')
  return resolved
}

async function makePrivateDirectory(directory) {
  await mkdir(directory, { recursive: true })
  try {
    await chmod(directory, 0o700)
  } catch {
    // Windows permissions are managed by the user and OS ACLs.
  }
}

function now() {
  return new Date().toISOString()
}

function fileTimestamp() {
  return now().replace(/[.:]/g, '-')
}

function parseJson(value, label) {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`Stored ${label} is not valid JSON`)
  }
}

export class MarginStorage {
  constructor(database, dataDirectory, databasePath, recoveryDirectory) {
    this.database = database
    this.dataDirectory = dataDirectory
    this.databasePath = databasePath
    this.recoveryDirectory = recoveryDirectory
  }

  close() {
    this.database.close()
  }

  transaction(callback) {
    this.database.exec('BEGIN IMMEDIATE')
    try {
      const result = callback()
      this.database.exec('COMMIT')
      return result
    } catch (error) {
      try {
        this.database.exec('ROLLBACK')
      } catch {
        // Preserve the original failure.
      }
      throw error
    }
  }

  getCollection(collection) {
    if (!collectionNames().includes(collection)) throw new Error(`Unknown collection: ${collection}`)
    return this.database
      .prepare('SELECT payload_json FROM records WHERE collection = ? ORDER BY record_id')
      .all(collection)
      .map((row) => parseJson(row.payload_json, `${collection} record`))
  }

  getRecord(collection, id) {
    if (!collectionNames().includes(collection)) throw new Error(`Unknown collection: ${collection}`)
    const row = this.database
      .prepare('SELECT payload_json FROM records WHERE collection = ? AND record_id = ?')
      .get(collection, id)
    return row ? parseJson(row.payload_json, `${collection} record`) : null
  }

  createRecord(collection, record) {
    validateRecord(collection, record)
    if (this.getRecord(collection, record.id))
      throw new ConflictError(`${collection} record ${record.id} already exists`)
    this.database
      .prepare('INSERT INTO records (collection, record_id, payload_json, updated_at) VALUES (?, ?, ?, ?)')
      .run(collection, record.id, JSON.stringify(record), now())
    return record
  }

  updateRecord(collection, id, record) {
    validateRecord(collection, record)
    if (record.id !== id) throw new Error('Record id in URL must match record id in body')
    if (!this.getRecord(collection, id)) throw new Error(`${collection} record ${id} does not exist`)
    this.database
      .prepare('UPDATE records SET payload_json = ?, updated_at = ? WHERE collection = ? AND record_id = ?')
      .run(JSON.stringify(record), now(), collection, id)
    return record
  }

  deleteRecord(collection, id) {
    if (!collectionNames().includes(collection)) throw new Error(`Unknown collection: ${collection}`)
    const result = this.database
      .prepare('DELETE FROM records WHERE collection = ? AND record_id = ?')
      .run(collection, id)
    return result.changes > 0
  }

  getDataset() {
    const metaRow = this.database.prepare('SELECT value_json FROM dataset_meta WHERE key = ?').get('dataset')
    const meta = metaRow ? parseJson(metaRow.value_json, 'dataset metadata') : createEmptyDataset()
    const dataset = {
      ...createEmptyDataset(),
      ...meta,
      exportedAt: now(),
    }
    for (const collection of collectionNames()) dataset[collection] = this.getCollection(collection)
    return validateDataset(dataset)
  }

  exportDataset() {
    return {
      ...this.getDataset(),
      exportedAt: now(),
    }
  }

  exportBackup() {
    return createBackupEnvelope(this.getDataset())
  }

  validateBackup(input) {
    return validateBackupDocument(input)
  }

  async createRecoverySnapshot(label) {
    await makePrivateDirectory(this.recoveryDirectory)
    const filename = `${label}-${fileTimestamp()}-${randomUUID()}.json`
    const destination = path.join(this.recoveryDirectory, filename)
    await writeFile(destination, `${JSON.stringify(this.exportBackup(), null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })

    const recoveryFiles = (await readdir(this.recoveryDirectory))
      .filter((file) => file.endsWith('.json'))
      .sort()
      .reverse()
    for (const staleFile of recoveryFiles.slice(3)) {
      await rm(path.join(this.recoveryDirectory, staleFile), { force: true })
    }
    return filename
  }

  async restoreBackup(input) {
    const decoded = decodeBackup(input)
    const recoveryFile = await this.createRecoverySnapshot('pre-restore')
    const dataset = this.replaceDataset(decoded.dataset)
    return {
      dataset,
      summary: {
        ...decoded.summary,
        recoverySnapshotCreated: true,
        recoveryFile,
      },
    }
  }

  getActualBalance() {
    return calculateActualBalanceMinor(this.getCollection('entries'))
  }

  reconcile({ asOf, realBalanceMinor, note } = {}) {
    const calculatedActualBalanceMinor = this.getActualBalance()
    if (!Number.isSafeInteger(realBalanceMinor)) throw new ValidationError('realBalanceMinor must be an integer')
    const differenceMinor = realBalanceMinor - calculatedActualBalanceMinor
    const snapshot = {
      id: randomUUID(),
      asOf,
      calculatedActualBalanceMinor,
      realBalanceMinor,
      differenceMinor,
      note,
    }

    return this.transaction(() => {
      let adjustment = null
      if (differenceMinor !== 0) {
        adjustment = {
          id: randomUUID(),
          type: 'adjustment',
          amountMinor: Math.abs(differenceMinor),
          occurredOn: asOf,
          status: 'active',
          direction: differenceMinor > 0 ? 'credit' : 'debit',
          adjustmentReason: 'reconciliation',
          note: note || 'Balance reconciliation adjustment',
        }
        this.createRecord('entries', adjustment)
        snapshot.adjustmentEntryId = adjustment.id
      }
      this.createRecord('balanceSnapshots', snapshot)
      return { snapshot, adjustment, dataset: this.getDataset() }
    })
  }

  replaceDataset(input) {
    const dataset = validateDataset(input)
    const metadata = { ...dataset }
    for (const collection of collectionNames()) delete metadata[collection]
    delete metadata.exportedAt

    return this.transaction(() => {
      this.database.exec('DELETE FROM records')
      this.database.exec('DELETE FROM dataset_meta')
      this.database
        .prepare('INSERT INTO dataset_meta (key, value_json) VALUES (?, ?)')
        .run('dataset', JSON.stringify(metadata))

      const insert = this.database.prepare(
        'INSERT INTO records (collection, record_id, payload_json, updated_at) VALUES (?, ?, ?, ?)',
      )
      for (const collection of collectionNames()) {
        for (const record of dataset[collection]) {
          insert.run(collection, record.id, JSON.stringify(record), now())
        }
      }
      return this.getDataset()
    })
  }

  reset() {
    return this.transaction(() => {
      this.database.exec('DELETE FROM records')
      this.database.exec('DELETE FROM dataset_meta')
      return this.getDataset()
    })
  }
}

export async function openStorage({ dataDirectory } = {}) {
  const resolvedDirectory = resolveDataDirectory(dataDirectory)
  await makePrivateDirectory(resolvedDirectory)
  const databasePath = path.join(resolvedDirectory, 'margin.sqlite')
  const database = new DatabaseSync(databasePath)
  database.exec(
    'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;',
  )
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)')

  const currentRow = database.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').get()
  const currentVersion = currentRow?.version ?? 0
  for (const migration of MIGRATIONS.filter((item) => item.version > currentVersion)) {
    database.exec('BEGIN IMMEDIATE')
    try {
      for (const statement of migration.statements) database.exec(statement)
      database
        .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(migration.version, now())
      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      database.close()
      throw error
    }
  }

  const recoveryDirectory = path.join(resolvedDirectory, 'recovery')
  const storage = new MarginStorage(database, resolvedDirectory, databasePath, recoveryDirectory)
  if (!database.prepare('SELECT 1 FROM dataset_meta WHERE key = ?').get('dataset')) {
    storage.replaceDataset(createEmptyDataset())
  }
  return storage
}
