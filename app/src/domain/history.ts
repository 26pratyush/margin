import { isValidCivilDate, todayCivilDate } from './money'

export type HistoryPeriod = 'all' | 'today' | 'this-week' | 'this-month' | 'custom'
export type HistoryType = 'all' | 'income' | 'expense' | 'balance-sync'
export type HistoryStatus = 'active' | 'voided' | 'all'

export type HistoryEntry = {
  id: string
  type: 'income' | 'expense' | 'investment' | 'refund' | 'adjustment'
  amountMinor: number
  occurredOn: string
  status: 'active' | 'voided'
  createdAt?: string
  updatedAt?: string
  name?: string
  note?: string
  source?: string
  categoryId?: string
  commitmentId?: string
  refundOfId?: string
  replacesId?: string
  replacedById?: string
  voidedAt?: string
  voidReason?: string
  operationId?: string
  direction?: 'credit' | 'debit'
  adjustmentReason?: string
}

export type HistorySnapshot = {
  id: string
  asOf: string
  createdAt?: string
  calculatedActualBalanceMinor: number
  realBalanceMinor: number
  differenceMinor: number
  adjustmentEntryId?: string
  note?: string
  reviewState?: 'current' | 'needs-review'
}

export type HistoryItem =
  | { kind: 'entry'; entry: HistoryEntry }
  | { kind: 'balance-sync'; snapshot: HistorySnapshot; adjustment?: HistoryEntry }

export type HistoryQuery = {
  period: HistoryPeriod
  type: HistoryType
  status: HistoryStatus
  startOn?: string
  endOn?: string
}

export type HistoryResponse = {
  range: { period: HistoryPeriod; startOn: string | null; endOn: string | null }
  filters: { period: HistoryPeriod; type: HistoryType; status: HistoryStatus }
  items: HistoryItem[]
  summary: {
    visibleCount: number
    activeCount: number
    voidedCount: number
    syncCount: number
    creditsMinor: number
    debitsMinor: number
    netMovementMinor: number
  }
}

function parseCivilDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(0)
  parsed.setUTCFullYear(year, month - 1, day)
  parsed.setUTCHours(0, 0, 0, 0)
  return parsed
}

export function addCivilDays(value: string, amount: number) {
  if (!isValidCivilDate(value)) throw new RangeError('date must be a real calendar date')
  const parsed = parseCivilDate(value)
  parsed.setUTCDate(parsed.getUTCDate() + amount)
  return parsed.toISOString().slice(0, 10)
}

export function customRangeEndExclusive(endOnInclusive: string) {
  return addCivilDays(endOnInclusive, 1)
}

export function validateCustomRange(startOn: string, endOnInclusive: string) {
  if (!isValidCivilDate(startOn) || !isValidCivilDate(endOnInclusive)) {
    return 'Choose real calendar dates for the custom range.'
  }
  if (startOn > endOnInclusive) return 'The start date must be on or before the end date.'
  return null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseCivilDate(value))
}

export function historyItemDate(item: HistoryItem) {
  return item.kind === 'balance-sync' ? item.snapshot.asOf : item.entry.occurredOn
}

export function formatHistoryDay(value: string, referenceOn = todayCivilDate()) {
  if (value === referenceOn) return 'Today'
  if (value === addCivilDays(referenceOn, -1)) return 'Yesterday'
  return formatDate(value)
}

export function groupHistoryItems(items: HistoryItem[]) {
  const groups: Array<{ date: string; items: HistoryItem[] }> = []
  for (const item of items) {
    const date = historyItemDate(item)
    const current = groups.at(-1)
    if (current?.date === date) current.items.push(item)
    else groups.push({ date, items: [item] })
  }
  return groups
}
