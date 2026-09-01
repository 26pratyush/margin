export const FIRST_USE_GUIDE_STORAGE_KEY = 'margin.first-use-guide.v1'

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>

function localPreferenceStorage(): PreferenceStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function hasSeenFirstUseGuide(storage: PreferenceStorage | undefined = localPreferenceStorage()) {
  if (!storage) return false
  try {
    return storage.getItem(FIRST_USE_GUIDE_STORAGE_KEY) === 'seen'
  } catch {
    return false
  }
}

export function markFirstUseGuideSeen(storage: PreferenceStorage | undefined = localPreferenceStorage()) {
  if (!storage) return false
  try {
    storage.setItem(FIRST_USE_GUIDE_STORAGE_KEY, 'seen')
    return true
  } catch {
    return false
  }
}
