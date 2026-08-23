import { calculateRemainingCommitmentMinor, signedEntryAmountMinor } from './calculations.mjs'

const ACTIVE_COMMITMENT_STATUSES = new Set(['planned', 'partially-settled'])

/**
 * @typedef {Object} PlanningCycle
 * @property {string} id
 * @property {string} cycleKey
 * @property {string} startOn
 * @property {string} endOn
 * @property {number} [expectedSalaryMinor]
 * @property {string} [expectedSalaryOn]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} PlanningCycleSummary
 * @property {number} openingActualMinor
 * @property {number} rolloverMinor
 * @property {number|null} expectedSalaryMinor
 * @property {number} actualSalaryMinor
 * @property {number|null} salaryVarianceMinor
 * @property {'unplanned'|'expected'|'missing'|'partial'|'received'} salaryStatus
 * @property {number} periodCreditsMinor
 * @property {number} periodDebitsMinor
 * @property {number} closingActualMinor
 * @property {number} reservedCommitmentMinor
 * @property {number} disposableBalanceMinor
 */

export function cycleBounds(cycleKey) {
  if (typeof cycleKey !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(cycleKey)) {
    throw new RangeError('cycleKey must identify a supported calendar month')
  }

  const [yearText, monthText] = cycleKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (year === 9999 && month === 12) throw new RangeError('cycleKey must have a representable following month')

  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return {
    startOn: `${yearText}-${monthText}-01`,
    endOn: `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-01`,
  }
}

export function localDateToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

function entriesInCycle(entries, cycle) {
  return entries.filter(
    (entry) => entry.status === 'active' && entry.occurredOn >= cycle.startOn && entry.occurredOn < cycle.endOn,
  )
}

function signedTotal(entries) {
  return entries.reduce((total, entry) => total + signedEntryAmountMinor(entry), 0)
}

function creditsTotal(entries) {
  return entries.reduce((total, entry) => {
    const signed = signedEntryAmountMinor(entry)
    return total + (signed > 0 ? signed : 0)
  }, 0)
}

function debitsTotal(entries) {
  return entries.reduce((total, entry) => {
    const signed = signedEntryAmountMinor(entry)
    return total + (signed < 0 ? Math.abs(signed) : 0)
  }, 0)
}

function salaryStatus({ expectedSalaryMinor, actualSalaryMinor, evaluationOn, endOn }) {
  if (expectedSalaryMinor === null) return 'unplanned'
  if (actualSalaryMinor >= expectedSalaryMinor) return 'received'
  if (actualSalaryMinor > 0) return 'partial'
  return evaluationOn >= endOn ? 'missing' : 'expected'
}

/**
 * Calculates a planning cycle from existing actual ledger and commitment facts.
 * The caller supplies evaluationOn when salary status needs an explicit as-of date.
 *
 * @param {{ cycle: PlanningCycle|{cycleKey:string,startOn:string,endOn:string}, entries: Object[], commitments: Object[], evaluationOn?: string }} input
 * @returns {PlanningCycleSummary}
 */
export function calculatePlanningCycleSummary({ cycle, entries, commitments, evaluationOn } = {}) {
  if (!cycle || typeof cycle !== 'object') throw new TypeError('cycle must be an object')
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array')
  if (!Array.isArray(commitments)) throw new TypeError('commitments must be an array')

  const effectiveEvaluationOn = evaluationOn ?? cycle.endOn

  const activeEntries = entries.filter((entry) => entry.status === 'active')
  const periodEntries = entriesInCycle(activeEntries, cycle)
  const openingEntries = activeEntries.filter((entry) => entry.occurredOn < cycle.startOn)
  const expectedSalaryMinor = cycle.expectedSalaryMinor ?? null
  const actualSalaryMinor = periodEntries
    .filter((entry) => entry.type === 'income')
    .reduce((total, entry) => total + entry.amountMinor, 0)
  const reservedCommitmentMinor = commitments
    .filter(
      (commitment) =>
        ACTIVE_COMMITMENT_STATUSES.has(commitment.status) &&
        commitment.dueOn >= cycle.startOn &&
        commitment.dueOn < cycle.endOn,
    )
    .reduce((total, commitment) => total + calculateRemainingCommitmentMinor(commitment, activeEntries), 0)
  const openingActualMinor = signedTotal(openingEntries)
  const periodCreditsMinor = creditsTotal(periodEntries)
  const periodDebitsMinor = debitsTotal(periodEntries)
  const closingActualMinor = openingActualMinor + periodCreditsMinor - periodDebitsMinor

  return {
    openingActualMinor,
    rolloverMinor: openingActualMinor,
    expectedSalaryMinor,
    actualSalaryMinor,
    salaryVarianceMinor: expectedSalaryMinor === null ? null : actualSalaryMinor - expectedSalaryMinor,
    salaryStatus: salaryStatus({
      expectedSalaryMinor,
      actualSalaryMinor,
      evaluationOn: effectiveEvaluationOn,
      endOn: cycle.endOn,
    }),
    periodCreditsMinor,
    periodDebitsMinor,
    closingActualMinor,
    reservedCommitmentMinor,
    disposableBalanceMinor: closingActualMinor - reservedCommitmentMinor,
  }
}
