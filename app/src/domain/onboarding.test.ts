import { describe, expect, it } from 'vitest'
import { FIRST_USE_GUIDE_STORAGE_KEY, hasSeenFirstUseGuide, markFirstUseGuideSeen } from './onboarding'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('first-use guide preference', () => {
  it('persists a versioned seen flag across reads', () => {
    const storage = createStorage()

    expect(hasSeenFirstUseGuide(storage)).toBe(false)
    expect(markFirstUseGuideSeen(storage)).toBe(true)
    expect(storage.getItem(FIRST_USE_GUIDE_STORAGE_KEY)).toBe('seen')
    expect(hasSeenFirstUseGuide(storage)).toBe(true)
  })

  it('fails safely when browser preference storage is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('storage blocked')
      },
    }

    expect(hasSeenFirstUseGuide(storage)).toBe(false)
    expect(markFirstUseGuideSeen(storage)).toBe(false)
  })
})
