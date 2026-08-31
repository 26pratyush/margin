export function parseAmountToMinor(value: string): number | null {
  const amountMinor = parseSignedAmountToMinor(value)
  return amountMinor === null || amountMinor < 1 ? null : amountMinor
}

export function parseSignedAmountToMinor(value: string): number | null {
  const normalized = value.trim().replaceAll(',', '')
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const sign = normalized.startsWith('-') ? -1 : 1
  const unsigned = normalized.replace(/^-/, '')
  const [wholePart, fractionPart = ''] = unsigned.split('.')
  const wholeMinor = Number(wholePart) * 100
  const fractionMinor = Number(fractionPart.padEnd(2, '0'))
  const amountMinor = sign * (wholeMinor + fractionMinor)

  return Number.isSafeInteger(amountMinor) ? amountMinor : null
}

export function lastDayOfMonth(value: string): string {
  if (!isValidCivilDate(value)) throw new RangeError('date must be a real calendar date')
  const [year, month] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

export function isValidCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

export function todayCivilDate(reference = new Date()): string {
  const year = reference.getFullYear()
  const month = String(reference.getMonth() + 1).padStart(2, '0')
  const day = String(reference.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
