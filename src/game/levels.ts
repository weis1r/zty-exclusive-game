import type {
  AssistCharges,
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

interface LevelLayoutDefinition {
  slots: TileSlot[]
  boardWidth: number
  boardHeight: number
  openingCount: number
  tileCount: number
}

interface ChapterBlueprint {
  id: string
  order: number
  title: string
  subtitle?: string
  summary: string
  rewardLabel?: string
  accentColor?: string
}

type LevelLayoutId = 'stack48' | 'stack60' | 'stack72' | 'stack84'
type TileCountSpec = readonly [TileType, number]
type FillerPatternId = 'paired' | 'echo' | 'braid' | 'cross' | 'orbit'

interface LevelBlueprint {
  id: string
  name: string
  layout: LevelLayoutId
  difficulty: NonNullable<LevelDefinition['difficulty']>
  chapterId: string
  order: number
  summary: string
  recommendedSelectionCount: number
  starSelectionThresholds: [number, number, number]
  startingAssists: AssistCharges
  typePool: TileType[]
  countProfile: readonly number[]
  opening: TileType[]
  fillerPattern: FillerPatternId
}

interface LevelBlueprintInput {
  id: string
  name: string
  layout: LevelLayoutId
  difficulty: NonNullable<LevelDefinition['difficulty']>
  chapterId: string
  order: number
  summary: string
  chapterPool: TileType[]
  varietyCount: number
  fillerPattern: FillerPatternId
  favoredIndex?: number
}

const BOARD_WIDTH = 344
const BOARD_HEIGHT = 568
const TILE_WIDTH = 70
const STEP_X = 54
const STEP_Y = 58
const LAYER_SHIFT_Y = 18
const LAYER_SHIFT_X: Record<number, number> = {
  0: 0,
  1: 10,
  2: -8,
  3: 14,
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

function buildCounts(typePool: TileType[], countProfile: readonly number[]): TileCountSpec[] {
  if (typePool.length !== countProfile.length) {
    throw new Error('Type pool and count profile length must match')
  }

  return typePool.map((type, index) => {
    const count = countProfile[index]

    if (count <= 0 || count % 2 !== 0) {
      throw new Error(`Tile count for ${type} must be a positive even number`)
    }

    return [type, count] as const
  })
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

function buildLevelTypes(
  layout: LevelLayoutDefinition,
  counts: TileCountSpec[],
  opening: TileType[],
  filler: TileType[],
): TileType[] {
  const totalTileCount = counts.reduce((count, [, tileCount]) => count + tileCount, 0)

  if (totalTileCount !== layout.slots.length) {
    throw new Error(`Expected ${layout.slots.length} tiles but received ${totalTileCount}`)
  }

  if (opening.length !== layout.openingCount) {
    throw new Error(`Expected ${layout.openingCount} opening tiles but received ${opening.length}`)
  }

  if (filler.length === 0) {
    throw new Error('Filler pattern cannot be empty')
  }

  const remainingCounts = new Map<TileType, number>(counts)
  const types: TileType[] = []
  const fillerOrder = [...new Set(filler)]

  opening.forEach((type) => {
    const remaining = remainingCounts.get(type) ?? 0

    if (remaining <= 0) {
      throw new Error(`Opening overuses tile type ${type}`)
    }

    remainingCounts.set(type, remaining - 1)
    types.push(type)
  })

  let cursor = 0
  const guardLimit = layout.slots.length * Math.max(fillerOrder.length, 1) * 24

  while (types.length < layout.slots.length) {
    const type = fillerOrder[cursor % fillerOrder.length]
    const remaining = remainingCounts.get(type) ?? 0

    if (remaining >= 2) {
      remainingCounts.set(type, remaining - 2)
      types.push(type, type)
    }

    cursor += 1

    if (cursor > guardLimit) {
      throw new Error('Unable to satisfy tile counts with the provided filler pattern')
    }
  }

  const unusedTypes = [...remainingCounts.entries()].filter(([, remaining]) => remaining !== 0)

  if (unusedTypes.length > 0) {
    throw new Error(
      `Unused tile counts remain: ${unusedTypes.map(([type, count]) => `${type}:${count}`).join(', ')}`,
    )
  }

  return types
}

function createCenteredRowSlots(count: number, y: number, layer: number, shiftX = 0): TileSlot[] {
  const rowWidth = TILE_WIDTH + STEP_X * (count - 1)
  const startX = Math.round((BOARD_WIDTH - rowWidth) / 2 + shiftX)

  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * STEP_X,
    y,
    layer,
  }))
}

function buildLayoutSlots(rowCountsByLayer: Record<number, number[]>, startY: number): TileSlot[] {
  const slots: TileSlot[] = []

  for (let layer = 3; layer >= 0; layer -= 1) {
    const rowCounts = rowCountsByLayer[layer] ?? []

    rowCounts.forEach((count, rowIndex) => {
      const shiftX = LAYER_SHIFT_X[layer] + (rowIndex % 2 === 0 ? 0 : 6)
      const y = startY + rowIndex * STEP_Y - layer * LAYER_SHIFT_Y

      slots.push(...createCenteredRowSlots(count, y, layer, shiftX))
    })
  }

  return slots
}

const LEVEL_LAYOUTS: Record<LevelLayoutId, LevelLayoutDefinition> = {
  stack48: {
    slots: buildLayoutSlots(
      {
        3: [3, 3],
        2: [3, 4, 3],
        1: [4, 3, 4, 3],
        0: [4, 5, 5, 4],
      },
      248,
    ),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    openingCount: 6,
    tileCount: 48,
  },
  stack60: {
    slots: buildLayoutSlots(
      {
        3: [3, 3],
        2: [4, 4, 4],
        1: [4, 5, 4, 5],
        0: [5, 4, 5, 5, 5],
      },
      220,
    ),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    openingCount: 6,
    tileCount: 60,
  },
  stack72: {
    slots: buildLayoutSlots(
      {
        3: [4, 4],
        2: [4, 4, 4, 4],
        1: [5, 5, 5, 5],
        0: [5, 5, 6, 6, 6],
      },
      198,
    ),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    openingCount: 8,
    tileCount: 72,
  },
  stack84: {
    slots: buildLayoutSlots(
      {
        3: [5, 5],
        2: [4, 5, 4, 5],
        1: [6, 6, 6, 6],
        0: [6, 5, 5, 5, 5, 6],
      },
      188,
    ),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    openingCount: 10,
    tileCount: 84,
  },
}

function buildCountProfile(totalTiles: number, typePool: TileType[], favoredIndex = 0): readonly number[] {
  const baseCount = Math.floor(totalTiles / typePool.length / 2) * 2
  const counts = Array.from({ length: typePool.length }, () => baseCount)
  let remainder = totalTiles - baseCount * typePool.length
  let cursor = 0

  while (remainder > 0) {
    counts[(favoredIndex + cursor) % typePool.length] += 2
    remainder -= 2
    cursor += 1
  }

  return counts
}

function buildOpening(typePool: TileType[], openingCount: number): TileType[] {
  const openingTypes = typePool.slice(0, Math.max(1, Math.floor(openingCount / 2)))

  return openingTypes.flatMap((type) => [type, type]).slice(0, openingCount)
}

function getAssistCurve(order: number): AssistCharges {
  if (order <= 8) {
    return { undo: 2, hint: 2 }
  }

  if (order <= 16) {
    return { undo: 2, hint: 1 }
  }

  return { undo: 1, hint: 1 }
}

function getStarThresholds(tileCount: number, order: number): [number, number, number] {
  if (order <= 8) {
    return [tileCount, tileCount + 6, tileCount + 12]
  }

  if (order <= 16) {
    return [tileCount, tileCount + 8, tileCount + 16]
  }

  return [tileCount, tileCount + 10, tileCount + 18]
}

function createLevelBlueprint(input: LevelBlueprintInput): LevelBlueprint {
  const layout = LEVEL_LAYOUTS[input.layout]
  const typePool = input.chapterPool.slice(0, input.varietyCount)

  return {
    id: input.id,
    name: input.name,
    layout: input.layout,
    difficulty: input.difficulty,
    chapterId: input.chapterId,
    order: input.order,
    summary: input.summary,
    recommendedSelectionCount: layout.tileCount,
    starSelectionThresholds: getStarThresholds(layout.tileCount, input.order),
    startingAssists: getAssistCurve(input.order),
    typePool,
    countProfile: buildCountProfile(layout.tileCount, typePool, input.favoredIndex ?? 0),
    opening: buildOpening(typePool, layout.openingCount),
    fillerPattern: input.fillerPattern,
  }
}

const CHAPTER_POOLS: Record<string, TileType[]> = {
  'chapter-bloom-path': ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell'],
  'chapter-mirror-court': ['bloom', 'bell', 'cloud', 'shell', 'berry', 'pine', 'wave'],
  'chapter-sunset-orchard': ['cloud', 'shell', 'berry', 'pine', 'wave', 'spire', 'crown', 'mask'],
  'chapter-verdant-lab': ['berry', 'pine', 'wave', 'spire', 'crown', 'mask', 'plume', 'lantern', 'dagger'],
  'chapter-starlit-canopy': ['wave', 'spire', 'crown', 'mask', 'plume', 'lantern', 'dagger', 'harp', 'rose', 'comet', 'key', 'pearl'],
}

const CHAPTER_BLUEPRINTS: ChapterBlueprint[] = [
  {
    id: 'chapter-bloom-path',
    order: 1,
    title: '晨露花径',
    subtitle: '热身四关',
    summary: '先用 48 到 84 张的四步节奏带你熟悉可动牌、顶部四格槽和成对经营。',
    rewardLabel: '晨露木徽',
    accentColor: '#e5b36b',
  },
  {
    id: 'chapter-mirror-court',
    order: 2,
    title: '镜庭深处',
    subtitle: '镜面四关',
    summary: '这一章开始增加圈牌和条牌，要求你开始为后手连续对提前留口。',
    rewardLabel: '镜庭牌穗',
    accentColor: '#96b8d8',
  },
  {
    id: 'chapter-sunset-orchard',
    order: 3,
    title: '晚照果园',
    subtitle: '渐满四关',
    summary: '局面会明显更满，更多花色会同时露在第一眼里，但仍保留稳定起手对。',
    rewardLabel: '果园铜章',
    accentColor: '#df915f',
  },
  {
    id: 'chapter-verdant-lab',
    order: 4,
    title: '翠影工房',
    subtitle: '压阵四关',
    summary: '从这章开始要更认真经营顶部卡槽，连续错放单张会更容易把节奏拖死。',
    rewardLabel: '工房刻牌',
    accentColor: '#5aa37e',
  },
  {
    id: 'chapter-starlit-canopy',
    order: 5,
    title: '星幕秘苑',
    subtitle: '终章四关',
    summary: '终章会把更多图案混进同一套桌布里，84 张终局需要更稳的读层和记忆。',
    rewardLabel: '星幕牌印',
    accentColor: '#8d91c8',
  },
]

const LEVEL_BLUEPRINTS: LevelBlueprint[] = [
  createLevelBlueprint({
    id: 'thorn-garden-01',
    name: '荆棘迷圃',
    layout: 'stack48',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 1,
    summary: '48 张热身盘，先熟悉犬、猫、鱼、龙四种基础牌面和连续二消节奏。',
    chapterPool: CHAPTER_POOLS['chapter-bloom-path'],
    varietyCount: 4,
    fillerPattern: 'paired',
  }),
  createLevelBlueprint({
    id: 'lantern-steps-02',
    name: '灯影台阶',
    layout: 'stack60',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 2,
    summary: '60 张开始把云牌带进来，要求你在更密一点的层次里找安全对子。',
    chapterPool: CHAPTER_POOLS['chapter-bloom-path'],
    varietyCount: 5,
    fillerPattern: 'echo',
    favoredIndex: 1,
  }),
  createLevelBlueprint({
    id: 'ivy-arcade-03',
    name: '常青回廊',
    layout: 'stack72',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 3,
    summary: '72 张盘面第一次接近满铺，猴牌加入后需要更注意槽尾顺序。',
    chapterPool: CHAPTER_POOLS['chapter-bloom-path'],
    varietyCount: 6,
    fillerPattern: 'braid',
    favoredIndex: 2,
  }),
  createLevelBlueprint({
    id: 'dew-stair-04',
    name: '晨露阶厅',
    layout: 'stack84',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 4,
    summary: '本章最满的一盘 84 张，虽然图案只到 6 类，但层次已经像正式棋盘了。',
    chapterPool: CHAPTER_POOLS['chapter-bloom-path'],
    varietyCount: 6,
    fillerPattern: 'cross',
    favoredIndex: 3,
  }),
  createLevelBlueprint({
    id: 'mirror-court-05',
    name: '镜庭重楼',
    layout: 'stack48',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 5,
    summary: '第二章用新的圈牌起手，48 张短盘先让你适应更冷静的一组花色。',
    chapterPool: CHAPTER_POOLS['chapter-mirror-court'],
    varietyCount: 5,
    fillerPattern: 'paired',
    favoredIndex: 1,
  }),
  createLevelBlueprint({
    id: 'moon-pond-06',
    name: '月池回声',
    layout: 'stack60',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 6,
    summary: '60 张盘面把五环带进来，能看见的对子变多，但错手也更容易断节奏。',
    chapterPool: CHAPTER_POOLS['chapter-mirror-court'],
    varietyCount: 6,
    fillerPattern: 'braid',
    favoredIndex: 2,
  }),
  createLevelBlueprint({
    id: 'silver-river-07',
    name: '银流长道',
    layout: 'stack72',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 7,
    summary: '72 张盘面继续升密度，七类图案会开始让第一眼判断更花。',
    chapterPool: CHAPTER_POOLS['chapter-mirror-court'],
    varietyCount: 6,
    fillerPattern: 'cross',
    favoredIndex: 3,
  }),
  createLevelBlueprint({
    id: 'glass-canopy-08',
    name: '玻璃穹顶',
    layout: 'stack84',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 8,
    summary: '84 张收官盘把本章的 7 类牌全部铺进来，考验你在满铺下找连续对。',
    chapterPool: CHAPTER_POOLS['chapter-mirror-court'],
    varietyCount: 7,
    fillerPattern: 'orbit',
    favoredIndex: 4,
  }),
  createLevelBlueprint({
    id: 'sunset-orchard-09',
    name: '晚照果园',
    layout: 'stack48',
    difficulty: 'normal',
    chapterId: 'chapter-sunset-orchard',
    order: 9,
    summary: '第三章从 48 张重新起步，但花色密度和视觉复杂度都比前两章更高。',
    chapterPool: CHAPTER_POOLS['chapter-sunset-orchard'],
    varietyCount: 6,
    fillerPattern: 'echo',
    favoredIndex: 2,
  }),
  createLevelBlueprint({
    id: 'petal-carousel-10',
    name: '花瓣回旋',
    layout: 'stack60',
    difficulty: 'normal',
    chapterId: 'chapter-sunset-orchard',
    order: 10,
    summary: '60 张盘面开始加入字牌，前手看似安全的对子更常只是中转站。',
    chapterPool: CHAPTER_POOLS['chapter-sunset-orchard'],
    varietyCount: 7,
    fillerPattern: 'braid',
    favoredIndex: 3,
  }),
  createLevelBlueprint({
    id: 'prism-walk-11',
    name: '棱镜步道',
    layout: 'stack72',
    difficulty: 'normal',
    chapterId: 'chapter-sunset-orchard',
    order: 11,
    summary: '72 张盘里会同时露出更多同色图案，辨认轮廓比辨认颜色更重要。',
    chapterPool: CHAPTER_POOLS['chapter-sunset-orchard'],
    varietyCount: 7,
    fillerPattern: 'cross',
    favoredIndex: 4,
  }),
  createLevelBlueprint({
    id: 'crystal-vault-12',
    name: '水晶花库',
    layout: 'stack84',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 12,
    summary: '84 张收官盘把 8 类牌面都压进来，第一眼已经接近完整成局的感觉。',
    chapterPool: CHAPTER_POOLS['chapter-sunset-orchard'],
    varietyCount: 8,
    fillerPattern: 'orbit',
    favoredIndex: 5,
  }),
  createLevelBlueprint({
    id: 'amber-terrace-13',
    name: '琥珀阶庭',
    layout: 'stack48',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 13,
    summary: '第四章开场即把新条牌和字牌压在一起，48 张也会有不小的识别压力。',
    chapterPool: CHAPTER_POOLS['chapter-verdant-lab'],
    varietyCount: 7,
    fillerPattern: 'paired',
    favoredIndex: 3,
  }),
  createLevelBlueprint({
    id: 'fern-fairway-14',
    name: '蕨影长道',
    layout: 'stack60',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 14,
    summary: '60 张里新花色继续增加，顺手点单张的代价会越来越高。',
    chapterPool: CHAPTER_POOLS['chapter-verdant-lab'],
    varietyCount: 8,
    fillerPattern: 'braid',
    favoredIndex: 4,
  }),
  createLevelBlueprint({
    id: 'mist-vault-15',
    name: '迷雾花库',
    layout: 'stack72',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 15,
    summary: '72 张盘面里的 8 类牌开始更像正式残局，顶部四格槽必须主动经营。',
    chapterPool: CHAPTER_POOLS['chapter-verdant-lab'],
    varietyCount: 8,
    fillerPattern: 'cross',
    favoredIndex: 5,
  }),
  createLevelBlueprint({
    id: 'nectar-engine-16',
    name: '蜜泉工坊',
    layout: 'stack84',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 16,
    summary: '本章最满的一盘把 9 类牌铺满棋盘，要求你在更花的局面里看见连续机会。',
    chapterPool: CHAPTER_POOLS['chapter-verdant-lab'],
    varietyCount: 9,
    fillerPattern: 'orbit',
    favoredIndex: 6,
  }),
  createLevelBlueprint({
    id: 'starlight-archive-17',
    name: '星辉典藏馆',
    layout: 'stack48',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 17,
    summary: '终章短盘直接给 8 类牌面，让你先适应更成熟的一组字纹和花牌组合。',
    chapterPool: CHAPTER_POOLS['chapter-starlit-canopy'],
    varietyCount: 8,
    fillerPattern: 'echo',
    favoredIndex: 4,
  }),
  createLevelBlueprint({
    id: 'comet-boulevard-18',
    name: '彗尾大道',
    layout: 'stack60',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 18,
    summary: '60 张盘面加入 9 类终章花色后，图案辨识与记忆会一起开始发力。',
    chapterPool: CHAPTER_POOLS['chapter-starlit-canopy'],
    varietyCount: 9,
    fillerPattern: 'cross',
    favoredIndex: 5,
  }),
  createLevelBlueprint({
    id: 'aurora-nursery-19',
    name: '极光苗圃',
    layout: 'stack72',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 19,
    summary: '72 张盘把 10 类牌同时带进来，图案接近但结构不同，越往后越要稳。',
    chapterPool: CHAPTER_POOLS['chapter-starlit-canopy'],
    varietyCount: 10,
    fillerPattern: 'orbit',
    favoredIndex: 6,
  }),
  createLevelBlueprint({
    id: 'dream-bloom-20',
    name: '梦绽穹庭',
    layout: 'stack84',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 20,
    summary: '终局 84 张把 12 类牌面全部压进同一桌布里，需要稳定读层和连续收对。',
    chapterPool: CHAPTER_POOLS['chapter-starlit-canopy'],
    varietyCount: 12,
    fillerPattern: 'cross',
    favoredIndex: 7,
  }),
]

const CHAPTERS_BY_ID = new Map(
  CHAPTER_BLUEPRINTS.map((chapter) => [chapter.id, chapter] as const),
)

const LEVELS: LevelDefinition[] = LEVEL_BLUEPRINTS.map((blueprint, index) => {
  const layout = LEVEL_LAYOUTS[blueprint.layout]
  const chapter = CHAPTERS_BY_ID.get(blueprint.chapterId)
  const nextLevelId = LEVEL_BLUEPRINTS[index + 1]?.id
  const counts = buildCounts(blueprint.typePool, blueprint.countProfile)
  const filler = buildFillerPattern(blueprint.fillerPattern, blueprint.typePool)
  const types = buildLevelTypes(layout, counts, blueprint.opening, filler)

  if (!chapter) {
    throw new Error(`Unknown chapter id ${blueprint.chapterId}`)
  }

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
      unlocksLevelId: nextLevelId,
      recommendedSelectionCount: blueprint.recommendedSelectionCount,
      starSelectionThresholds: blueprint.starSelectionThresholds,
      startingAssists: blueprint.startingAssists,
    },
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
  name: '朱天宇专属游戏',
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
