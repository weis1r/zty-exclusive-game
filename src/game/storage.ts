import {
  getCampaignChapterForLevel,
  getCampaignChapters,
  getNextCampaignLevelId,
} from './levels'
import type {
  CampaignChapterDefinition,
  CampaignDefinition,
  CampaignProgress,
  ChapterProgressRecord,
  LevelCompletionStats,
  LevelDefinition,
  LevelProgressRecord,
} from './types'

const PREFERENCES_STORAGE_KEY = 'brick-match:preferences'
const LEGACY_PROGRESS_STORAGE_KEY = 'brick-match:campaign-progress'

export interface AppPreferences {
  soundEnabled: boolean
}

const DEFAULT_PREFERENCES: AppPreferences = {
  soundEnabled: true,
}

function getProgressStorageKey(campaignId: string) {
  return `${LEGACY_PROGRESS_STORAGE_KEY}:${campaignId}`
}

function getLevelChapterId(
  level: LevelDefinition,
  campaign: CampaignDefinition,
): string | null {
  return level.campaign?.chapterId ?? getCampaignChapterForLevel(level.id, campaign)?.id ?? null
}

function createLevelProgressRecord(
  level: LevelDefinition,
  campaign: CampaignDefinition,
  unlocked: boolean,
): LevelProgressRecord {
  return {
    levelId: level.id,
    chapterId: getLevelChapterId(level, campaign),
    unlocked,
    completed: false,
    stars: 0,
    bestSelectedCount: null,
    bestCompletionMs: null,
    lastPlayedAt: null,
    completedAt: null,
  }
}

function createChapterProgressRecord(
  chapter: CampaignChapterDefinition,
  unlocked: boolean,
): ChapterProgressRecord {
  return {
    chapterId: chapter.id,
    unlocked,
    completed: false,
    levelIds: [...chapter.levelIds],
    unlockedLevelIds: [],
    completedLevelIds: [],
    earnedStars: 0,
    unlockedAt: unlocked ? Date.now() : null,
    completedAt: null,
  }
}

function getUnlockTarget(campaign: CampaignDefinition, levelId: string): string | null {
  const level = campaign.levels.find((candidateLevel) => candidateLevel.id === levelId)

  if (!level) {
    return null
  }

  return level.campaign?.unlocksLevelId ?? getNextCampaignLevelId(levelId, campaign)
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function dedupeStringList(values: string[]) {
  return [...new Set(values)]
}

function normalizeProgress(
  rawProgress: Partial<CampaignProgress>,
  campaign: CampaignDefinition,
): CampaignProgress {
  const now = Date.now()
  const chapters = getCampaignChapters(campaign)
  const levelIds = new Set(campaign.levels.map((level) => level.id))
  const chapterIds = new Set(chapters.map((chapter) => chapter.id))
  const firstLevelId = campaign.levels[0]?.id ?? ''
  const firstChapterId = chapters[0]?.id ?? ''

  const levelRecords = campaign.levels.reduce<Record<string, LevelProgressRecord>>(
    (records, level, levelIndex) => {
      const rawRecord = rawProgress.levelRecords?.[level.id]

      records[level.id] = {
        ...createLevelProgressRecord(level, campaign, levelIndex === 0),
        ...(rawRecord ?? {}),
        levelId: level.id,
        chapterId: getLevelChapterId(level, campaign),
        unlocked:
          levelIndex === 0
            ? true
            : typeof rawRecord?.unlocked === 'boolean'
              ? rawRecord.unlocked
              : false,
        completed:
          typeof rawRecord?.completed === 'boolean' ? rawRecord.completed : false,
        stars:
          typeof rawRecord?.stars === 'number'
            ? Math.max(0, Math.min(3, rawRecord.stars))
            : 0,
        bestSelectedCount: toNullableNumber(rawRecord?.bestSelectedCount),
        bestCompletionMs: toNullableNumber(rawRecord?.bestCompletionMs),
        lastPlayedAt: toNullableNumber(rawRecord?.lastPlayedAt),
        completedAt: toNullableNumber(rawRecord?.completedAt),
      }

      return records
    },
    {},
  )

  const unlockedLevelIds = dedupeStringList([
    ...(Array.isArray(rawProgress.unlockedLevelIds)
      ? rawProgress.unlockedLevelIds.filter((levelId) => levelIds.has(levelId))
      : []),
    ...Object.values(levelRecords)
      .filter((record) => record.unlocked)
      .map((record) => record.levelId),
  ])

  const completedLevelIds = dedupeStringList([
    ...(Array.isArray(rawProgress.completedLevelIds)
      ? rawProgress.completedLevelIds.filter((levelId) => levelIds.has(levelId))
      : []),
    ...Object.values(levelRecords)
      .filter((record) => record.completed)
      .map((record) => record.levelId),
  ])

  if (firstLevelId && !unlockedLevelIds.includes(firstLevelId)) {
    unlockedLevelIds.unshift(firstLevelId)
  }

  unlockedLevelIds.forEach((levelId) => {
    if (levelRecords[levelId]) {
      levelRecords[levelId].unlocked = true
    }
  })

  completedLevelIds.forEach((levelId) => {
    if (levelRecords[levelId]) {
      levelRecords[levelId].completed = true
      levelRecords[levelId].unlocked = true
    }
  })

  const propagatedUnlockedLevelIds = new Set(unlockedLevelIds)
  let changed = true

  while (changed) {
    changed = false

    completedLevelIds.forEach((levelId) => {
      const unlockTarget = getUnlockTarget(campaign, levelId)

      if (unlockTarget && !propagatedUnlockedLevelIds.has(unlockTarget)) {
        propagatedUnlockedLevelIds.add(unlockTarget)

        if (levelRecords[unlockTarget]) {
          levelRecords[unlockTarget].unlocked = true
        }

        changed = true
      }
    })
  }

  const normalizedUnlockedLevelIds = [...propagatedUnlockedLevelIds]

  const chapterRecords = chapters.reduce<Record<string, ChapterProgressRecord>>(
    (records, chapter, chapterIndex) => {
      const rawChapter = rawProgress.chapterRecords?.[chapter.id]
      const chapterLevelIds = chapter.levelIds.filter((levelId) => levelIds.has(levelId))
      const chapterUnlockedLevelIds = chapterLevelIds.filter(
        (levelId) => levelRecords[levelId]?.unlocked,
      )
      const chapterCompletedLevelIds = chapterLevelIds.filter(
        (levelId) => levelRecords[levelId]?.completed,
      )
      const chapterEarnedStars = chapterLevelIds.reduce((starCount, levelId) => {
        return starCount + (levelRecords[levelId]?.stars ?? 0)
      }, 0)
      const isUnlocked =
        chapterIndex === 0 ||
        chapterUnlockedLevelIds.length > 0 ||
        rawChapter?.unlocked === true
      const isCompleted =
        chapterLevelIds.length > 0 &&
        chapterCompletedLevelIds.length === chapterLevelIds.length

      records[chapter.id] = {
        ...createChapterProgressRecord(chapter, isUnlocked),
        ...(rawChapter ?? {}),
        chapterId: chapter.id,
        unlocked: isUnlocked,
        completed: isCompleted,
        levelIds: chapterLevelIds,
        unlockedLevelIds: chapterUnlockedLevelIds,
        completedLevelIds: chapterCompletedLevelIds,
        earnedStars: chapterEarnedStars,
        unlockedAt: isUnlocked
          ? toNullableNumber(rawChapter?.unlockedAt) ?? now
          : null,
        completedAt: isCompleted
          ? toNullableNumber(rawChapter?.completedAt) ??
            chapterLevelIds
              .map((levelId) => levelRecords[levelId]?.completedAt)
              .find((completedAt) => completedAt !== null && completedAt !== undefined) ??
            now
          : null,
      }

      return records
    },
    {},
  )

  const fallbackCurrentLevelId =
    campaign.levels.find((level) => levelRecords[level.id]?.unlocked)?.id ?? firstLevelId
  const currentLevelId =
    typeof rawProgress.currentLevelId === 'string' &&
    levelIds.has(rawProgress.currentLevelId) &&
    levelRecords[rawProgress.currentLevelId]?.unlocked
      ? rawProgress.currentLevelId
      : fallbackCurrentLevelId

  const derivedCurrentChapterId =
    getCampaignChapterForLevel(currentLevelId, campaign)?.id ?? firstChapterId
  const currentChapterId =
    typeof rawProgress.currentChapterId === 'string' &&
    chapterIds.has(rawProgress.currentChapterId) &&
    chapterRecords[rawProgress.currentChapterId]?.unlocked
      ? rawProgress.currentChapterId
      : derivedCurrentChapterId

  return {
    version: 2,
    campaignId: campaign.id,
    currentChapterId,
    currentLevelId,
    unlockedLevelIds: normalizedUnlockedLevelIds,
    completedLevelIds,
    levelRecords,
    chapterRecords,
    updatedAt:
      typeof rawProgress.updatedAt === 'number' && Number.isFinite(rawProgress.updatedAt)
        ? rawProgress.updatedAt
        : now,
  }
}

export function loadPreferences(): AppPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }

  try {
    const storedPreferences = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)

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

  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
}

export function createDefaultCampaignProgress(
  campaign: CampaignDefinition,
): CampaignProgress {
  const firstChapterId = getCampaignChapters(campaign)[0]?.id ?? ''
  const firstLevelId = campaign.levels[0]?.id ?? ''

  return normalizeProgress(
    {
      version: 2,
      campaignId: campaign.id,
      currentChapterId: firstChapterId,
      currentLevelId: firstLevelId,
      unlockedLevelIds: firstLevelId ? [firstLevelId] : [],
      completedLevelIds: [],
      chapterRecords: {},
      levelRecords: {},
      updatedAt: Date.now(),
    },
    campaign,
  )
}

export function loadCampaignProgress(
  campaign: CampaignDefinition,
): CampaignProgress {
  if (typeof window === 'undefined') {
    return createDefaultCampaignProgress(campaign)
  }

  const campaignStorageKey = getProgressStorageKey(campaign.id)

  try {
    const storedProgress =
      window.localStorage.getItem(campaignStorageKey) ??
      window.localStorage.getItem(LEGACY_PROGRESS_STORAGE_KEY)

    if (!storedProgress) {
      return createDefaultCampaignProgress(campaign)
    }

    const parsedProgress = JSON.parse(storedProgress) as Partial<CampaignProgress>

    if (
      typeof parsedProgress !== 'object' ||
      parsedProgress === null ||
      (typeof parsedProgress.campaignId === 'string' &&
        parsedProgress.campaignId !== campaign.id)
    ) {
      return createDefaultCampaignProgress(campaign)
    }

    const normalizedProgress = normalizeProgress(parsedProgress, campaign)
    saveCampaignProgress(normalizedProgress)

    return normalizedProgress
  } catch {
    return createDefaultCampaignProgress(campaign)
  }
}

export function saveCampaignProgress(progress: CampaignProgress) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    getProgressStorageKey(progress.campaignId),
    JSON.stringify({
      ...progress,
      version: 2,
    }),
  )
}

export function resetCampaignProgress(
  campaign: CampaignDefinition,
): CampaignProgress {
  const nextProgress = createDefaultCampaignProgress(campaign)
  saveCampaignProgress(nextProgress)
  return nextProgress
}

export function setCurrentCampaignLevel(
  progress: CampaignProgress,
  campaign: CampaignDefinition,
  levelId: string,
): CampaignProgress {
  const levelRecord = progress.levelRecords[levelId]

  if (!levelRecord || !levelRecord.unlocked) {
    return progress
  }

  const nextProgress = normalizeProgress(
    {
      ...progress,
      currentChapterId:
        getCampaignChapterForLevel(levelId, campaign)?.id ?? progress.currentChapterId,
      currentLevelId: levelId,
      levelRecords: {
        ...progress.levelRecords,
        [levelId]: {
          ...levelRecord,
          lastPlayedAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    },
    campaign,
  )

  saveCampaignProgress(nextProgress)

  return nextProgress
}

export function recordLevelCompletion(
  progress: CampaignProgress,
  campaign: CampaignDefinition,
  stats: LevelCompletionStats,
  stars: number,
): CampaignProgress {
  const currentRecord = progress.levelRecords[stats.levelId]

  if (!currentRecord) {
    return progress
  }

  const now = Date.now()
  const nextLevelId = getUnlockTarget(campaign, stats.levelId)
  const unlockedLevelIds = new Set(progress.unlockedLevelIds)
  const completedLevelIds = new Set(progress.completedLevelIds)

  unlockedLevelIds.add(stats.levelId)
  completedLevelIds.add(stats.levelId)

  if (nextLevelId) {
    unlockedLevelIds.add(nextLevelId)
  }

  const nextLevelRecords = {
    ...progress.levelRecords,
    [stats.levelId]: {
      ...currentRecord,
      unlocked: true,
      completed: true,
      stars: Math.max(currentRecord.stars, stars),
      bestSelectedCount:
        currentRecord.bestSelectedCount === null
          ? stats.selectedCount
          : Math.min(currentRecord.bestSelectedCount, stats.selectedCount),
      bestCompletionMs:
        typeof stats.completionMs === 'number'
          ? currentRecord.bestCompletionMs === null
            ? stats.completionMs
            : Math.min(currentRecord.bestCompletionMs, stats.completionMs)
          : currentRecord.bestCompletionMs,
      lastPlayedAt: now,
      completedAt: currentRecord.completedAt ?? now,
    },
  }

  if (nextLevelId && nextLevelRecords[nextLevelId]) {
    nextLevelRecords[nextLevelId] = {
      ...nextLevelRecords[nextLevelId],
      unlocked: true,
    }
  }

  const nextCurrentLevelId = nextLevelId ?? stats.levelId
  const nextProgress = normalizeProgress(
    {
      ...progress,
      currentChapterId:
        getCampaignChapterForLevel(nextCurrentLevelId, campaign)?.id ??
        progress.currentChapterId,
      currentLevelId: nextCurrentLevelId,
      unlockedLevelIds: [...unlockedLevelIds],
      completedLevelIds: [...completedLevelIds],
      levelRecords: nextLevelRecords,
      updatedAt: now,
    },
    campaign,
  )

  saveCampaignProgress(nextProgress)

  return nextProgress
}
