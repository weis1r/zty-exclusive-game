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

function createGentleStackTypes(
  primaryPair: [TileType, TileType],
  supportPair: [TileType, TileType],
): TileType[] {
  const [primaryA, primaryB] = primaryPair
  const [supportA, supportB] = supportPair

  return [
    primaryA,
    primaryB,
    primaryA,
    primaryB,
    primaryA,
    primaryB,
    supportA,
    supportB,
    supportA,
    supportB,
    supportA,
    supportB,
    primaryA,
    primaryB,
    primaryA,
    supportB,
    supportA,
    supportB,
    primaryB,
    primaryA,
    primaryB,
    supportA,
    supportB,
    supportA,
    primaryA,
    primaryB,
    primaryA,
    supportB,
    supportA,
    supportB,
    primaryB,
    primaryA,
    primaryB,
    supportA,
    supportB,
    supportA,
  ]
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
  summary: '用更少的颜色和更稳的起手节奏入门，先熟悉安全三消与留槽位。',
  rewardLabel: '露珠徽章',
  accentColor: '#f0b165',
  levelIds: ['thorn-garden-01', 'lantern-steps-02', 'ivy-arcade-03'],
}

const CHAPTER_MIRROR_COURT: CampaignChapterDefinition = {
  id: 'chapter-mirror-court',
  order: 2,
  title: '镜庭深处',
  subtitle: '进阶三关',
  summary: '后半程保留层叠感，但把同屏颜色压缩到四种，更适合稳步推进。',
  rewardLabel: '镜庭纹章',
  accentColor: '#8db6f0',
  levelIds: ['mirror-court-04', 'moon-pond-05', 'crown-greenhouse-06'],
}

const LEVEL_THORN_GARDEN_01: LevelDefinition = {
  id: 'thorn-garden-01',
  name: '荆棘迷圃',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'easy',
  campaign: {
    order: 1,
    chapterId: CHAPTER_BLOOM_PATH.id,
    chapter: CHAPTER_BLOOM_PATH.title,
    summary: '开局直接送两组三连，用四种颜色熟悉收集槽节奏。',
    unlocksLevelId: 'lantern-steps-02',
    recommendedSelectionCount: 44,
    starSelectionThresholds: [39, 45, 54],
    startingAssists: { undo: 3, hint: 3 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    createGentleStackTypes(['ember', 'leaf'], ['bloom', 'bell']),
  ),
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
    summary: '只保留三种颜色，台阶结构更清爽，适合稳定连消。',
    unlocksLevelId: 'ivy-arcade-03',
    recommendedSelectionCount: 33,
    starSelectionThresholds: [30, 36, 42],
    startingAssists: { undo: 3, hint: 3 },
  },
  tiles: createTiles(STAIR_27_SLOTS, repeatTypes(['ember', 'leaf', 'bloom'], 9)),
}

const LEVEL_IVY_ARCADE_03: LevelDefinition = {
  id: 'ivy-arcade-03',
  name: '常青回廊',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'easy',
  campaign: {
    order: 3,
    chapterId: CHAPTER_BLOOM_PATH.id,
    chapter: CHAPTER_BLOOM_PATH.title,
    summary: '收官关仍旧保持四种颜色，并继续给出两组三连起手。',
    unlocksLevelId: 'mirror-court-04',
    recommendedSelectionCount: 43,
    starSelectionThresholds: [39, 46, 54],
    startingAssists: { undo: 3, hint: 3 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    createGentleStackTypes(['bloom', 'cloud'], ['leaf', 'bell']),
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
    summary: '第二章保留层叠棋盘，但把同屏颜色压到四种，起手更稳。',
    unlocksLevelId: 'moon-pond-05',
    recommendedSelectionCount: 44,
    starSelectionThresholds: [39, 46, 54],
    startingAssists: { undo: 3, hint: 3 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    createGentleStackTypes(['shell', 'wave'], ['cloud', 'berry']),
  ),
}

const LEVEL_MOON_POND_05: LevelDefinition = {
  id: 'moon-pond-05',
  name: '月池回声',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'normal',
  campaign: {
    order: 5,
    chapterId: CHAPTER_MIRROR_COURT.id,
    chapter: CHAPTER_MIRROR_COURT.title,
    summary: '保留镜庭章节的层次感，但颜色更少、辅助更多，失误后也更好回稳。',
    unlocksLevelId: 'crown-greenhouse-06',
    recommendedSelectionCount: 45,
    starSelectionThresholds: [40, 47, 56],
    startingAssists: { undo: 3, hint: 3 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    createGentleStackTypes(['berry', 'shell'], ['pine', 'cloud']),
  ),
}

const LEVEL_CROWN_GREENHOUSE_06: LevelDefinition = {
  id: 'crown-greenhouse-06',
  name: '冠冕温室',
  boardWidth: 360,
  boardHeight: 520,
  difficulty: 'normal',
  campaign: {
    order: 6,
    chapterId: CHAPTER_MIRROR_COURT.id,
    chapter: CHAPTER_MIRROR_COURT.title,
    summary: '最终关仍然是整章收官，但用四种颜色完成整套拼消，不再一口气压太满。',
    recommendedSelectionCount: 47,
    starSelectionThresholds: [42, 49, 58],
    startingAssists: { undo: 4, hint: 3 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    createGentleStackTypes(['cloud', 'pine'], ['wave', 'bloom']),
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
