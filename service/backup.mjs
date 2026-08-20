import { createHash } from 'node:crypto'
import { validateDataset } from './validation.mjs'

const BACKUP_FORMAT = 'margin-backup'
const CURRENT_FORMAT_VERSION = 2
const COLLECTIONS = ['entries', 'categories', 'commitments', 'balanceSnapshots']

export class BackupError extends Error {
  constructor(code, message, details = []) {
    super(message)
    this.name = 'BackupError'
    this.code = code
    this.details = details
    this.statusCode = code === 'UNSUPPORTED_BACKUP_VERSION' ? 422 : 400
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key])
      return result
    }, {})
  }
  return value
}

export function canonicalJson(value) {
  return JSON.stringify(stableValue(value))
}

function digestFor(envelope) {
  const { integrity: _integrity, ...unsignedEnvelope } = envelope
  return createHash('sha256').update(canonicalJson(unsignedEnvelope), 'utf8').digest('hex')
}

function sortCollection(records) {
  return [...records].sort((left, right) => String(left.id).localeCompare(String(right.id)))
}

function cloneDataset(dataset) {
  return validateDataset({ ...dataset, formatVersion: 1 })
}

function summaryFor(dataset, sourceFormatVersion, warnings = []) {
  return {
    sourceFormatVersion,
    schemaVersion: dataset.schemaVersion,
    appVersion: dataset.appVersion,
    exportedAt: dataset.exportedAt,
    currency: dataset.currency,
    counts: Object.fromEntries(COLLECTIONS.map((collection) => [collection, dataset[collection].length])),
    warnings,
  }
}

function invalidBackup(error) {
  if (error?.name === 'ValidationError') {
    return new BackupError('BACKUP_VALIDATION_ERROR', error.message, error.details)
  }
  return error
}

export function createBackupEnvelope(dataset, { exportedAt = new Date().toISOString() } = {}) {
  const current = cloneDataset(dataset)
  const envelope = {
    format: BACKUP_FORMAT,
    formatVersion: CURRENT_FORMAT_VERSION,
    schemaVersion: current.schemaVersion,
    appVersion: current.appVersion,
    exportedAt,
    currency: current.currency,
    data: Object.fromEntries(COLLECTIONS.map((collection) => [collection, sortCollection(current[collection])])),
    extensions: current.extensions ?? {},
  }

  return {
    ...envelope,
    integrity: {
      algorithm: 'sha256',
      digest: digestFor(envelope),
    },
  }
}

function migrateV2ToDataset(input) {
  if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) {
    throw new BackupError('BACKUP_VALIDATION_ERROR', 'Backup data must be an object containing the dataset collections')
  }

  const missing = COLLECTIONS.filter((collection) => !Array.isArray(input.data[collection]))
  if (missing.length > 0) {
    throw new BackupError('BACKUP_VALIDATION_ERROR', `Backup data is missing collections: ${missing.join(', ')}`)
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: 1,
    schemaVersion: input.schemaVersion,
    appVersion: input.appVersion,
    exportedAt: input.exportedAt,
    currency: input.currency,
    extensions: input.extensions,
    ...Object.fromEntries(COLLECTIONS.map((collection) => [collection, input.data[collection]])),
  }
}

function verifyIntegrity(input) {
  if (!input.integrity) return ['Backup has no integrity digest; it may be a legacy or manually created file.']
  if (input.integrity.algorithm !== 'sha256' || typeof input.integrity.digest !== 'string') {
    throw new BackupError('BACKUP_INTEGRITY_ERROR', 'Backup integrity metadata is not supported')
  }
  if (input.integrity.digest !== digestFor(input)) {
    throw new BackupError('BACKUP_INTEGRITY_ERROR', 'Backup integrity check failed; the file may be corrupted or modified')
  }
  return []
}

export function decodeBackup(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BackupError('BACKUP_VALIDATION_ERROR', 'Backup must contain a JSON object')
  }
  if (input.format !== BACKUP_FORMAT) {
    throw new BackupError('BACKUP_VALIDATION_ERROR', `Unsupported backup format: ${String(input.format)}`)
  }

  const version = input.formatVersion
  if (version === 1) {
    try {
      const dataset = cloneDataset(input)
      return {
        dataset,
        summary: summaryFor(dataset, 1, ['Legacy flat backup migrated in memory to the current restore contract.']),
      }
    } catch (error) {
      throw invalidBackup(error)
    }
  }

  if (version !== CURRENT_FORMAT_VERSION) {
    throw new BackupError('UNSUPPORTED_BACKUP_VERSION', `This app supports backup versions 1 and ${CURRENT_FORMAT_VERSION}; received ${String(version)}`)
  }

  const warnings = verifyIntegrity(input)
  try {
    const dataset = cloneDataset(migrateV2ToDataset(input))
    return { dataset, summary: summaryFor(dataset, version, warnings) }
  } catch (error) {
    throw invalidBackup(error)
  }
}

export function validateBackup(input) {
  return decodeBackup(input).summary
}

export function currentBackupFormatVersion() {
  return CURRENT_FORMAT_VERSION
}
