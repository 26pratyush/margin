import { describe, expect, it } from 'vitest'
import { isValidCivilDate, lastDayOfMonth, parseAmountToMinor, parseSignedAmountToMinor, todayCivilDate } from './money'

describe('money input helpers', () => {
  it('parses rupee values into integer minor units', () => {
    expect(parseAmountToMinor('1,250.50')).toBe(125050)
    expect(parseAmountToMinor('42')).toBe(4200)
    expect(parseAmountToMinor('0.01')).toBe(1)
  })

  it('rejects blank, zero, negative, excessive, and over-precise values', () => {
    expect(parseAmountToMinor('')).toBeNull()
    expect(parseAmountToMinor('0')).toBeNull()
    expect(parseAmountToMinor('-1')).toBeNull()
    expect(parseAmountToMinor('12.345')).toBeNull()
    expect(parseAmountToMinor('999999999999999999')).toBeNull()
  })

  it('parses signed real balances while preserving zero and negative values', () => {
    expect(parseSignedAmountToMinor('1,250.50')).toBe(125050)
    expect(parseSignedAmountToMinor('0')).toBe(0)
    expect(parseSignedAmountToMinor('-125.50')).toBe(-12550)
    expect(parseSignedAmountToMinor('12.345')).toBeNull()
  })

  it('validates civil dates without applying a timezone offset', () => {
    expect(isValidCivilDate('2026-02-28')).toBe(true)
    expect(isValidCivilDate('2026-02-29')).toBe(false)
    expect(isValidCivilDate('2026-13-01')).toBe(false)
    expect(todayCivilDate(new Date(2026, 7, 21))).toBe('2026-08-21')
  })

  it('resolves the last civil day for short, long, leap, and year-ending months', () => {
    expect(lastDayOfMonth('2026-08-21')).toBe('2026-08-31')
    expect(lastDayOfMonth('2026-09-01')).toBe('2026-09-30')
    expect(lastDayOfMonth('2028-02-01')).toBe('2028-02-29')
    expect(lastDayOfMonth('2026-12-01')).toBe('2026-12-31')
  })
})
