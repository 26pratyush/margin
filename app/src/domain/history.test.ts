import { describe, expect, it } from 'vitest'
import {
  addCivilDays,
  customRangeEndExclusive,
  formatHistoryDay,
  groupHistoryItems,
  validateCustomRange,
} from './history'

describe('history presentation helpers', () => {
  it('converts an inclusive custom end date without a timezone shift', () => {
    expect(customRangeEndExclusive('2026-12-31')).toBe('2027-01-01')
    expect(addCivilDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('validates custom ranges at calendar-day precision', () => {
    expect(validateCustomRange('2026-08-01', '2026-08-31')).toBeNull()
    expect(validateCustomRange('2026-08-31', '2026-08-01')).toMatch(/on or before/i)
    expect(validateCustomRange('2026-02-29', '2026-03-01')).toMatch(/real calendar dates/i)
  })

  it('labels relative days and preserves the supplied group order', () => {
    expect(formatHistoryDay('2026-08-30', '2026-08-30')).toBe('Today')
    expect(formatHistoryDay('2026-08-29', '2026-08-30')).toBe('Yesterday')

    const items = [
      {
        kind: 'entry' as const,
        entry: {
          id: 'today',
          type: 'expense' as const,
          amountMinor: 1,
          occurredOn: '2026-08-30',
          status: 'active' as const,
        },
      },
      {
        kind: 'entry' as const,
        entry: {
          id: 'yesterday',
          type: 'expense' as const,
          amountMinor: 1,
          occurredOn: '2026-08-29',
          status: 'active' as const,
        },
      },
      {
        kind: 'balance-sync' as const,
        snapshot: {
          id: 'sync',
          asOf: '2026-08-29',
          calculatedActualBalanceMinor: 1,
          realBalanceMinor: 1,
          differenceMinor: 0,
        },
      },
    ]
    expect(groupHistoryItems(items).map((group) => [group.date, group.items.length])).toEqual([
      ['2026-08-30', 1],
      ['2026-08-29', 2],
    ])
  })
})
