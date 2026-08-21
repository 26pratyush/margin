import { describe, expect, it } from 'vitest'
import { isValidCivilDate, parseAmountToMinor, todayCivilDate } from './money'

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

  it('validates civil dates without applying a timezone offset', () => {
    expect(isValidCivilDate('2026-02-28')).toBe(true)
    expect(isValidCivilDate('2026-02-29')).toBe(false)
    expect(isValidCivilDate('2026-13-01')).toBe(false)
    expect(todayCivilDate(new Date(2026, 7, 21))).toBe('2026-08-21')
  })
})
