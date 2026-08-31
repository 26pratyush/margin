import { cycleBounds } from './domain/planning.mjs'
import { CORRECTION_FIELDS } from './domain/corrections.mjs'

const COLLECTIONS = ['entries', 'categories', 'commitments', 'balanceSnapshots', 'planningCycles']
export const CURRENT_SCHEMA_VERSION = 3

const ENTRY_TYPES = ['income', 'expense', 'investment', 'refund', 'adjustment']
const ENTRY_DIRECTIONS = ['credit', 'debit']
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
  constructor(message, code = 'CONFLICT', details = []) {
    super(message)
    this.name = 'ConflictError'
    this.code = code
    this.details = details
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.code = 'NOT_FOUND'
    this.statusCode = 404
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

function assertOptionalString(value, label, details) {
  if (value !== undefined && typeof value !== 'string') details.push(`${label} must be a string when provided`)
}

function assertOptionalNonEmptyString(value, label, details) {
  if (value !== undefined && (typeof value !== 'string' || value.trim() === '')) {
    details.push(`${label} must be a non-empty string when provided`)
  }
}

function assertTimestamp(value, label, details) {
  const isTimestamp = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  if (!isTimestamp || Number.isNaN(Date.parse(value))) {
    details.push(`${label} must be a valid ISO timestamp`)
    return
  }

  const parsed = new Date(value)
  const normalized = value.includes('.') ? parsed.toISOString() : `${parsed.toISOString().slice(0, 19)}Z`
  if (normalized !== value) {
    details.push(`${label} must be a real calendar timestamp`)
  }
}

function validateExpectedSalaryFields(value, label, details, { requireSalaryForDate = true } = {}) {
  if (value.expectedSalaryMinor !== undefined)
    assertInteger(value.expectedSalaryMinor, `${label}.expectedSalaryMinor`, details, { min: 1 })
  if (value.expectedSalaryOn !== undefined) assertDate(value.expectedSalaryOn, `${label}.expectedSalaryOn`, details)
  if (requireSalaryForDate && value.expectedSalaryOn !== undefined && value.expectedSalaryMinor === undefined) {
    details.push(`${label}.expectedSalaryOn requires expectedSalaryMinor`)
  }
}

export function validatePlanningCycleInput(value) {
  if (!isRecord(value)) throw new ValidationError('Planning cycle input must be an object')

  const details = []
  assertString(value.cycleKey, 'cycleKey', details)
  let bounds
  try {
    bounds = cycleBounds(value.cycleKey)
  } catch {
    bounds = null
  }
  if (!bounds) details.push('cycleKey must identify a supported calendar month')
  validateExpectedSalaryFields(value, 'planning cycle', details)
  if (value.expectedSalaryOn !== undefined && bounds) {
    if (value.expectedSalaryOn < bounds.startOn || value.expectedSalaryOn >= bounds.endOn) {
      details.push('planning cycle expectedSalaryOn must fall within the cycle')
    }
  }

  const allowedKeys = new Set(['cycleKey', 'expectedSalaryMinor', 'expectedSalaryOn'])
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) details.push(`planning cycle field ${key} is not writable`)
  }

  if (details.length > 0) throw new ValidationError('Invalid planning cycle input', details)

  return {
    cycleKey: value.cycleKey,
    ...(value.expectedSalaryMinor !== undefined ? { expectedSalaryMinor: value.expectedSalaryMinor } : {}),
    ...(value.expectedSalaryOn !== undefined ? { expectedSalaryOn: value.expectedSalaryOn } : {}),
  }
}

export function validatePlanningCyclePatch(value) {
  if (!isRecord(value)) throw new ValidationError('Planning cycle update must be an object')

  const details = []
  validateExpectedSalaryFields(value, 'planning cycle', details, { requireSalaryForDate: false })
  const allowedKeys = new Set(['expectedSalaryMinor', 'expectedSalaryOn'])
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) details.push(`planning cycle field ${key} is not writable during update`)
  }
  if (details.length > 0) throw new ValidationError('Invalid planning cycle update', details)

  return {
    ...(value.expectedSalaryMinor !== undefined ? { expectedSalaryMinor: value.expectedSalaryMinor } : {}),
    ...(value.expectedSalaryOn !== undefined ? { expectedSalaryOn: value.expectedSalaryOn } : {}),
  }
}

export function validateTransactionInput(value) {
  const details = []
  if (!isRecord(value)) throw new ValidationError('Transaction input must be an object')

  if (!['income', 'expense'].includes(value.type)) details.push('type must be income or expense')
  assertInteger(value.amountMinor, 'amountMinor', details, { min: 1 })
  assertDate(value.occurredOn, 'occurredOn', details)
  assertOptionalString(value.name, 'name', details)
  assertOptionalString(value.categoryName, 'categoryName', details)
  assertOptionalString(value.source, 'source', details)
  assertOptionalString(value.note, 'note', details)

  if (value.type === 'expense' && value.direction !== undefined && !ENTRY_DIRECTIONS.includes(value.direction)) {
    details.push('direction must be credit or debit for an expense')
  }
  if (value.type !== 'expense' && value.direction !== undefined) {
    details.push('direction is only supported for expenses')
  }
  if (value.type === 'income' && value.name !== undefined) details.push('name is only supported for expenses')
  if (value.type === 'income' && value.categoryName !== undefined)
    details.push('categoryName is only supported for expenses')

  if (details.length > 0) throw new ValidationError('Invalid transaction input', details)

  return {
    type: value.type,
    amountMinor: value.amountMinor,
    occurredOn: value.occurredOn,
    ...(value.type === 'expense' ? { direction: value.direction ?? 'debit' } : {}),
    name: value.name?.trim() || undefined,
    categoryName: value.categoryName?.trim() || undefined,
    source: value.source?.trim() || undefined,
    note: value.note?.trim() || undefined,
  }
}

export function validateReconciliationInput(value) {
  if (!isRecord(value)) throw new ValidationError('Reconciliation input must be an object')

  const details = []
  assertDate(value.asOf, 'asOf', details)
  assertInteger(value.realBalanceMinor, 'realBalanceMinor', details)
  assertOptionalString(value.note, 'note', details)
  const allowedKeys = new Set(['asOf', 'realBalanceMinor', 'note'])
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) details.push(`${key} is not writable for a reconciliation command`)
  }

  if (details.length > 0) throw new ValidationError('Invalid reconciliation input', details)

  return {
    asOf: value.asOf,
    realBalanceMinor: value.realBalanceMinor,
    ...(value.note?.trim() ? { note: value.note.trim() } : {}),
  }
}

export function validateEntryCorrectionInput(value) {
  if (!isRecord(value)) throw new ValidationError('Entry correction input must be an object')

  const details = []
  const patch = isRecord(value.patch) ? value.patch : {}
  assertString(value.operationId, 'operationId', details)
  assertTimestamp(value.expectedUpdatedAt, 'expectedUpdatedAt', details)
  const allowedKeys = new Set(['operationId', 'expectedUpdatedAt', 'patch'])
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) details.push(`${key} is not writable for an entry correction command`)
  }
  if (!isRecord(value.patch)) {
    details.push('patch must be an object')
  } else {
    if (Object.keys(patch).length === 0) details.push('patch must contain at least one writable field')
    for (const [field, fieldValue] of Object.entries(patch)) {
      if (!CORRECTION_FIELDS.has(field)) {
        details.push(`patch.${field} is not writable`)
        continue
      }
      if (field === 'amountMinor') assertInteger(fieldValue, 'patch.amountMinor', details, { min: 1 })
      if (field === 'occurredOn') assertDate(fieldValue, 'patch.occurredOn', details)
      if (field === 'direction' && !ENTRY_DIRECTIONS.includes(fieldValue)) {
        details.push('patch.direction must be credit or debit')
      }
      if (['name', 'categoryId', 'source', 'note'].includes(field)) {
        if (fieldValue !== null && (typeof fieldValue !== 'string' || fieldValue.trim() === '')) {
          details.push(`patch.${field} must be a non-empty string or null`)
        }
      }
    }
  }

  if (details.length > 0) throw new ValidationError('Invalid entry correction input', details)

  return {
    operationId: value.operationId.trim(),
    expectedUpdatedAt: value.expectedUpdatedAt,
    patch: Object.fromEntries(
      Object.entries(patch).map(([field, fieldValue]) => [
        field,
        typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue,
      ]),
    ),
  }
}

export function validateEntryCorrectionPatch(entry, patch) {
  if (!isRecord(entry)) throw new ValidationError('Entry must be an object')
  const details = []
  if (entry.type === 'income') {
    if (patch.name !== undefined) details.push('patch.name is not supported for income entries')
    if (patch.categoryId !== undefined) details.push('patch.categoryId is not supported for income entries')
  }
  if (entry.type === 'expense' && patch.source !== undefined) {
    details.push('patch.source is not supported for expense entries')
  }
  if (entry.type !== 'expense' && patch.direction !== undefined) {
    details.push('patch.direction is only supported for expense entries')
  }
  if (details.length > 0) throw new ValidationError('Invalid entry correction patch', details)
  return patch
}

export function validateEntryVoidInput(value) {
  if (!isRecord(value)) throw new ValidationError('Entry void input must be an object')

  const details = []
  assertString(value.operationId, 'operationId', details)
  assertTimestamp(value.expectedUpdatedAt, 'expectedUpdatedAt', details)
  assertString(value.reason, 'reason', details)
  const allowedKeys = new Set(['operationId', 'expectedUpdatedAt', 'reason'])
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) details.push(`${key} is not writable for an entry void command`)
  }
  if (details.length > 0) throw new ValidationError('Invalid entry void input', details)

  return {
    operationId: value.operationId.trim(),
    expectedUpdatedAt: value.expectedUpdatedAt,
    reason: value.reason.trim(),
  }
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
    assertOptionalString(value.name, `${collection}[${index}].name`, details)
    assertOptionalNonEmptyString(value.categoryId, `${collection}[${index}].categoryId`, details)
    assertOptionalNonEmptyString(value.commitmentId, `${collection}[${index}].commitmentId`, details)
    assertOptionalNonEmptyString(value.refundOfId, `${collection}[${index}].refundOfId`, details)
    assertOptionalNonEmptyString(value.replacesId, `${collection}[${index}].replacesId`, details)
    assertOptionalNonEmptyString(value.replacedById, `${collection}[${index}].replacedById`, details)
    assertOptionalString(value.source, `${collection}[${index}].source`, details)
    assertOptionalString(value.note, `${collection}[${index}].note`, details)
    if (value.type === 'expense' && value.direction !== undefined && !ENTRY_DIRECTIONS.includes(value.direction)) {
      details.push(`${collection}[${index}].direction must be credit or debit for an expense`)
    }
    if (value.type !== 'expense' && value.type !== 'adjustment' && value.direction !== undefined) {
      details.push(`${collection}[${index}].direction is only supported for expenses and adjustments`)
    }
    assertOptionalNonEmptyString(value.operationId, `${collection}[${index}].operationId`, details)
    assertOptionalNonEmptyString(value.voidReason, `${collection}[${index}].voidReason`, details)
    if (value.createdAt !== undefined) assertTimestamp(value.createdAt, `${collection}[${index}].createdAt`, details)
    if (value.updatedAt !== undefined) assertTimestamp(value.updatedAt, `${collection}[${index}].updatedAt`, details)
    if (value.voidedAt !== undefined) assertTimestamp(value.voidedAt, `${collection}[${index}].voidedAt`, details)
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
    if (value.linkedEntryIds !== undefined) {
      if (!Array.isArray(value.linkedEntryIds)) details.push(`${collection}[${index}].linkedEntryIds must be an array`)
      else
        value.linkedEntryIds.forEach((id, linkedIndex) =>
          assertString(id, `${collection}[${index}].linkedEntryIds[${linkedIndex}]`, details),
        )
    }
  }

  if (collection === 'balanceSnapshots') {
    assertDate(value.asOf, `${collection}[${index}].asOf`, details)
    if (value.createdAt !== undefined) assertTimestamp(value.createdAt, `${collection}[${index}].createdAt`, details)
    assertInteger(value.calculatedActualBalanceMinor, `${collection}[${index}].calculatedActualBalanceMinor`, details)
    assertInteger(value.realBalanceMinor, `${collection}[${index}].realBalanceMinor`, details)
    assertInteger(value.differenceMinor, `${collection}[${index}].differenceMinor`, details)
    if (value.adjustmentEntryId !== undefined)
      assertString(value.adjustmentEntryId, `${collection}[${index}].adjustmentEntryId`, details)
    if (value.reviewState !== undefined && !['current', 'needs-review'].includes(value.reviewState)) {
      details.push(`${collection}[${index}].reviewState is invalid`)
    }
  }

  if (collection === 'planningCycles') {
    assertString(value.cycleKey, `${collection}[${index}].cycleKey`, details)
    let bounds
    try {
      bounds = cycleBounds(value.cycleKey)
    } catch {
      bounds = null
    }
    if (!bounds) {
      details.push(`${collection}[${index}].cycleKey must identify a supported calendar month`)
    } else {
      if (value.id !== value.cycleKey) details.push(`${collection}[${index}].id must match cycleKey`)
      if (value.startOn !== bounds.startOn) details.push(`${collection}[${index}].startOn must match cycleKey`)
      if (value.endOn !== bounds.endOn) details.push(`${collection}[${index}].endOn must match cycleKey`)
    }
    validateExpectedSalaryFields(value, `${collection}[${index}]`, details)
    if (value.expectedSalaryOn !== undefined && bounds) {
      if (value.expectedSalaryOn < bounds.startOn || value.expectedSalaryOn >= bounds.endOn) {
        details.push(`${collection}[${index}].expectedSalaryOn must fall within the cycle`)
      }
    }
    assertTimestamp(value.createdAt, `${collection}[${index}].createdAt`, details)
    assertTimestamp(value.updatedAt, `${collection}[${index}].updatedAt`, details)
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
  if (!Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1)
    details.push('schemaVersion must be a positive integer')
  if (typeof value.appVersion !== 'string' || value.appVersion.trim() === '') details.push('appVersion is required')
  if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency))
    details.push('currency must be a three-letter uppercase code')
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
  const entryById = new Map(entries.filter(isRecord).map((record) => [record.id, record]))
  const replacementReferences = new Map()
  const operationRecords = new Map()
  entries.forEach((entry, index) => {
    if (!isRecord(entry)) return
    if (entry.categoryId !== undefined && !categoryIds.has(entry.categoryId))
      details.push(`entries[${index}].categoryId does not reference a category`)
    if (entry.commitmentId !== undefined && !commitmentIds.has(entry.commitmentId))
      details.push(`entries[${index}].commitmentId does not reference a commitment`)
    if (entry.refundOfId !== undefined && !entryIds.has(entry.refundOfId))
      details.push(`entries[${index}].refundOfId does not reference an entry`)
    if (entry.replacesId !== undefined && !entryIds.has(entry.replacesId))
      details.push(`entries[${index}].replacesId does not reference an entry`)
    if (entry.replacedById !== undefined && !entryIds.has(entry.replacedById))
      details.push(`entries[${index}].replacedById does not reference an entry`)
    if (entry.operationId) {
      const records = operationRecords.get(entry.operationId) ?? []
      records.push(entry)
      operationRecords.set(entry.operationId, records)
    }
    if (entry.replacesId && entryIds.has(entry.replacesId)) {
      const source = entryById.get(entry.replacesId)
      if (source.type !== entry.type)
        details.push(`entries[${index}].replacesId must reference an entry of the same type`)
      if (source.status !== 'voided') details.push(`entries[${index}].replacesId must reference a voided entry`)
      if (source.replacedById !== entry.id)
        details.push(`entries[${index}].replacesId is not the source entry's replacement`)
      replacementReferences.set(entry.replacesId, (replacementReferences.get(entry.replacesId) ?? 0) + 1)
    }
    if (entry.replacedById && entryIds.has(entry.replacedById)) {
      const replacement = entryById.get(entry.replacedById)
      if (replacement.type !== entry.type)
        details.push(`entries[${index}].replacedById must reference an entry of the same type`)
      if (replacement.replacesId !== entry.id)
        details.push(`entries[${index}].replacedById is not the replacement's source entry`)
    }
  })
  for (const [sourceId, referenceCount] of replacementReferences) {
    if (referenceCount > 1) details.push(`entries contains multiple direct replacements for ${sourceId}`)
  }
  for (const entry of entries.filter(isRecord)) {
    const visited = new Set()
    let current = entry
    while (current?.replacesId) {
      if (visited.has(current.id)) {
        details.push(`entries replacement lineage contains a cycle at ${entry.id}`)
        break
      }
      visited.add(current.id)
      current = entryById.get(current.replacesId)
    }
  }
  for (const [operationId, records] of operationRecords) {
    if (records.length > 2) details.push(`operationId ${operationId} is persisted on too many entries`)
    if (records.length === 2) {
      const [first, second] = records
      const isPair =
        (first.replacedById === second.id && second.replacesId === first.id) ||
        (second.replacedById === first.id && first.replacesId === second.id)
      if (!isPair) details.push(`operationId ${operationId} must identify one correction pair`)
    }
  }
  commitments.forEach((commitment, index) => {
    if (!Array.isArray(commitment.linkedEntryIds)) return
    for (const entryId of commitment.linkedEntryIds) {
      if (!entryIds.has(entryId)) details.push(`commitments[${index}].linkedEntryIds does not reference an entry`)
    }
  })
  balanceSnapshots.forEach((snapshot, index) => {
    if (!isRecord(snapshot)) return
    if (snapshot.adjustmentEntryId !== undefined && !entryIds.has(snapshot.adjustmentEntryId))
      details.push(`balanceSnapshots[${index}].adjustmentEntryId does not reference an entry`)
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
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: '0.1.0',
    exportedAt: new Date().toISOString(),
    currency: 'INR',
    extensions: {},
    entries: [],
    categories: [],
    commitments: [],
    balanceSnapshots: [],
    planningCycles: [],
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
    categories: [{ id: 'synthetic-living', name: 'Living', color: '#b4a58d' }],
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
    planningCycles: [
      {
        id: '2026-08',
        cycleKey: '2026-08',
        startOn: '2026-08-01',
        endOn: '2026-09-01',
        expectedSalaryMinor: 10000000,
        expectedSalaryOn: '2026-08-01',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  })
}

export function collectionNames() {
  return [...COLLECTIONS]
}
