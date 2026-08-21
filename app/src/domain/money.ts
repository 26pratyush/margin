export function parseAmountToMinor(value: string): number | null {
  const normalized = value.trim().replaceAll(',', '')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const [wholePart, fractionPart = ''] = normalized.split('.')
  const wholeMinor = Number(wholePart) * 100
  const fractionMinor = Number(fractionPart.padEnd(2, '0'))
  const amountMinor = wholeMinor + fractionMinor

  if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) return null
  return amountMinor
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
