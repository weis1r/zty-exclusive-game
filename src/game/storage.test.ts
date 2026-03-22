import { afterEach, describe, expect, it } from 'vitest'
import {
  CAMPAIGN,
  getCampaignChapters,
  getCampaignLevelById,
  getCampaignLevelIndex,
  getNextCampaignLevelId,
} from './levels'
import {
  createDefaultCampaignProgress,
  loadCampaignProgress,
  recordLevelCompletion,
  resetCampaignProgress,
  setCurrentCampaignLevel,
} from './storage'
import type { CampaignDefinition, LevelDefinition } from './types'

function createLevel(
  id: string,
  order: number,
  unlocksLevelId?: string,
): LevelDefinition {
  return {
    id,
    name: `第 ${order} 关`,
    boardWidth: 360,
    boardHeight: 520,
    difficulty: 'easy',
    campaign: {
      order,
      chapter: '测试战役',
      summary: `关卡 ${order}`,
      unlocksLevelId,
      startingAssists: { hint: 1, undo: 1 },
    },
    tiles: [
      { id: `${id}-1`, type: 'ember', x: 0, y: 0, layer: 0 },
      { id: `${id}-2`, type: 'ember', x: 80, y: 0, layer: 0 },
      { id: `${id}-3`, type: 'ember', x: 160, y: 0, layer: 0 },
    ],
  }
}

function createCampaign(): CampaignDefinition {
  return {
    id: 'storage-test-campaign',
    name: '存档测试战役',
    levels: [
      createLevel('level-1', 1, 'level-2'),
      createLevel('level-2', 2, 'level-3'),
      createLevel('level-3', 3),
    ],
  }
}

afterEach(() => {
  window.localStorage.clear()
})

describe('campaign helpers and storage', () => {
  it('resolves custom campaign levels by id and order', () => {
    const campaign = createCampaign()

    expect(getCampaignLevelById('level-2', campaign)?.name).toBe('第 2 关')
    expect(getCampaignLevelIndex('level-2', campaign)).toBe(1)
    expect(getNextCampaignLevelId('level-2', campaign)).toBe('level-3')
    expect(getNextCampaignLevelId('level-3', campaign)).toBeNull()
  })

  it('creates default progress with only the first level unlocked', () => {
    const campaign = createCampaign()
    const progress = createDefaultCampaignProgress(campaign)

    expect(progress.version).toBe(2)
    expect(progress.currentChapterId).toBe(getCampaignChapters(campaign)[0].id)
    expect(progress.currentLevelId).toBe('level-1')
    expect(progress.unlockedLevelIds).toEqual(['level-1'])
    expect(progress.completedLevelIds).toEqual([])
    expect(progress.levelRecords['level-1'].unlocked).toBe(true)
    expect(progress.levelRecords['level-2'].unlocked).toBe(false)
    expect(progress.chapterRecords[getCampaignChapters(campaign)[0].id].unlocked).toBe(true)
  })

  it('records a completion, unlocks the next level, and persists the selection', () => {
    const campaign = createCampaign()
    const completedProgress = recordLevelCompletion(
      createDefaultCampaignProgress(campaign),
      campaign,
      {
        levelId: 'level-1',
        selectedCount: 3,
        completionMs: 1200,
      },
      3,
    )

    expect(completedProgress.completedLevelIds).toContain('level-1')
    expect(completedProgress.levelRecords['level-1'].completed).toBe(true)
    expect(completedProgress.levelRecords['level-1'].stars).toBe(3)
    expect(completedProgress.levelRecords['level-2'].unlocked).toBe(true)
    expect(completedProgress.currentLevelId).toBe('level-2')
    expect(completedProgress.chapterRecords[getCampaignChapters(campaign)[0].id].completedLevelIds).toContain(
      'level-1',
    )

    const selectedProgress = setCurrentCampaignLevel(completedProgress, campaign, 'level-2')

    expect(selectedProgress.currentChapterId).toBe(getCampaignChapters(campaign)[0].id)
    expect(selectedProgress.currentLevelId).toBe('level-2')
    expect(selectedProgress.levelRecords['level-2'].lastPlayedAt).not.toBeNull()
    expect(loadCampaignProgress(campaign).currentLevelId).toBe('level-2')
  })

  it('migrates legacy progress into chapter-based v2 records', () => {
    window.localStorage.setItem(
      'brick-match:campaign-progress',
      JSON.stringify({
        version: 1,
        campaignId: CAMPAIGN.id,
        currentLevelId: 'mirror-court-04',
        unlockedLevelIds: [
          'thorn-garden-01',
          'lantern-steps-02',
          'ivy-arcade-03',
          'mirror-court-04',
        ],
        completedLevelIds: ['thorn-garden-01', 'lantern-steps-02', 'ivy-arcade-03'],
      }),
    )

    const progress = loadCampaignProgress(CAMPAIGN)

    expect(progress.version).toBe(2)
    expect(progress.currentLevelId).toBe('mirror-court-04')
    expect(progress.currentChapterId).toBe('chapter-mirror-court')
    expect(progress.chapterRecords['chapter-bloom-path'].completed).toBe(true)
    expect(progress.chapterRecords['chapter-bloom-path'].completedLevelIds).toEqual([
      'thorn-garden-01',
      'lantern-steps-02',
      'ivy-arcade-03',
    ])
    expect(progress.chapterRecords['chapter-mirror-court'].unlocked).toBe(true)
    expect(progress.chapterRecords['chapter-mirror-court'].unlockedLevelIds).toContain(
      'mirror-court-04',
    )
    expect(
      window.localStorage.getItem(`brick-match:campaign-progress:${CAMPAIGN.id}`),
    ).not.toBeNull()
  })

  it('unlocks newly appended levels when an old save had already cleared the former final stage', () => {
    window.localStorage.setItem(
      `brick-match:campaign-progress:${CAMPAIGN.id}`,
      JSON.stringify({
        version: 2,
        campaignId: CAMPAIGN.id,
        currentChapterId: 'chapter-mirror-court',
        currentLevelId: 'crown-greenhouse-06',
        unlockedLevelIds: [
          'thorn-garden-01',
          'lantern-steps-02',
          'ivy-arcade-03',
          'mirror-court-04',
          'moon-pond-05',
          'crown-greenhouse-06',
        ],
        completedLevelIds: [
          'thorn-garden-01',
          'lantern-steps-02',
          'ivy-arcade-03',
          'mirror-court-04',
          'moon-pond-05',
          'crown-greenhouse-06',
        ],
        chapterRecords: {},
        levelRecords: {},
      }),
    )

    const progress = loadCampaignProgress(CAMPAIGN)

    expect(progress.levelRecords['sunset-orchard-07'].unlocked).toBe(true)
    expect(progress.unlockedLevelIds).toContain('sunset-orchard-07')
  })

  it('resets persisted progress back to the opening level', () => {
    const campaign = createCampaign()

    recordLevelCompletion(
      createDefaultCampaignProgress(campaign),
      campaign,
      {
        levelId: 'level-1',
        selectedCount: 3,
      },
      2,
    )

    const resetProgress = resetCampaignProgress(campaign)

    expect(resetProgress.currentLevelId).toBe('level-1')
    expect(resetProgress.unlockedLevelIds).toEqual(['level-1'])
    expect(resetProgress.completedLevelIds).toEqual([])
    expect(loadCampaignProgress(campaign).completedLevelIds).toEqual([])
  })
})
