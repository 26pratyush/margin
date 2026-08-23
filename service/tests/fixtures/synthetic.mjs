import { createEmptyDataset, validateDataset } from '../../validation.mjs'

export function syntheticEntry(overrides = {}) {
  return {
    id: 'synthetic-entry',
    type: 'expense',
    amountMinor: 100,
    occurredOn: '2026-08-20',
    status: 'active',
    ...overrides,
  }
}

export function syntheticDataset({
  entries = [],
  categories = [],
  commitments = [],
  balanceSnapshots = [],
  planningCycles = [],
} = {}) {
  return validateDataset({
    ...createEmptyDataset(),
    entries,
    categories,
    commitments,
    balanceSnapshots,
    planningCycles,
  })
}
