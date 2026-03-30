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

function pairSequence(types: TileType[]): TileType[] {
  return types.flatMap((type) => [type, type])
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

const STACK_20_SLOTS: TileSlot[] = STACK_36_SLOTS.slice(0, 20)
const STACK_24_SLOTS: TileSlot[] = STACK_36_SLOTS.slice(0, 24)
const STACK_28_SLOTS: TileSlot[] = STACK_36_SLOTS.slice(0, 28)

const CHAPTER_BLOOM_PATH: CampaignChapterDefinition = {
  id: 'chapter-bloom-path',
  order: 1,
  title: '晨露花径',
  subtitle: '二消入门',
  summary: '先适应 Vita Mahjong 风格的二消规则，再学会在四格顶部配对槽里留空间。',
  rewardLabel: '晨露徽章',
  accentColor: '#f0b165',
  levelIds: ['thorn-garden-01', 'lantern-steps-02', 'ivy-arcade-03'],
}

const CHAPTER_MIRROR_COURT: CampaignChapterDefinition = {
  id: 'chapter-mirror-court',
  order: 2,
  title: '镜庭深处',
  subtitle: '四槽进阶',
  summary: '后半程会同时暴露更多类型，必须一边开层一边控制顶部四格的节奏。',
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
    summary: '开局直接给三组安全对子，先熟悉二消与顶部四格槽。',
    unlocksLevelId: 'lantern-steps-02',
    recommendedSelectionCount: 20,
    starSelectionThresholds: [20, 22, 24],
    startingAssists: { undo: 2, hint: 2 },
  },
  tiles: createTiles(
    STACK_20_SLOTS,
    pairSequence(['ember', 'leaf', 'bloom', 'ember', 'leaf', 'bloom', 'bell', 'cloud', 'bell', 'cloud']),
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
    summary: '类型稍微增多，但仍以成对起手为主，帮助你稳住前两轮。',
    unlocksLevelId: 'ivy-arcade-03',
    recommendedSelectionCount: 24,
    starSelectionThresholds: [24, 27, 30],
    startingAssists: { undo: 2, hint: 2 },
  },
  tiles: createTiles(
    STACK_24_SLOTS,
    pairSequence([
      'ember',
      'leaf',
      'bloom',
      'bell',
      'cloud',
      'shell',
      'ember',
      'leaf',
      'bloom',
      'bell',
      'cloud',
      'shell',
    ]),
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
    summary: '章节收官关开始把七种头像混在一起，要求你主动为下一对留位置。',
    unlocksLevelId: 'mirror-court-04',
    recommendedSelectionCount: 28,
    starSelectionThresholds: [28, 31, 34],
    startingAssists: { undo: 2, hint: 1 },
  },
  tiles: createTiles(
    STACK_28_SLOTS,
    pairSequence([
      'leaf',
      'bloom',
      'cloud',
      'bell',
      'shell',
      'wave',
      'berry',
      'leaf',
      'bloom',
      'cloud',
      'bell',
      'shell',
      'wave',
      'berry',
    ]),
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
    summary: '第二章开始回到满盘布局，但顶部依然先给三组对子，难点在中层衔接。',
    unlocksLevelId: 'moon-pond-05',
    recommendedSelectionCount: 36,
    starSelectionThresholds: [36, 39, 43],
    startingAssists: { undo: 2, hint: 1 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    pairSequence([
      'ember',
      'leaf',
      'bloom',
      'cloud',
      'shell',
      'berry',
      'ember',
      'leaf',
      'bloom',
      'cloud',
      'shell',
      'berry',
      'ember',
      'leaf',
      'bloom',
      'cloud',
      'shell',
      'berry',
    ]),
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
    summary: '顶部对子虽然还在，但中层会连续翻出新脸型，四格槽开始明显吃紧。',
    unlocksLevelId: 'crown-greenhouse-06',
    recommendedSelectionCount: 36,
    starSelectionThresholds: [36, 40, 44],
    startingAssists: { undo: 1, hint: 1 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    pairSequence([
      'pine',
      'wave',
      'bell',
      'leaf',
      'bloom',
      'shell',
      'pine',
      'wave',
      'bell',
      'leaf',
      'bloom',
      'shell',
      'pine',
      'wave',
      'bell',
      'leaf',
      'bloom',
      'shell',
    ]),
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
    summary: '终局会把六种头像频繁交错暴露，需要像 Vita Mahjong 一样精确控槽。',
    recommendedSelectionCount: 36,
    starSelectionThresholds: [36, 40, 45],
    startingAssists: { undo: 1, hint: 1 },
  },
  tiles: createTiles(
    STACK_36_SLOTS,
    pairSequence([
      'ember',
      'berry',
      'cloud',
      'pine',
      'bloom',
      'wave',
      'ember',
      'berry',
      'cloud',
      'pine',
      'bloom',
      'wave',
      'ember',
      'berry',
      'cloud',
      'pine',
      'bloom',
      'wave',
    ]),
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
