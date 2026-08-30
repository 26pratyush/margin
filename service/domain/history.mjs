import { signedEntryAmountMinor } from './calculations.mjs'
import { localDateToday } from './planning.mjs'

export const HISTORY_PERIODS = new Set(['all', 'today', 'this-week', 'this-month', 'custom'])
export const HISTORY_TYPES = new Set(['all', 'income', 'expense', 'balance-sync'])
export const HISTORY_STATUSES = new Set(['active', 'voided', 'all'])

function civilDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`${label} must use YYYY-MM-DD format`)
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`${label} must be a real calendar date`)
  }

  return parsed
}

export function addCivilDays(value, amount) {
  const parsed = civilDate(value, 'date')
  parsed.setUTCDate(parsed.getUTCDate() + amount)
  return parsed.toISOString().slice(0, 10)
}

function monthStart(value) {
  return `${value.slice(0, 7)}-01`
}

function nextMonthStart(value) {
  const parsed = civilDate(value, 'date')
  parsed.setUTCDate(1)
  parsed.setUTCMonth(parsed.getUTCMonth() + 1)
  return parsed.toISOString().slice(0, 10)
}

function mondayOfWeek(value) {
  const parsed = civilDate(value, 'date')
  const day = parsed.getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  return addCivilDays(value, -daysSinceMonday)
}

function assertRange(startOn, endOn) {
  if (startOn >= endOn) throw new RangeError('History range must include at least one day')
  return { startOn, endOn }
}

export function resolveHistoryRange({ period = 'this-month', startOn, endOn, referenceOn = localDateToday() } = {}) {
  if (!HISTORY_PERIODS.has(period)) throw new RangeError(`Unsupported history period: ${String(period)}`)
  const referenceDate = civilDate(referenceOn, 'referenceOn')
  const reference = referenceDate.toISOString().slice(0, 10)

  if (period === 'all') return { period, startOn: null, endOn: null }
  if (period === 'today') return { period, startOn: reference, endOn: addCivilDays(reference, 1) }
  if (period === 'this-week') {
    const start = mondayOfWeek(reference)
    return { period, startOn: start, endOn: addCivilDays(start, 7) }
  }
  if (period === 'this-month') {
    const start = monthStart(reference)
    return { period, startOn: start, endOn: nextMonthStart(start) }
  }

  if (startOn === undefined || endOn === undefined) {
    throw new RangeError('Custom history ranges require startOn and endOn')
  }
  civilDate(startOn, 'startOn')
  civilDate(endOn, 'endOn')
  return { period, ...assertRange(startOn, endOn) }
}

function entryMatchesStatus(entry, status) {
  return status === 'all' || entry.status === status
}

function entryMatchesPeriod(entry, range) {
  return (
    (range.startOn === null || entry.occurredOn >= range.startOn) &&
    (range.endOn === null || entry.occurredOn < range.endOn)
  )
}

function snapshotMatchesPeriod(snapshot, range) {
  return (
    (range.startOn === null || snapshot.asOf >= range.startOn) && (range.endOn === null || snapshot.asOf < range.endOn)
  )
}

function entryMatchesType(entry, type) {
  if (type === 'all') return true
  if (type === 'balance-sync') return false
  return entry.type === type
}

function itemDate(item) {
  return item.kind === 'balance-sync' ? item.snapshot.asOf : item.entry.occurredOn
}

function itemTimestamp(item) {
  if (item.kind === 'balance-sync') return item.adjustment?.createdAt ?? item.snapshot.id
  return item.entry.createdAt ?? item.entry.updatedAt ?? item.entry.id
}

function compareHistoryItems(left, right) {
  return (
    itemDate(right).localeCompare(itemDate(left)) ||
    itemTimestamp(right).localeCompare(itemTimestamp(left)) ||
    (right.kind === 'balance-sync' ? right.snapshot.id : right.entry.id).localeCompare(
      left.kind === 'balance-sync' ? left.snapshot.id : left.entry.id,
    )
  )
}

function addTotals(total, entry) {
  const signedAmountMinor = signedEntryAmountMinor(entry)
  if (signedAmountMinor >= 0) total.creditsMinor += signedAmountMinor
  else total.debitsMinor += Math.abs(signedAmountMinor)
}

function summaryFor(items, entries) {
  const activeEntries = entries.filter((entry) => entry.status === 'active')
  const totals = { creditsMinor: 0, debitsMinor: 0 }
  activeEntries.forEach((entry) => addTotals(totals, entry))
  return {
    visibleCount: items.length,
    activeCount: activeEntries.length,
    voidedCount: entries.filter((entry) => entry.status === 'voided').length,
    syncCount: items.filter((item) => item.kind === 'balance-sync').length,
    creditsMinor: totals.creditsMinor,
    debitsMinor: totals.debitsMinor,
    netMovementMinor: totals.creditsMinor - totals.debitsMinor,
  }
}

/**
 * Projects local entries and reconciliation snapshots into a read-only history view.
 * The returned movement totals intentionally describe period movement, never actual or disposable balance.
 */
export function projectHistory({
  entries,
  balanceSnapshots = [],
  period = 'this-month',
  type = 'all',
  status = 'active',
  startOn,
  endOn,
  referenceOn,
} = {}) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array')
  if (!Array.isArray(balanceSnapshots)) throw new TypeError('balanceSnapshots must be an array')
  if (!HISTORY_TYPES.has(type)) throw new RangeError(`Unsupported history type: ${String(type)}`)
  if (!HISTORY_STATUSES.has(status)) throw new RangeError(`Unsupported history status: ${String(status)}`)

  const range = resolveHistoryRange({ period, startOn, endOn, referenceOn })
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]))
  const syncSnapshots = balanceSnapshots.filter(
    (snapshot) =>
      snapshotMatchesPeriod(snapshot, range) && type !== 'income' && type !== 'expense' && status !== 'voided',
  )
  const syncEntryIds = new Set(
    balanceSnapshots.map((snapshot) => snapshot.adjustmentEntryId).filter((entryId) => typeof entryId === 'string'),
  )
  const ordinaryEntries = entries.filter(
    (entry) =>
      !syncEntryIds.has(entry.id) &&
      entryMatchesPeriod(entry, range) &&
      entryMatchesType(entry, type) &&
      entryMatchesStatus(entry, status),
  )
  const syncEntries = syncSnapshots
    .map((snapshot) => entriesById.get(snapshot.adjustmentEntryId))
    .filter((entry) => entry !== undefined && entryMatchesStatus(entry, status))
  const selectedEntries = [...ordinaryEntries, ...syncEntries]
  const items = [
    ...ordinaryEntries.map((entry) => ({ kind: 'entry', entry })),
    ...syncSnapshots.map((snapshot) => ({
      kind: 'balance-sync',
      snapshot,
      ...(snapshot.adjustmentEntryId && entriesById.has(snapshot.adjustmentEntryId)
        ? { adjustment: entriesById.get(snapshot.adjustmentEntryId) }
        : {}),
    })),
  ].sort(compareHistoryItems)

  return {
    range,
    filters: { period, type, status },
    items,
    summary: summaryFor(items, selectedEntries),
  }
}
