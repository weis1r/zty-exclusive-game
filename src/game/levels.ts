import type {
  CampaignChapterDefinition,
  CampaignDefinition,
  LevelDefinition,
  TileDefinition,
  TileType,
} from './types'

interface TileSlot {
  x: number
  y: number
  layer: number
}

function createTiles(slots: TileSlot[], types: TileType[]): TileDefinition[] {
  if (slots.length !== types.length) {
    throw new Error(`Tile slot count ${slots.length} does not match type count ${types.length}`)
  }

  const typeCounts = new Map<TileType, number>()

  return slots.map((slot, index) => {
    const type = types[index]
    const nextCount = (typeCounts.get(type) ?? 0) + 1
    typeCounts.set(type, nextCount)

    return {
      id: `${type}-${nextCount}`,
      type,
      x: slot.x,
      y: slot.y,
      layer: slot.layer,
    }
  })
}

function repeatTypes(pattern: TileType[], repeatCount: number): TileType[] {
  return Array.from({ length: repeatCount }, () => pattern).flat()
}

const STACK_36_SLOTS: TileSlot[] = [
  { x: 134, y: 30, layer: 3 },
  { x: 210, y: 30, layer: 3 },
  { x: 134, y: 124, layer: 3 },
  { x: 210, y: 124, layer: 3 },
  { x: 134, y: 218, layer: 3 },
  { x: 210, y: 218, layer: 3 },
  { x: 106, y: 68, layer: 2 },
  { x: 182, y: 68, layer: 2 },
  { x: 258, y: 68, layer: 2 },
  { x: 106, y: 162, layer: 2 },
  { x: 182, y: 162, layer: 2 },
  { x: 258, y: 162, layer: 2 },
  { x: 106, y: 256, layer: 2 },
  { x: 182, y: 256, layer: 2 },
  { x: 258, y: 256, layer: 2 },
  { x: 78, y: 106, layer: 1 },
  { x: 154, y: 106, layer: 1 },
  { x: 230, y: 106, layer: 1 },
  { x: 78, y: 200, layer: 1 },
  { x: 154, y: 200, layer: 1 },
  { x: 230, y: 200, layer: 1 },
  { x: 78, y: 294, layer: 1 },
  { x: 154, y: 294, layer: 1 },
  { x: 230, y: 294, layer: 1 },
  { x: 50, y: 144, layer: 0 },
  { x: 126, y: 144, layer: 0 },
  { x: 202, y: 144, layer: 0 },
  { x: 278, y: 144, layer: 0 },
  { x: 50, y: 238, layer: 0 },
  { x: 126, y: 238, layer: 0 },
  { x: 202, y: 238, layer: 0 },
  { x: 278, y: 238, layer: 0 },
  { x: 50, y: 332, layer: 0 },
  { x: 126, y: 332, layer: 0 },
  { x: 202, y: 332, layer: 0 },
  { x: 278, y: 332, layer: 0 },
]

const STAIR_27_SLOTS: TileSlot[] = [
  { x: 106, y: 44, layer: 2 },
  { x: 182, y: 44, layer: 2 },
  { x: 258, y: 44, layer: 2 },
  { x: 106, y: 138, layer: 2 },
  { x: 182, y: 138, layer: 2 },
  { x: 258, y: 138, layer: 2 },
  { x: 106, y: 232, layer: 2 },
  { x: 182, y: 232, layer: 2 },
  { x: 258, y: 232, layer: 2 },
  { x: 78, y: 82, layer: 1 },
  { x: 154, y: 82, layer: 1 },
  { x: 230, y: 82, layer: 1 },
  { x: 78, y: 176, layer: 1 },
  { x: 154, y: 176, layer: 1 },
  { x: 230, y: 176, layer: 1 },
  { x: 78, y: 270, layer: 1 },
  { x: 154, y: 270, layer: 1 },
  { x: 230, y: 270, layer: 1 },
  { x: 50, y: 120, layer: 0 },
  { x: 126, y: 120, layer: 0 },
  { x: 202, y: 120, layer: 0 },
  { x: 50, y: 214, layer: 0 },
  { x: 126, y: 214, layer: 0 },
  { x: 202, y: 214, layer: 0 },
  { x: 50, y: 308, layer: 0 },
  { x: 126, y: 308, layer: 0 },
  { x: 202, y: 308, layer: 0 },
]

const CHAPTER_BLOOM_PATH: CampaignChapterDefinition = {
  id: 'chapter-bloom-path',
  order: 1,
  title: '晨露花径',
  subtitle: '入门三关',
  summary: '从稳定的两组三连起步，慢慢学会打开中层与预留卡槽。',
  rewardLabel: '露珠徽章',
  accentColor: '#f0b165',
  levelIds: ['thorn-garden-01', 'lantern-steps-02', 'ivy-arcade-03'],
}

const CHAPTER_MIRROR_COURT: CampaignChapterDefinition = {
  id: 'chapter-mirror-court',
  order: 2,
  title: '镜庭深处',
  subtitle: '进阶三关',
  summary: '后半程会混入更多错位遮挡，需要更稳的节奏与复盘能力。',
  rewardLabel: '镜庭纹章',
  accentColor: '#8db6f0',
  levelIds: ['mirror-court-04', 'moon-pond-05', 'crown-greenhouse-06'],
}

const LEVEL_THORN_GARDEN_01: LevelDefinition = {
  id: 'thorn-garden-01',
  name: '荆棘迷圃',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'normal',
  campaign: {
    order: 1,
    chapterId: CHAPTER_BLOOM_PATH.id,
    chapter: CHAPTER_BLOOM_PATH.title,
    summary: '先打开顶层三连，掌握卡槽节奏。',
    unlocksLevelId: 'lantern-steps-02',
    recommendedSelectionCount: 40,
    starSelectionThresholds: [36, 42, 50],
    startingAssists: { undo: 2, hint: 2 },
  },
  tiles: [
    { id: 'ember-1', type: 'ember', x: 134, y: 30, layer: 3 },
    { id: 'leaf-1', type: 'leaf', x: 210, y: 30, layer: 3 },
    { id: 'ember-3', type: 'ember', x: 134, y: 124, layer: 3 },
    { id: 'leaf-3', type: 'leaf', x: 210, y: 124, layer: 3 },
    { id: 'ember-2', type: 'ember', x: 134, y: 218, layer: 3 },
    { id: 'leaf-2', type: 'leaf', x: 210, y: 218, layer: 3 },
    { id: 'bell-1', type: 'bell', x: 106, y: 68, layer: 2 },
    { id: 'bloom-1', type: 'bloom', x: 182, y: 68, layer: 2 },
    { id: 'cloud-1', type: 'cloud', x: 258, y: 68, layer: 2 },
    { id: 'bloom-2', type: 'bloom', x: 106, y: 162, layer: 2 },
    { id: 'bloom-3', type: 'bloom', x: 182, y: 162, layer: 2 },
    { id: 'shell-1', type: 'shell', x: 258, y: 162, layer: 2 },
    { id: 'berry-1', type: 'berry', x: 106, y: 256, layer: 2 },
    { id: 'pine-1', type: 'pine', x: 182, y: 256, layer: 2 },
    { id: 'wave-1', type: 'wave', x: 258, y: 256, layer: 2 },
    { id: 'bell-2', type: 'bell', x: 78, y: 106, layer: 1 },
    { id: 'leaf-4', type: 'leaf', x: 154, y: 106, layer: 1 },
    { id: 'cloud-2', type: 'cloud', x: 230, y: 106, layer: 1 },
    { id: 'ember-4', type: 'ember', x: 78, y: 200, layer: 1 },
    { id: 'bloom-4', type: 'bloom', x: 154, y: 200, layer: 1 },
    { id: 'shell-2', type: 'shell', x: 230, y: 200, layer: 1 },
    { id: 'berry-2', type: 'berry', x: 78, y: 294, layer: 1 },
    { id: 'pine-2', type: 'pine', x: 154, y: 294, layer: 1 },
    { id: 'wave-2', type: 'wave', x: 230, y: 294, layer: 1 },
    { id: 'bell-3', type: 'bell', x: 50, y: 144, layer: 0 },
    { id: 'ember-5', type: 'ember', x: 126, y: 144, layer: 0 },
    { id: 'cloud-3', type: 'cloud', x: 202, y: 144, layer: 0 },
    { id: 'pine-3', type: 'pine', x: 278, y: 144, layer: 0 },
    { id: 'leaf-5', type: 'leaf', x: 50, y: 238, layer: 0 },
    { id: 'wave-3', type: 'wave', x: 126, y: 238, layer: 0 },
    { id: 'shell-3', type: 'shell', x: 202, y: 238, layer: 0 },
    { id: 'bloom-5', type: 'bloom', x: 278, y: 238, layer: 0 },
    { id: 'berry-3', type: 'berry', x: 50, y: 332, layer: 0 },
    { id: 'ember-6', type: 'ember', x: 126, y: 332, layer: 0 },
    { id: 'leaf-6', type: 'leaf', x: 202, y: 332, layer: 0 },
    { id: 'bloom-6', type: 'bloom', x: 278, y: 332, layer: 0 },
  ],
}

const LEVEL_LANTERN_STEPS_02: LevelDefinition = {
  id: 'lantern-steps-02',
  name: '灯影台阶',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'easy',
  campaign: {
    order: 2,
    chapterId: CHAPTER_BLOOM_PATH.id,
    chapter: CHAPTER_BLOOM_PATH.title,
    summary: '层数更浅，但要提前规划同类聚拢。',
    unlocksLevelId: 'ivy-arcade-03',
    recommendedSelectionCount: 30,
    starSelectionThresholds: [27, 31, 35],
    startingAssists: { undo: 2, hint: 1 },
  },
  tiles: createTiles(
    STAIR_27_SLOTS,
    [
      'ember',
      'ember',
      'ember',
      'leaf',
      'leaf',
      'leaf',
      'bloom',
      'bloom',
      'bloom',
      'bell',
      'bell',
      'bell',
      'cloud',
      'cloud',
      'cloud',
      'shell',
      'shell',
      'shell',
      'berry',
      'berry',
      'berry',
      'pine',
      'pine',
      'pine',
      'wave',
      'wave',
      'wave',
    ],
  ),
}

const LEVEL_IVY_ARCADE_03: LevelDefinition = {
  id: 'ivy-arcade-03',
  name: '常青回廊',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'normal',
  campaign: {
    order: 3,
    chapterId: CHAPTER_BLOOM_PATH.id,
    chapter: CHAPTER_BLOOM_PATH.title,
    summary: '章节收官关，开局更散，但仍能稳住两次安全配牌。',
    unlocksLevelId: 'mirror-court-04',
    recommendedSelectionCount: 39,
    starSelectionThresholds: [33, 40, 48],
    startingAssists: { undo: 2, hint: 2 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    repeatTypes(['bloom', 'cloud', 'leaf', 'bell', 'shell', 'wave'], 6),
  ),
}

const LEVEL_MIRROR_COURT_04: LevelDefinition = {
  id: 'mirror-court-04',
  name: '镜庭重楼',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'normal',
  campaign: {
    order: 4,
    chapterId: CHAPTER_MIRROR_COURT.id,
    chapter: CHAPTER_MIRROR_COURT.title,
    summary: '第二章起手混排，要求更谨慎地安排收集槽顺序。',
    unlocksLevelId: 'moon-pond-05',
    recommendedSelectionCount: 42,
    starSelectionThresholds: [36, 44, 52],
    startingAssists: { undo: 2, hint: 2 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    repeatTypes(['ember', 'leaf', 'bloom', 'cloud', 'shell', 'berry'], 6),
  ),
}

const LEVEL_MOON_POND_05: LevelDefinition = {
  id: 'moon-pond-05',
  name: '月池回声',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'hard',
  campaign: {
    order: 5,
    chapterId: CHAPTER_MIRROR_COURT.id,
    chapter: CHAPTER_MIRROR_COURT.title,
    summary: '中层会连续压出新类型，要靠提示与撤销稳住节奏。',
    unlocksLevelId: 'crown-greenhouse-06',
    recommendedSelectionCount: 44,
    starSelectionThresholds: [38, 46, 56],
    startingAssists: { undo: 2, hint: 2 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    repeatTypes(['pine', 'wave', 'bell', 'leaf', 'bloom', 'shell'], 6),
  ),
}

const LEVEL_CROWN_GREENHOUSE_06: LevelDefinition = {
  id: 'crown-greenhouse-06',
  name: '冠冕温室',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'hard',
  campaign: {
    order: 6,
    chapterId: CHAPTER_MIRROR_COURT.id,
    chapter: CHAPTER_MIRROR_COURT.title,
    summary: '最终关把六种类型混在同一轮暴露，需要完整掌控局势。',
    recommendedSelectionCount: 46,
    starSelectionThresholds: [40, 48, 58],
    startingAssists: { undo: 3, hint: 2 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    repeatTypes(['ember', 'berry', 'cloud', 'pine', 'bloom', 'wave'], 6),
  ),
}

export const CAMPAIGN: CampaignDefinition = {
  id: 'brick-match-campaign-v2',
  name: '朱天宇专属游戏',
  chapters: [CHAPTER_BLOOM_PATH, CHAPTER_MIRROR_COURT],
  levels: [
    LEVEL_THORN_GARDEN_01,
    LEVEL_LANTERN_STEPS_02,
    LEVEL_IVY_ARCADE_03,
    LEVEL_MIRROR_COURT_04,
    LEVEL_MOON_POND_05,
    LEVEL_CROWN_GREENHOUSE_06,
  ],
}

export const CAMPAIGN_LEVELS: LevelDefinition[] = CAMPAIGN.levels

export const CAMPAIGN_LEVEL_IDS: string[] = CAMPAIGN_LEVELS.map((level) => level.id)

export const DEFAULT_LEVEL: LevelDefinition = LEVEL_THORN_GARDEN_01

function resolveCampaignChapters(
  campaign: CampaignDefinition = CAMPAIGN,
): CampaignChapterDefinition[] {
  if (campaign.chapters && campaign.chapters.length > 0) {
    return [...campaign.chapters]
      .map((chapter) => ({
        ...chapter,
        levelIds: chapter.levelIds.filter((levelId) =>
          campaign.levels.some((level) => level.id === levelId),
        ),
      }))
      .filter((chapter) => chapter.levelIds.length > 0)
      .sort((leftChapter, rightChapter) => leftChapter.order - rightChapter.order)
  }

  const groupedChapters = new Map<string, CampaignChapterDefinition>()

  campaign.levels
    .slice()
    .sort((leftLevel, rightLevel) => {
      return (leftLevel.campaign?.order ?? 0) - (rightLevel.campaign?.order ?? 0)
    })
    .forEach((level, index) => {
      const chapterKey =
        level.campaign?.chapterId ??
        level.campaign?.chapter ??
        `chapter-${index + 1}`

      if (!groupedChapters.has(chapterKey)) {
        groupedChapters.set(chapterKey, {
          id: chapterKey,
          order: groupedChapters.size + 1,
          title: level.campaign?.chapter ?? `第 ${groupedChapters.size + 1} 章`,
          summary: `${level.campaign?.chapter ?? `第 ${groupedChapters.size + 1} 章`} 关卡合集`,
          levelIds: [],
        })
      }

      groupedChapters.get(chapterKey)?.levelIds.push(level.id)
    })

  return [...groupedChapters.values()]
}

export function getCampaignChapters(
  campaign: CampaignDefinition = CAMPAIGN,
): CampaignChapterDefinition[] {
  return resolveCampaignChapters(campaign)
}

export function getCampaignLevelById(
  levelId: string,
  campaign: CampaignDefinition = CAMPAIGN,
): LevelDefinition | null {
  return campaign.levels.find((level) => level.id === levelId) ?? null
}

export function getCampaignLevelIndex(
  levelId: string,
  campaign: CampaignDefinition = CAMPAIGN,
): number {
  return campaign.levels.findIndex((level) => level.id === levelId)
}

export function getNextCampaignLevelId(
  levelId: string,
  campaign: CampaignDefinition = CAMPAIGN,
): string | null {
  const levelIndex = getCampaignLevelIndex(levelId, campaign)

  if (levelIndex === -1 || levelIndex >= campaign.levels.length - 1) {
    return null
  }

  return campaign.levels[levelIndex + 1].id
}

export function getCampaignChapterById(
  chapterId: string,
  campaign: CampaignDefinition = CAMPAIGN,
): CampaignChapterDefinition | null {
  return getCampaignChapters(campaign).find((chapter) => chapter.id === chapterId) ?? null
}

export function getCampaignChapterIndex(
  chapterId: string,
  campaign: CampaignDefinition = CAMPAIGN,
): number {
  return getCampaignChapters(campaign).findIndex((chapter) => chapter.id === chapterId)
}

export function getCampaignChapterForLevel(
  levelId: string,
  campaign: CampaignDefinition = CAMPAIGN,
): CampaignChapterDefinition | null {
  return (
    getCampaignChapters(campaign).find((chapter) => chapter.levelIds.includes(levelId)) ?? null
  )
}

export function getLevelsForChapter(
  chapterId: string,
  campaign: CampaignDefinition = CAMPAIGN,
): LevelDefinition[] {
  return campaign.levels.filter((level) => {
    return getCampaignChapterForLevel(level.id, campaign)?.id === chapterId
  })
}

export function getNextCampaignChapterId(
  chapterId: string,
  campaign: CampaignDefinition = CAMPAIGN,
): string | null {
  const chapterIndex = getCampaignChapterIndex(chapterId, campaign)
  const chapters = getCampaignChapters(campaign)

  if (chapterIndex === -1 || chapterIndex >= chapters.length - 1) {
    return null
  }

  return chapters[chapterIndex + 1].id
}
