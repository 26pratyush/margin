import { chmod, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  canonicalJson,
  createBackupEnvelope,
  decodeBackup,
  validateBackup as validateBackupDocument,
} from './backup.mjs'
import { calculateActualBalanceMinor } from './domain/calculations.mjs'
import {
  comparableOperationRecord,
  CORRECTABLE_ENTRY_TYPES,
  createReplacementEntry,
  snapshotIsAffected,
} from './domain/corrections.mjs'
import { projectHistory } from './domain/history.mjs'
import { calculatePlanningCycleSummary, cycleBounds, localDateToday } from './domain/planning.mjs'
import { calculateLedgerSummary } from './domain/summary.mjs'
import {
  ConflictError,
  CURRENT_SCHEMA_VERSION,
  createEmptyDataset,
  collectionNames,
  NotFoundError,
  validateDataset,
  validatePlanningCycleInput,
  validatePlanningCyclePatch,
  validateEntryCorrectionInput,
  validateEntryCorrectionPatch,
  validateEntryVoidInput,
  validateRecord,
  validateTransactionInput,
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
  {
    version: 2,
    statements: [`ALTER TABLE records ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1`],
  },
  {
    version: 3,
    statements: [],
    migrate(database) {
      const rows = database
        .prepare('SELECT collection, record_id, payload_json, updated_at FROM records WHERE collection = ?')
        .all('entries')
      const update = database.prepare(
        'UPDATE records SET payload_json = ?, updated_at = ?, schema_version = ? WHERE collection = ? AND record_id = ?',
      )
      for (const row of rows) {
        const entry = parseJson(row.payload_json, 'entries record')
        const timestamp = entry.updatedAt ?? row.updated_at
        const normalized = {
          ...entry,
          ...(entry.createdAt === undefined ? { createdAt: timestamp } : {}),
          ...(entry.updatedAt === undefined ? { updatedAt: timestamp } : {}),
        }
        validateRecord('entries', normalized)
        update.run(
          JSON.stringify(normalized),
          normalized.updatedAt,
          recordSchemaVersion('entries'),
          row.collection,
          row.record_id,
        )
      }
    },
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

function nextTimestamp(previousTimestamp) {
  const candidate = now()
  if (!previousTimestamp || candidate > previousTimestamp) return candidate
  return new Date(Date.parse(previousTimestamp) + 1).toISOString()
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

function recordSchemaVersion(collection) {
  return collection === 'planningCycles' ? CURRENT_SCHEMA_VERSION : 1
}

function normalizeEntryTimestamps(entry, fallbackTimestamp = now()) {
  return {
    ...entry,
    ...(entry.createdAt === undefined ? { createdAt: fallbackTimestamp } : {}),
    ...(entry.updatedAt === undefined ? { updatedAt: fallbackTimestamp } : {}),
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

  getStoredRecord(collection, id) {
    if (!collectionNames().includes(collection)) throw new Error(`Unknown collection: ${collection}`)
    const row = this.database
      .prepare('SELECT payload_json, updated_at FROM records WHERE collection = ? AND record_id = ?')
      .get(collection, id)
    if (!row) return null
    const record = parseJson(row.payload_json, `${collection} record`)
    return {
      record,
      rowUpdatedAt: row.updated_at,
      updatedAt: record.updatedAt ?? row.updated_at,
    }
  }

  createRecord(collection, record) {
    validateRecord(collection, record)
    if (this.getRecord(collection, record.id))
      throw new ConflictError(`${collection} record ${record.id} already exists`)
    const timestamp = now()
    const persistedRecord = collection === 'entries' ? normalizeEntryTimestamps(record, timestamp) : record
    validateRecord(collection, persistedRecord)
    this.database
      .prepare(
        'INSERT INTO records (collection, record_id, payload_json, updated_at, schema_version) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        collection,
        persistedRecord.id,
        JSON.stringify(persistedRecord),
        persistedRecord.updatedAt ?? timestamp,
        recordSchemaVersion(collection),
      )
    return persistedRecord
  }

  updateRecord(collection, id, record) {
    if (collection === 'entries') {
      throw new ConflictError(
        'Posted entries must be changed through a dedicated correction or void command',
        'ENTRY_MUTATION_REQUIRES_COMMAND',
      )
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) validateRecord(collection, record)
    if (record.id !== id) throw new Error('Record id in URL must match record id in body')
    const existing = this.getRecord(collection, id)
    if (!existing) throw new NotFoundError(`${collection} record ${id} does not exist`)
    let nextRecord = record
    if (collection === 'planningCycles') {
      if (
        record.cycleKey !== existing.cycleKey ||
        record.startOn !== existing.startOn ||
        record.endOn !== existing.endOn
      ) {
        throw new ValidationError('Planning cycle identity cannot change after creation')
      }
      nextRecord = { ...record, createdAt: existing.createdAt, updatedAt: now() }
    }
    validateRecord(collection, nextRecord)
    this.database
      .prepare(
        'UPDATE records SET payload_json = ?, updated_at = ?, schema_version = ? WHERE collection = ? AND record_id = ?',
      )
      .run(JSON.stringify(nextRecord), now(), recordSchemaVersion(collection), collection, id)
    return nextRecord
  }

  deleteRecord(collection, id) {
    if (!collectionNames().includes(collection)) throw new Error(`Unknown collection: ${collection}`)
    if (collection === 'entries') {
      throw new ConflictError(
        'Posted entries must be changed through a dedicated correction or void command',
        'ENTRY_MUTATION_REQUIRES_COMMAND',
      )
    }
    const result = this.database
      .prepare('DELETE FROM records WHERE collection = ? AND record_id = ?')
      .run(collection, id)
    return result.changes > 0
  }

  getDataset() {
    const metaRow = this.database.prepare('SELECT value_json FROM dataset_meta WHERE key = ?').get('dataset')
    const meta = metaRow ? parseJson(metaRow.value_json, 'dataset metadata') : createEmptyDataset()
    const storedSchemaVersion = Number.isSafeInteger(meta.schemaVersion) ? meta.schemaVersion : CURRENT_SCHEMA_VERSION
    const dataset = {
      ...createEmptyDataset(),
      ...meta,
      schemaVersion: Math.max(storedSchemaVersion, CURRENT_SCHEMA_VERSION),
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

  getSummary() {
    return calculateLedgerSummary({
      entries: this.getCollection('entries'),
      commitments: this.getCollection('commitments'),
    })
  }

  getHistory(filters = {}) {
    try {
      return projectHistory({
        ...filters,
        entries: this.getCollection('entries'),
        balanceSnapshots: this.getCollection('balanceSnapshots'),
      })
    } catch (error) {
      if (error instanceof RangeError) throw new ValidationError('Invalid history filters', [error.message])
      throw error
    }
  }

  getPlanningCycles() {
    return this.getCollection('planningCycles')
  }

  getPlanningCycleSummary(cycleKey, { evaluationOn = localDateToday() } = {}) {
    let bounds
    try {
      bounds = cycleBounds(cycleKey)
    } catch (error) {
      throw new ValidationError('Invalid planning cycle', [error.message])
    }

    const cycle = this.getRecord('planningCycles', cycleKey)
    const calculationCycle = cycle ?? { id: cycleKey, cycleKey, ...bounds }
    return {
      cycle,
      summary: calculatePlanningCycleSummary({
        cycle: calculationCycle,
        entries: this.getCollection('entries'),
        commitments: this.getCollection('commitments'),
        evaluationOn,
      }),
    }
  }

  createPlanningCycle(input) {
    const planningInput = validatePlanningCycleInput(input)
    const timestamp = now()
    const cycle = {
      id: planningInput.cycleKey,
      cycleKey: planningInput.cycleKey,
      ...cycleBounds(planningInput.cycleKey),
      ...planningInput,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    return this.transaction(() => {
      this.createRecord('planningCycles', cycle)
      return this.getPlanningCycleSummary(cycle.cycleKey)
    })
  }

  updatePlanningCycle(cycleKey, input) {
    const existing = this.getRecord('planningCycles', cycleKey)
    if (!existing) throw new NotFoundError(`planningCycles record ${cycleKey} does not exist`)
    const patch = validatePlanningCyclePatch(input)
    const cycle = { ...existing, ...patch, updatedAt: now() }
    return this.transaction(() => {
      this.updateRecord('planningCycles', cycleKey, cycle)
      return this.getPlanningCycleSummary(cycleKey)
    })
  }

  createTransaction(input) {
    const transaction = validateTransactionInput(input)

    return this.transaction(() => {
      let category = null
      let categoryId
      if (transaction.type === 'expense') {
        const normalizedName = transaction.categoryName.toLocaleLowerCase()
        category = this.getCollection('categories').find(
          (candidate) => candidate.name.trim().toLocaleLowerCase() === normalizedName,
        )
        if (!category) {
          category = { id: randomUUID(), name: transaction.categoryName }
          this.createRecord('categories', category)
        }
        categoryId = category.id
      }

      const timestamp = now()
      const entry = {
        id: randomUUID(),
        type: transaction.type,
        amountMinor: transaction.amountMinor,
        occurredOn: transaction.occurredOn,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(transaction.name ? { name: transaction.name } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(transaction.source ? { source: transaction.source } : {}),
        ...(transaction.note ? { note: transaction.note } : {}),
      }
      this.createRecord('entries', entry)

      return { entry, category, dataset: this.getDataset(), summary: this.getSummary() }
    })
  }

  findOperationRecords(operationId) {
    return this.getCollection('entries').filter((entry) => entry.operationId === operationId)
  }

  findCorrectionReplay(target, command) {
    const operationRecords = this.findOperationRecords(command.operationId)
    if (operationRecords.length === 0) return null

    if (target.operationId === command.operationId && target.status === 'voided' && target.replacedById) {
      const replacement = this.getRecord('entries', target.replacedById)
      if (!replacement) {
        throw new ConflictError(
          `Correction replacement ${target.replacedById} is missing`,
          'INVALID_REPLACEMENT_LINEAGE',
        )
      }
      const expectedReplacement = createReplacementEntry(target, command.patch, {
        id: replacement.id,
        timestamp: replacement.createdAt ?? target.updatedAt,
        operationId: command.operationId,
      })
      if (
        canonicalJson(comparableOperationRecord(expectedReplacement)) !==
        canonicalJson(comparableOperationRecord(replacement))
      ) {
        throw new ConflictError(
          `operationId ${command.operationId} was already used with a different correction`,
          'IDEMPOTENCY_CONFLICT',
        )
      }
      return { original: target, replacement }
    }

    throw new ConflictError(
      `operationId ${command.operationId} was already used for another operation`,
      'IDEMPOTENCY_CONFLICT',
    )
  }

  findVoidReplay(target, command) {
    const operationRecords = this.findOperationRecords(command.operationId)
    if (operationRecords.length === 0) return null

    if (
      target.operationId === command.operationId &&
      target.status === 'voided' &&
      target.replacedById === undefined &&
      target.voidReason === command.reason
    ) {
      return { entry: target }
    }

    throw new ConflictError(
      `operationId ${command.operationId} was already used for another operation`,
      'IDEMPOTENCY_CONFLICT',
    )
  }

  assertCorrectableEntry(entry) {
    if (entry.status !== 'active') {
      throw new ConflictError(`Entry ${entry.id} is terminal and cannot be changed`, 'TERMINAL_ENTRY')
    }
    if (!CORRECTABLE_ENTRY_TYPES.has(entry.type)) {
      throw new ConflictError(`Entry type ${entry.type} does not support correction commands`, 'UNSUPPORTED_ENTRY_TYPE')
    }
  }

  assertEntryVersion(storedEntry, expectedUpdatedAt) {
    if (storedEntry.updatedAt !== expectedUpdatedAt) {
      throw new ConflictError(`Entry ${storedEntry.record.id} is stale; reload it before retrying`, 'STALE_ENTRY')
    }
  }

  assertNoActiveRefundDependents(entryId) {
    const dependents = this.getCollection('entries').filter(
      (entry) => entry.status === 'active' && entry.type === 'refund' && entry.refundOfId === entryId,
    )
    if (dependents.length > 0) {
      throw new ConflictError(`Entry ${entryId} has active refund dependents`, 'DEPENDENCY_CONFLICT')
    }
  }

  getLinkedCommitment(entry) {
    if (!entry.commitmentId) return null
    const commitment = this.getRecord('commitments', entry.commitmentId)
    if (!commitment) {
      throw new ConflictError(
        `Entry ${entry.id} references missing commitment ${entry.commitmentId}`,
        'DEPENDENCY_CONFLICT',
      )
    }
    return commitment
  }

  updateCommitmentEntryLink(commitment, replacedEntryId, replacementEntryId) {
    const linkedEntryIds = Array.isArray(commitment.linkedEntryIds) ? commitment.linkedEntryIds : []
    const nextLinkedEntryIds = [
      ...new Set([...linkedEntryIds.filter((entryId) => entryId !== replacedEntryId), replacementEntryId]),
    ]
    const nextCommitment = {
      ...commitment,
      linkedEntryIds: nextLinkedEntryIds,
      updatedAt: nextTimestamp(commitment.updatedAt),
    }
    return this.updateRecord('commitments', commitment.id, nextCommitment)
  }

  markAffectedSnapshots(original, replacement = null) {
    for (const snapshot of this.getCollection('balanceSnapshots')) {
      const affected =
        snapshotIsAffected(snapshot, original) || (replacement && snapshotIsAffected(snapshot, replacement))
      if (!affected || snapshot.reviewState === 'needs-review') continue
      this.updateRecord('balanceSnapshots', snapshot.id, { ...snapshot, reviewState: 'needs-review' })
    }
  }

  updateStoredEntry(storedEntry, nextEntry) {
    const result = this.database
      .prepare(
        'UPDATE records SET payload_json = ?, updated_at = ?, schema_version = ? WHERE collection = ? AND record_id = ? AND updated_at = ?',
      )
      .run(
        JSON.stringify(nextEntry),
        nextEntry.updatedAt,
        recordSchemaVersion('entries'),
        'entries',
        nextEntry.id,
        storedEntry.rowUpdatedAt,
      )
    if (result.changes !== 1) {
      throw new ConflictError(`Entry ${nextEntry.id} is stale; reload it before retrying`, 'STALE_ENTRY')
    }
    return nextEntry
  }

  correctEntry(id, input) {
    const command = validateEntryCorrectionInput(input)

    return this.transaction(() => {
      const storedEntry = this.getStoredRecord('entries', id)
      if (!storedEntry) throw new NotFoundError(`entries record ${id} does not exist`)
      const replay = this.findCorrectionReplay(storedEntry.record, command)
      if (replay) {
        return { ...replay, dataset: this.getDataset(), summary: this.getSummary() }
      }

      this.assertCorrectableEntry(storedEntry.record)
      validateEntryCorrectionPatch(storedEntry.record, command.patch)
      this.assertEntryVersion(storedEntry, command.expectedUpdatedAt)

      if (command.patch.categoryId !== undefined && command.patch.categoryId !== null) {
        if (!this.getRecord('categories', command.patch.categoryId)) {
          throw new ValidationError('Invalid entry correction patch', [
            'patch.categoryId does not reference an existing category',
          ])
        }
      }
      this.assertNoActiveRefundDependents(id)
      const commitment = this.getLinkedCommitment(storedEntry.record)
      const timestamp = nextTimestamp(storedEntry.updatedAt)
      const replacement = createReplacementEntry(storedEntry.record, command.patch, {
        id: randomUUID(),
        timestamp,
        operationId: command.operationId,
      })
      const voided = {
        ...storedEntry.record,
        status: 'voided',
        updatedAt: timestamp,
        voidedAt: timestamp,
        operationId: command.operationId,
        replacedById: replacement.id,
      }
      validateRecord('entries', voided)
      validateRecord('entries', replacement)

      this.updateStoredEntry(storedEntry, voided)
      this.createRecord('entries', replacement)
      if (commitment) this.updateCommitmentEntryLink(commitment, id, replacement.id)
      this.markAffectedSnapshots(storedEntry.record, replacement)

      return { original: voided, replacement, dataset: this.getDataset(), summary: this.getSummary() }
    })
  }

  voidEntry(id, input) {
    const command = validateEntryVoidInput(input)

    return this.transaction(() => {
      const storedEntry = this.getStoredRecord('entries', id)
      if (!storedEntry) throw new NotFoundError(`entries record ${id} does not exist`)
      const replay = this.findVoidReplay(storedEntry.record, command)
      if (replay) return { ...replay, dataset: this.getDataset(), summary: this.getSummary() }

      this.assertCorrectableEntry(storedEntry.record)
      this.assertEntryVersion(storedEntry, command.expectedUpdatedAt)
      this.assertNoActiveRefundDependents(id)
      const commitment = this.getLinkedCommitment(storedEntry.record)
      if (commitment) {
        throw new ConflictError(
          `Entry ${id} is linked to commitment ${commitment.id} and must be unlinked before voiding`,
          'DEPENDENCY_CONFLICT',
        )
      }

      const timestamp = nextTimestamp(storedEntry.updatedAt)
      const voided = {
        ...storedEntry.record,
        status: 'voided',
        updatedAt: timestamp,
        voidedAt: timestamp,
        voidReason: command.reason,
        operationId: command.operationId,
      }
      validateRecord('entries', voided)
      this.updateStoredEntry(storedEntry, voided)
      this.markAffectedSnapshots(storedEntry.record)

      return { entry: voided, dataset: this.getDataset(), summary: this.getSummary() }
    })
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
        'INSERT INTO records (collection, record_id, payload_json, updated_at, schema_version) VALUES (?, ?, ?, ?, ?)',
      )
      for (const collection of collectionNames()) {
        for (const record of dataset[collection]) {
          const timestamp = now()
          const persistedRecord = collection === 'entries' ? normalizeEntryTimestamps(record, timestamp) : record
          insert.run(
            collection,
            persistedRecord.id,
            JSON.stringify(persistedRecord),
            persistedRecord.updatedAt ?? timestamp,
            recordSchemaVersion(collection),
          )
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
      if (migration.migrate) migration.migrate(database)
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
