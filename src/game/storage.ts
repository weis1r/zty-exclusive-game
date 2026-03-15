const STORAGE_KEY = 'brick-match:preferences'

export interface AppPreferences {
  soundEnabled: boolean
}

const DEFAULT_PREFERENCES: AppPreferences = {
  soundEnabled: true,
}

export function loadPreferences(): AppPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }

  try {
    const storedPreferences = window.localStorage.getItem(STORAGE_KEY)

    if (!storedPreferences) {
      return DEFAULT_PREFERENCES
    }

    const parsedPreferences = JSON.parse(storedPreferences) as Partial<AppPreferences>

    return {
      soundEnabled:
        typeof parsedPreferences.soundEnabled === 'boolean'
          ? parsedPreferences.soundEnabled
          : DEFAULT_PREFERENCES.soundEnabled,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(preferences: AppPreferences) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}
