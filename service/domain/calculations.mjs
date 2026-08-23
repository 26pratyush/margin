export function signedEntryAmountMinor(entry) {
  switch (entry.type) {
    case 'income':
    case 'refund':
      return entry.amountMinor
    case 'expense':
    case 'investment':
      return -entry.amountMinor
    case 'adjustment':
      if (entry.direction === 'credit') return entry.amountMinor
      if (entry.direction === 'debit') return -entry.amountMinor
      throw new RangeError(`Unsupported adjustment direction: ${String(entry.direction)}`)
    default:
      throw new RangeError(`Unsupported entry type: ${String(entry.type)}`)
  }
}

export function calculateActualBalanceMinor(entries) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array')

  return entries
    .filter((entry) => entry.status === 'active')
    .reduce((total, entry) => total + signedEntryAmountMinor(entry), 0)
}

export function calculateRemainingCommitmentMinor(commitment, entries) {
  if (!commitment || typeof commitment !== 'object') throw new TypeError('commitment must be an object')
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array')

  const linkedEntryIds = new Set(Array.isArray(commitment.linkedEntryIds) ? commitment.linkedEntryIds : [])
  const settledMinor = entries
    .filter(
      (entry) =>
        entry.status === 'active' &&
        ['expense', 'investment'].includes(entry.type) &&
        (entry.commitmentId === commitment.id || linkedEntryIds.has(entry.id)),
    )
    .reduce((total, entry) => total + entry.amountMinor, 0)

  return Math.max(commitment.plannedAmountMinor - settledMinor, 0)
}
