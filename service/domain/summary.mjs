import { calculateActualBalanceMinor, calculateRemainingCommitmentMinor } from './calculations.mjs'

const ACTIVE_COMMITMENT_STATUSES = new Set(['planned', 'partially-settled'])

export function calculateLedgerSummary({ entries, commitments } = {}) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array')
  if (!Array.isArray(commitments)) throw new TypeError('commitments must be an array')

  const activeEntries = entries.filter((entry) => entry.status === 'active')
  const incomeMinor = activeEntries
    .filter((entry) => entry.type === 'income')
    .reduce((total, entry) => total + entry.amountMinor, 0)
  const expenseMinor = activeEntries
    .filter((entry) => entry.type === 'expense' && entry.direction !== 'credit')
    .reduce((total, entry) => total + entry.amountMinor, 0)
  const expenseCreditMinor = activeEntries
    .filter((entry) => entry.type === 'expense' && entry.direction === 'credit')
    .reduce((total, entry) => total + entry.amountMinor, 0)
  const refundMinor = activeEntries
    .filter((entry) => entry.type === 'refund')
    .reduce((total, entry) => total + entry.amountMinor, 0)
  const investmentMinor = activeEntries
    .filter((entry) => entry.type === 'investment')
    .reduce((total, entry) => total + entry.amountMinor, 0)
  const reservedCommitmentMinor = commitments
    .filter((commitment) => ACTIVE_COMMITMENT_STATUSES.has(commitment.status))
    .reduce((total, commitment) => total + calculateRemainingCommitmentMinor(commitment, activeEntries), 0)
  const actualBalanceMinor = calculateActualBalanceMinor(entries)

  return {
    incomeMinor,
    expenseMinor,
    expenseCreditMinor,
    refundMinor,
    investmentMinor,
    spendingMinor: expenseMinor + investmentMinor,
    actualBalanceMinor,
    reservedCommitmentMinor,
    disposableBalanceMinor: actualBalanceMinor - reservedCommitmentMinor,
    entryCount: entries.length,
    activeEntryCount: activeEntries.length,
  }
}
