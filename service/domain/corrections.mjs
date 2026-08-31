export const CORRECTABLE_ENTRY_TYPES = new Set(['income', 'expense'])

export const CORRECTION_FIELDS = new Set([
  'amountMinor',
  'occurredOn',
  'name',
  'categoryId',
  'source',
  'note',
  'direction',
])

const LIFECYCLE_FIELDS = new Set([
  'id',
  'status',
  'createdAt',
  'updatedAt',
  'voidedAt',
  'voidReason',
  'operationId',
  'replacesId',
  'replacedById',
])

export function applyEntryCorrectionPatch(entry, patch) {
  const next = { ...entry }
  for (const [field, value] of Object.entries(patch)) {
    if (value === null) delete next[field]
    else next[field] = value
  }
  return next
}

export function createReplacementEntry(original, patch, { id, timestamp, operationId } = {}) {
  if (!id || !timestamp || !operationId) throw new TypeError('id, timestamp, and operationId are required')

  const corrected = applyEntryCorrectionPatch(original, patch)
  for (const field of LIFECYCLE_FIELDS) delete corrected[field]

  return {
    ...corrected,
    id,
    type: original.type,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    operationId,
    replacesId: original.id,
  }
}

export function snapshotIsAffected(snapshot, entry) {
  return entry.occurredOn <= snapshot.asOf
}

export function comparableOperationRecord(record) {
  const comparable = { ...record }
  for (const field of [
    'id',
    'status',
    'createdAt',
    'updatedAt',
    'voidedAt',
    'voidReason',
    'operationId',
    'replacedById',
  ]) {
    delete comparable[field]
  }
  return comparable
}
