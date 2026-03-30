import type {
  AssistCharges,
  CampaignChapterDefinition,
  CampaignDefinition,
  ChapterRuleId,
  DynamicTileGroup,
  LevelDefinition,
  TileDefinition,
  TileType,
} from './types'
import { getLevelLayout } from './levelLayouts'
import { SHAPE_THEMES, type ShapeId } from './shapeThemes'

interface TileSlot {
  x: number
  y: number
  layer: number
}

interface ChapterBlueprint {
  id: string
  order: number
  title: string
  subtitle?: string
  summary: string
  rewardLabel?: string
  accentColor?: string
  tileCount: number
  chapterRuleId: ChapterRuleId
  chapterRuleLabel: string
  startingAssists: AssistCharges
}

type TileCountSpec = readonly [TileType, number]
type FillerPatternId = 'paired' | 'echo' | 'braid' | 'cross' | 'orbit'

interface LevelBlueprint {
  id: string
  name: string
  shapeId: ShapeId
  difficulty: NonNullable<LevelDefinition['difficulty']>
  chapterId: string
  order: number
  summary: string
  typePool: TileType[]
  fillerPattern: FillerPatternId
}

const TILE_COUNT_START = 36
const TILE_COUNT_STEP = 12
const TILE_COUNT_CAP_LEVEL = 5
const DYNAMIC_GROUP_SHARE = 0.2

function getTargetTileCount(order: number) {
  return TILE_COUNT_START + Math.min(order - 1, TILE_COUNT_CAP_LEVEL - 1) * TILE_COUNT_STEP
}

function createDistributedIndexSet(
  totalCount: number,
  targetCount: number,
  startRatio: number,
  usedIndices: Set<number>,
): Set<number> {
  const indices = new Set<number>()

  if (targetCount <= 0 || totalCount === 0) {
    return indices
  }

  for (let cursor = 0; indices.size < targetCount && cursor < totalCount * 8; cursor += 1) {
    const seedIndex = Math.floor(((cursor + startRatio) * totalCount) / targetCount) % totalCount

    for (let offset = 0; offset < totalCount; offset += 1) {
      const candidateIndex = (seedIndex + offset) % totalCount

      if (usedIndices.has(candidateIndex) || indices.has(candidateIndex)) {
        continue
      }

      indices.add(candidateIndex)
      break
    }
  }

  return indices
}

function assignDynamicGroups(tiles: TileDefinition[]): TileDefinition[] {
  const groupTileCount = Math.round(tiles.length * DYNAMIC_GROUP_SHARE)
  const usedIndices = new Set<number>()
  const shiftAIndices = createDistributedIndexSet(tiles.length, groupTileCount, 0.2, usedIndices)
  shiftAIndices.forEach((index) => usedIndices.add(index))
  const shiftBIndices = createDistributedIndexSet(tiles.length, groupTileCount, 0.7, usedIndices)

  return tiles.map((tile, index) => {
    let dynamicGroup: DynamicTileGroup | undefined

    if (shiftAIndices.has(index)) {
      dynamicGroup = 'shift-a'
    } else if (shiftBIndices.has(index)) {
      dynamicGroup = 'shift-b'
    }

    return dynamicGroup ? { ...tile, dynamicGroup } : tile
  })
}

function createTiles(slots: TileSlot[], types: TileType[]): TileDefinition[] {
  if (slots.length !== types.length) {
    throw new Error(`Tile slot count ${slots.length} does not match type count ${types.length}`)
  }

  const typeCounts = new Map<TileType, number>()

  const tiles = slots.map((slot, index) => {
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

  return assignDynamicGroups(tiles)
}

function rotatePool(typePool: TileType[], shift: number) {
  const normalizedShift = shift % typePool.length

  return [...typePool.slice(normalizedShift), ...typePool.slice(0, normalizedShift)]
}

function buildCounts(typePool: TileType[], tileCount: number): TileCountSpec[] {
  if (tileCount <= 0 || tileCount % 2 !== 0) {
    throw new Error(`Tile count ${tileCount} must be a positive even number`)
  }

  if (typePool.length === 0) {
    throw new Error('Type pool cannot be empty')
  }

  const evenBaseCount = Math.floor(tileCount / typePool.length / 2) * 2
  const counts = typePool.map((type) => [type, evenBaseCount] as [TileType, number])
  let remaining = tileCount - evenBaseCount * typePool.length
  let cursor = 0

  while (remaining > 0) {
    counts[cursor % counts.length][1] += 2
    remaining -= 2
    cursor += 1
  }

  return counts
}

function buildFillerPattern(patternId: FillerPatternId, typePool: TileType[]): TileType[] {
  switch (patternId) {
    case 'paired':
      return typePool.flatMap((type) => [type, type])
    case 'echo':
      return [...typePool, ...typePool]
    case 'braid':
      return typePool.flatMap((type, index) => [type, typePool[(index + 2) % typePool.length]])
    case 'cross': {
      const reversedPool = [...typePool].reverse()
      return typePool.flatMap((type, index) => [type, reversedPool[index]])
    }
    case 'orbit': {
      const evenTypes = typePool.filter((_, index) => index % 2 === 0)
      const oddTypes = typePool.filter((_, index) => index % 2 === 1)
      return [...evenTypes, ...oddTypes, ...evenTypes.slice().reverse(), ...oddTypes.slice().reverse()]
    }
    default:
      return [...typePool]
  }
}

function buildOpening(typePool: TileType[], order: number): TileType[] {
  const rotatedPool = rotatePool(typePool, order - 1)

  return [
    rotatedPool[0],
    rotatedPool[0],
    rotatedPool[1],
    rotatedPool[1],
    rotatedPool[2],
    rotatedPool[2],
  ]
}

function buildLevelTypes(
  slots: TileSlot[],
  openingCount: number,
  counts: TileCountSpec[],
  opening: TileType[],
  filler: TileType[],
): TileType[] {
  const totalTileCount = counts.reduce((count, [, tileCount]) => count + tileCount, 0)

  if (totalTileCount !== slots.length) {
    throw new Error(`Expected ${slots.length} tiles but received ${totalTileCount}`)
  }

  if (opening.length !== openingCount) {
    throw new Error(`Expected ${openingCount} opening tiles but received ${opening.length}`)
  }

  if (filler.length === 0) {
    throw new Error('Filler pattern cannot be empty')
  }

  const remainingCounts = new Map<TileType, number>(counts)
  const types: TileType[] = []

  opening.forEach((type) => {
    const remaining = remainingCounts.get(type) ?? 0

    if (remaining <= 0) {
      throw new Error(`Opening overuses tile type ${type}`)
    }

    remainingCounts.set(type, remaining - 1)
    types.push(type)
  })

  let cursor = 0
  const guardLimit = slots.length * filler.length * 24

  while (types.length < slots.length) {
    const type = filler[cursor % filler.length]
    const remaining = remainingCounts.get(type) ?? 0

    if (remaining > 0) {
      remainingCounts.set(type, remaining - 1)
      types.push(type)
    }

    cursor += 1

    if (cursor > guardLimit) {
      throw new Error('Unable to satisfy tile counts with the provided filler pattern')
    }
  }

  const unusedTypes = [...remainingCounts.entries()].filter(([, remaining]) => remaining !== 0)

  if (unusedTypes.length > 0) {
    throw new Error(`Unused tile counts remain: ${unusedTypes.map(([type, count]) => `${type}:${count}`).join(', ')}`)
  }

  return types
}

function buildStarThresholds(tileCount: number): [number, number, number] {
  return [tileCount, tileCount + 6, tileCount + 12]
}

const CHAPTER_BLUEPRINTS: ChapterBlueprint[] = [
  {
    id: 'chapter-bloom-path',
    order: 1,
    title: '基础堆叠',
    subtitle: '36-72 块 · 无暂存',
    summary: '前四关把块数放轻一档，先熟悉四槽顺序入槽与相邻成对，开局会给你 3 组明显安全对。',
    rewardLabel: '稳手起拍',
    accentColor: '#f0b165',
    tileCount: 72,
    chapterRuleId: 'classic',
    chapterRuleLabel: '基础堆叠',
    startingAssists: { undo: 3, hint: 6 },
  },
  {
    id: 'chapter-mirror-court',
    order: 2,
    title: '单轨暂存',
    subtitle: '84 块 · 尾牌寄存',
    summary: '解锁 1 个轨道暂存位，只能把托盘尾牌送出去，再从尾部接回，块数不再继续暴涨，开始学会缓冲错位单牌。',
    rewardLabel: '尾轨许可',
    accentColor: '#8db6f0',
    tileCount: 84,
    chapterRuleId: 'single-pocket-tail',
    chapterRuleLabel: '单轨暂存',
    startingAssists: { undo: 3, hint: 5 },
  },
  {
    id: 'chapter-sunset-orchard',
    order: 3,
    title: '逆向回放',
    subtitle: '84 块 · 头部回插',
    summary: '同样只有 1 个暂存位，但放回时会插到托盘头部，让你能主动重排相邻顺序，练熟经典控盘。',
    rewardLabel: '逆向回路',
    accentColor: '#ff9c62',
    tileCount: 84,
    chapterRuleId: 'single-pocket-head-return',
    chapterRuleLabel: '逆向回放',
    startingAssists: { undo: 2, hint: 4 },
  },
  {
    id: 'chapter-verdant-lab',
    order: 4,
    title: '自由换序',
    subtitle: '84 块 · 任意抽牌',
    summary: '可以把托盘中任意一张送进单轨暂存位，再从尾部回插，真正开始围绕托盘经营做决策。',
    rewardLabel: '换序通行证',
    accentColor: '#58c99b',
    tileCount: 84,
    chapterRuleId: 'single-pocket-any',
    chapterRuleLabel: '自由换序',
    startingAssists: { undo: 2, hint: 3 },
  },
  {
    id: 'chapter-starlit-canopy',
    order: 5,
    title: '双轨过载',
    subtitle: '84 块 · 双暂存',
    summary: '最终章开放双轨暂存位，任意托盘牌都能双线拆分，但块数保持封顶，让难度更多落在托盘经营本身。',
    rewardLabel: '双轨勋章',
    accentColor: '#8f92ff',
    tileCount: 84,
    chapterRuleId: 'double-pocket-any',
    chapterRuleLabel: '双轨过载',
    startingAssists: { undo: 1, hint: 2 },
  },
]

const LEVEL_BLUEPRINTS: LevelBlueprint[] = [
  {
    id: 'thorn-garden-01',
    name: '圆环阵列',
    shapeId: 'ring',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 1,
    summary: '圆环轮廓先让你在最小块数里练顺手拆对，开局就是三组直给安全对。',
    typePool: ['ember', 'leaf', 'bloom', 'bell'],
    fillerPattern: 'paired',
  },
  {
    id: 'lantern-steps-02',
    name: '三角架构',
    shapeId: 'tripod',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 2,
    summary: '三角架会把上窄下宽的节奏放大，但仍然是纯基础四槽博弈。',
    typePool: ['ember', 'leaf', 'bloom', 'bell'],
    fillerPattern: 'echo',
  },
  {
    id: 'ivy-arcade-03',
    name: '方匣框架',
    shapeId: 'boxFrame',
    difficulty: 'normal',
    chapterId: 'chapter-bloom-path',
    order: 3,
    summary: '方匣框把边缘层级围起来，开始让你思考先开边还是先消尾。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud'],
    fillerPattern: 'paired',
  },
  {
    id: 'mirror-court-04',
    name: '菱镜折线',
    shapeId: 'rhombus',
    difficulty: 'normal',
    chapterId: 'chapter-bloom-path',
    order: 4,
    summary: '第一章收尾关用菱镜斜线检查你的基础节奏，但仍然不需要暂存位。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud'],
    fillerPattern: 'cross',
  },
  {
    id: 'moon-pond-05',
    name: '波纹叠层',
    shapeId: 'ripple',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 5,
    summary: '波纹轮廓开始加入尾牌暂存，能先把错误单牌寄出去再继续接对。',
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell'],
    fillerPattern: 'paired',
  },
  {
    id: 'crown-greenhouse-06',
    name: '螺旋涡阵',
    shapeId: 'spiral',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 6,
    summary: '螺旋会把可点路径卷起来，尾牌寄存开始变成主动拆局工具。',
    typePool: ['ember', 'leaf', 'bloom', 'cloud', 'shell', 'berry'],
    fillerPattern: 'braid',
  },
  {
    id: 'sunset-orchard-07',
    name: '抛物拱桥',
    shapeId: 'parabola',
    difficulty: 'hard',
    chapterId: 'chapter-mirror-court',
    order: 7,
    summary: '抛物拱会把中段抬高，这时 60 块盘面已经足够考验尾牌暂存节奏。',
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    fillerPattern: 'echo',
  },
  {
    id: 'petal-carousel-08',
    name: '沙漏夹层',
    shapeId: 'hourglass',
    difficulty: 'hard',
    chapterId: 'chapter-mirror-court',
    order: 8,
    summary: '第二章终局会频繁逼你先寄存再回收，让沙漏腰部不再只是视觉变化。',
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    fillerPattern: 'orbit',
  },
  {
    id: 'prism-walk-09',
    name: '正弦桥面',
    shapeId: 'sineBridge',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 9,
    summary: '进入逆向回放后，暂存牌会从托盘头部回插，正弦桥会让这件事特别有价值。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    fillerPattern: 'braid',
  },
  {
    id: 'glass-canopy-10',
    name: '轨道环廊',
    shapeId: 'orbit',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 10,
    summary: '轨道环配合头部回插，会让你经常为了制造相邻对而先逆序铺路。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    fillerPattern: 'orbit',
  },
  {
    id: 'amber-terrace-11',
    name: '杠杆平台',
    shapeId: 'lever',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 11,
    summary: '杠杆平台把局势重心偏向一侧，逆向回插会明显放大先后手差异。',
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    fillerPattern: 'paired',
  },
  {
    id: 'fern-fairway-12',
    name: '滑轮井架',
    shapeId: 'pulley',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 12,
    summary: '第三章收官关把头部回插练到熟，后续自由换序才会真正顺手。',
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    fillerPattern: 'cross',
  },
  {
    id: 'mist-vault-13',
    name: '单摆回廊',
    shapeId: 'pendulum',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 13,
    summary: '自由换序阶段开始后，你终于能抽走托盘中段的牌，单摆轮廓会立刻用上这个能力。',
    typePool: ['ember', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    fillerPattern: 'paired',
  },
  {
    id: 'dew-labyrinth-14',
    name: '弹簧压栈',
    shapeId: 'spring',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 14,
    summary: '弹簧压栈会制造连续错位单牌，自由换序让你能主动拆掉最碍事的那一张。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    fillerPattern: 'orbit',
  },
  {
    id: 'nectar-engine-15',
    name: '斜面长坡',
    shapeId: 'incline',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 15,
    summary: '斜面长坡会把节奏拉成长线，自由换序让你能临时修补断开的对消路线。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    fillerPattern: 'cross',
  },
  {
    id: 'starlight-archive-16',
    name: '透镜光舱',
    shapeId: 'lens',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 16,
    summary: '第四章终局把自由换序和 86 块局面叠在一起，开始逼近最终章节奏。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    fillerPattern: 'orbit',
  },
  {
    id: 'comet-boulevard-17',
    name: '棱镜分光',
    shapeId: 'prism',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 17,
    summary: '双轨过载正式解锁，两条暂存位能拆双线死结，但块数也跟着推到 98。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    fillerPattern: 'cross',
  },
  {
    id: 'aurora-nursery-18',
    name: '磁场回线',
    shapeId: 'magnetism',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 18,
    summary: '磁场回线会把牌面分成两道路线，双轨暂存让你能同时保留两个未来解。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    fillerPattern: 'orbit',
  },
  {
    id: 'midnight-trellis-19',
    name: '音叉共振',
    shapeId: 'tuningFork',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 19,
    summary: '音叉共振把上部分叉拉得更明显，双轨暂存会更像真正的托盘调度台。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine', 'wave'],
    fillerPattern: 'orbit',
  },
  {
    id: 'dream-bloom-20',
    name: '原子轨道',
    shapeId: 'atom',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 20,
    summary: '终局把 9 类牌种和双轨暂存一起压进原子轨道里，要求你真正经营托盘顺序。',
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine', 'wave'],
    fillerPattern: 'orbit',
  },
]

const CHAPTERS_BY_ID = new Map(
  CHAPTER_BLUEPRINTS.map((chapter) => [chapter.id, chapter] as const),
)

const LEVELS: LevelDefinition[] = LEVEL_BLUEPRINTS.map((blueprint, index) => {
  const chapter = CHAPTERS_BY_ID.get(blueprint.chapterId)

  if (!chapter) {
    throw new Error(`Unknown chapter id ${blueprint.chapterId}`)
  }

  const tileCount = getTargetTileCount(blueprint.order)
  const layout = getLevelLayout(blueprint.shapeId, tileCount)
  const counts = buildCounts(blueprint.typePool, tileCount)
  const opening = buildOpening(blueprint.typePool, blueprint.order)
  const filler = buildFillerPattern(blueprint.fillerPattern, rotatePool(blueprint.typePool, index))
  const types = buildLevelTypes(layout.slots, layout.openingCount, counts, opening, filler)
  const nextLevelId = LEVEL_BLUEPRINTS[index + 1]?.id

  return {
    id: blueprint.id,
    name: blueprint.name,
    boardWidth: layout.boardWidth,
    boardHeight: layout.boardHeight,
    difficulty: blueprint.difficulty,
    campaign: {
      order: blueprint.order,
      chapterId: chapter.id,
      chapter: chapter.title,
      summary: blueprint.summary,
      shapeId: blueprint.shapeId,
      shapeLabel: SHAPE_THEMES[blueprint.shapeId].label,
      tileCount,
      chapterRuleId: 'classic',
      chapterRuleLabel: '经典四槽',
      unlocksLevelId: nextLevelId,
      recommendedSelectionCount: tileCount,
      starSelectionThresholds: buildStarThresholds(tileCount),
      startingAssists: chapter.startingAssists,
    },
    typePool: blueprint.typePool,
    tiles: createTiles(layout.slots, types),
  }
})

const LEVEL_IDS_BY_CHAPTER = LEVELS.reduce<Record<string, string[]>>((chapterLevelIds, level) => {
  const chapterId = level.campaign?.chapterId

  if (!chapterId) {
    return chapterLevelIds
  }

  chapterLevelIds[chapterId] ??= []
  chapterLevelIds[chapterId].push(level.id)
  return chapterLevelIds
}, {})

export const CAMPAIGN: CampaignDefinition = {
  id: 'brick-match-campaign-v2',
  name: 'zty乐信AI测试岗笔试题',
  chapters: CHAPTER_BLUEPRINTS.map((chapter) => ({
    ...chapter,
    levelIds: LEVEL_IDS_BY_CHAPTER[chapter.id] ?? [],
  })),
  levels: LEVELS,
}

export const CAMPAIGN_LEVELS: LevelDefinition[] = CAMPAIGN.levels

export const CAMPAIGN_LEVEL_IDS: string[] = CAMPAIGN_LEVELS.map((level) => level.id)

export const DEFAULT_LEVEL: LevelDefinition = CAMPAIGN_LEVELS[0]

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
    const levelChapterId =
      level.campaign?.chapterId ?? getCampaignChapterForLevel(level.id, campaign)?.id

    return levelChapterId === chapterId
  })
}
