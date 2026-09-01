import { calculateLedgerSummary } from './summary.mjs'
import { calculatePlanningCycleSummary, cycleBounds } from './planning.mjs'
import { projectHistory } from './history.mjs'
import { createSyntheticDataset, ValidationError, validateDataset } from '../validation.mjs'

export const SYNTHETIC_DEMO_VERSION = 1
export const SYNTHETIC_DEMO_REFERENCE_ON = '2026-08-15'

function createSyntheticDemoDataset() {
  const base = createSyntheticDataset()
  return validateDataset({
    ...base,
    exportedAt: '2026-08-15T12:00:00.000Z',
    entries: [
      ...base.entries,
      {
        id: 'synthetic-investment',
        type: 'investment',
        amountMinor: 1000000,
        occurredOn: '2026-08-07',
        status: 'active',
        note: 'Synthetic investment contribution',
      },
    ],
    commitments: base.commitments.map((commitment) => ({
      ...commitment,
      kind: 'saving',
      name: 'Synthetic month-end reserve',
      dueOn: '2026-08-31',
      linkedEntryIds: [],
    })),
  })
}

function getSyntheticDemoCycle(dataset, cycleKey) {
  let bounds
  try {
    bounds = cycleBounds(cycleKey)
  } catch (error) {
    throw new ValidationError('Invalid demo planning cycle', [error.message])
  }

  return (
    dataset.planningCycles.find((cycle) => cycle.cycleKey === cycleKey) ?? {
      id: cycleKey,
      cycleKey,
      ...bounds,
    }
  )
}

export function getSyntheticDemoWorkspace() {
  const dataset = createSyntheticDemoDataset()
  return {
    mode: 'synthetic',
    demoVersion: SYNTHETIC_DEMO_VERSION,
    referenceOn: SYNTHETIC_DEMO_REFERENCE_ON,
    dataset,
    summary: calculateLedgerSummary({ entries: dataset.entries, commitments: dataset.commitments }),
  }
}

export function getSyntheticDemoHistory(filters = {}) {
  const dataset = createSyntheticDemoDataset()
  try {
    return projectHistory({
      ...filters,
      referenceOn: SYNTHETIC_DEMO_REFERENCE_ON,
      entries: dataset.entries,
      balanceSnapshots: dataset.balanceSnapshots,
    })
  } catch (error) {
    if (error instanceof RangeError) throw new ValidationError('Invalid demo history filters', [error.message])
    throw error
  }
}

export function getSyntheticDemoPlanning(cycleKey = SYNTHETIC_DEMO_REFERENCE_ON.slice(0, 7)) {
  const dataset = createSyntheticDemoDataset()
  const cycle = getSyntheticDemoCycle(dataset, cycleKey)
  return {
    cycle: dataset.planningCycles.find((candidate) => candidate.cycleKey === cycleKey) ?? null,
    summary: calculatePlanningCycleSummary({
      cycle,
      entries: dataset.entries,
      commitments: dataset.commitments,
      evaluationOn: SYNTHETIC_DEMO_REFERENCE_ON,
    }),
  }
}
