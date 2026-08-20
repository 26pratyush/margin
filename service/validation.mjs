const COLLECTIONS = ['entries', 'categories', 'commitments', 'balanceSnapshots']

const ENTRY_TYPES = ['income', 'expense', 'investment', 'refund', 'adjustment']
const ENTRY_STATUSES = ['active', 'voided']
const COMMITMENT_KINDS = ['purchase', 'investment', 'bill', 'saving']
const COMMITMENT_STATUSES = ['planned', 'partially-settled', 'settled', 'cancelled']

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message)
    this.name = 'ValidationError'
    this.code = 'VALIDATION_ERROR'
    this.details = details
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConflictError'
    this.code = 'CONFLICT'
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertString(value, label, details, { nonEmpty = true } = {}) {
  if (typeof value !== 'string' || (nonEmpty && value.trim() === '')) {
    details.push(`${label} must be a non-empty string`)
  }
}

function assertInteger(value, label, details, { min = Number.MIN_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min) {
    details.push(`${label} must be an integer greater than or equal to ${min}`)
  }
}

function assertDate(value, label, details) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    details.push(`${label} must use YYYY-MM-DD format`)
    return
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    details.push(`${label} must be a real calendar date`)
  }
}

function assertId(record, collection, index, details) {
  assertString(record.id, `${collection}[${index}].id`, details)
}

export function validateRecord(collection, value, index = 0) {
  if (!COLLECTIONS.includes(collection)) {
    throw new ValidationError(`Unknown collection: ${collection}`)
  }

  const details = []
  if (!isRecord(value)) {
    throw new ValidationError(`${collection}[${index}] must be an object`)
  }

  assertId(value, collection, index, details)

  if (collection === 'entries') {
    if (!ENTRY_TYPES.includes(value.type)) details.push(`${collection}[${index}].type is invalid`)
    assertInteger(value.amountMinor, `${collection}[${index}].amountMinor`, details, { min: 1 })
    assertDate(value.occurredOn, `${collection}[${index}].occurredOn`, details)
    if (!ENTRY_STATUSES.includes(value.status)) details.push(`${collection}[${index}].status is invalid`)
    if (value.type === 'adjustment' && !['credit', 'debit'].includes(value.direction)) {
      details.push(`${collection}[${index}].direction must be credit or debit for an adjustment`)
    }
  }

  if (collection === 'categories') {
    assertString(value.name, `${collection}[${index}].name`, details)
  }

  if (collection === 'commitments') {
    if (!COMMITMENT_KINDS.includes(value.kind)) details.push(`${collection}[${index}].kind is invalid`)
    assertString(value.name, `${collection}[${index}].name`, details)
    assertInteger(value.plannedAmountMinor, `${collection}[${index}].plannedAmountMinor`, details, { min: 1 })
    assertDate(value.dueOn, `${collection}[${index}].dueOn`, details)
    if (!COMMITMENT_STATUSES.includes(value.status)) details.push(`${collection}[${index}].status is invalid`)
  }

  if (collection === 'balanceSnapshots') {
    assertDate(value.asOf, `${collection}[${index}].asOf`, details)
    assertInteger(value.calculatedActualBalanceMinor, `${collection}[${index}].calculatedActualBalanceMinor`, details)
    assertInteger(value.realBalanceMinor, `${collection}[${index}].realBalanceMinor`, details)
    assertInteger(value.differenceMinor, `${collection}[${index}].differenceMinor`, details)
    if (value.adjustmentEntryId !== undefined) assertString(value.adjustmentEntryId, `${collection}[${index}].adjustmentEntryId`, details)
  }

  if (details.length > 0) {
    throw new ValidationError(`Invalid ${collection} record`, details)
  }

  return value
}

export function validateDataset(value) {
  if (!isRecord(value)) throw new ValidationError('Backup must contain a JSON object')

  const details = []
  if (value.format !== 'margin-backup') details.push('format must be margin-backup')
  if (value.formatVersion !== 1) details.push('formatVersion must be 1')
  if (!Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1) details.push('schemaVersion must be a positive integer')
  if (typeof value.appVersion !== 'string' || value.appVersion.trim() === '') details.push('appVersion is required')
  if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)) details.push('currency must be a three-letter uppercase code')
  if (value.extensions !== undefined && !isRecord(value.extensions)) details.push('extensions must be an object')

  for (const collection of COLLECTIONS) {
    if (!Array.isArray(value[collection])) {
      details.push(`${collection} must be an array`)
      continue
    }

    const ids = new Set()
    value[collection].forEach((record, index) => {
      try {
        validateRecord(collection, record, index)
        if (ids.has(record.id)) details.push(`${collection} contains duplicate id ${record.id}`)
        ids.add(record.id)
      } catch (error) {
        if (error instanceof ValidationError) details.push(...error.details, error.message)
        else throw error
      }
    })
  }

  const categories = Array.isArray(value.categories) ? value.categories : []
  const commitments = Array.isArray(value.commitments) ? value.commitments : []
  const entries = Array.isArray(value.entries) ? value.entries : []
  const balanceSnapshots = Array.isArray(value.balanceSnapshots) ? value.balanceSnapshots : []
  const categoryIds = new Set(categories.filter(isRecord).map((record) => record.id))
  const commitmentIds = new Set(commitments.filter(isRecord).map((record) => record.id))
  const entryIds = new Set(entries.filter(isRecord).map((record) => record.id))
  entries.forEach((entry, index) => {
    if (!isRecord(entry)) return
    if (entry.categoryId !== undefined && !categoryIds.has(entry.categoryId)) details.push(`entries[${index}].categoryId does not reference a category`)
    if (entry.commitmentId !== undefined && !commitmentIds.has(entry.commitmentId)) details.push(`entries[${index}].commitmentId does not reference a commitment`)
    if (entry.refundOfId !== undefined && !entryIds.has(entry.refundOfId)) details.push(`entries[${index}].refundOfId does not reference an entry`)
    if (entry.replacesId !== undefined && !entryIds.has(entry.replacesId)) details.push(`entries[${index}].replacesId does not reference an entry`)
  })
  balanceSnapshots.forEach((snapshot, index) => {
    if (!isRecord(snapshot)) return
    if (snapshot.adjustmentEntryId !== undefined && !entryIds.has(snapshot.adjustmentEntryId)) details.push(`balanceSnapshots[${index}].adjustmentEntryId does not reference an entry`)
  })

  if (details.length > 0) throw new ValidationError('Dataset validation failed', details)

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    throw new ValidationError('Backup contains values that cannot be represented as JSON')
  }
}

export function createEmptyDataset() {
  return {
    format: 'margin-backup',
    formatVersion: 1,
    schemaVersion: 1,
    appVersion: '0.1.0',
    exportedAt: new Date().toISOString(),
    currency: 'INR',
    extensions: {},
    entries: [],
    categories: [],
    commitments: [],
    balanceSnapshots: [],
  }
}

export function createSyntheticDataset() {
  return validateDataset({
    ...createEmptyDataset(),
    exportedAt: '2026-08-01T00:00:00.000Z',
    entries: [
      {
        id: 'synthetic-salary',
        type: 'income',
        amountMinor: 10000000,
        occurredOn: '2026-08-01',
        status: 'active',
        source: 'Synthetic salary',
        note: 'Synthetic data only',
      },
      {
        id: 'synthetic-expense',
        type: 'expense',
        amountMinor: 125000,
        occurredOn: '2026-08-03',
        status: 'active',
        categoryId: 'synthetic-living',
        note: 'Synthetic data only',
      },
    ],
    categories: [
      { id: 'synthetic-living', name: 'Living', color: '#b4a58d' },
    ],
    commitments: [
      {
        id: 'synthetic-sip',
        kind: 'investment',
        name: 'Synthetic SIP',
        plannedAmountMinor: 3000000,
        dueOn: '2026-08-05',
        status: 'planned',
        linkedEntryIds: [],
      },
    ],
    balanceSnapshots: [],
  })
}

export function collectionNames() {
  return [...COLLECTIONS]
}
