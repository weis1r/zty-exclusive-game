import type {
  AssistCharges,
  CampaignChapterDefinition,
  CampaignDefinition,
  LevelDefinition,
  TileDefinition,
  TileType,
} from './types'
import { LEVEL_LAYOUTS } from './levelLayouts'
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
  recommendedSelectionCount: number
  starSelectionThresholds: [number, number, number]
  startingAssists: AssistCharges
  typePool: TileType[]
  countProfile: readonly number[]
  opening: TileType[]
  fillerPattern: FillerPatternId
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
  layout: (typeof LEVEL_LAYOUTS)[ShapeId],
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

  opening.forEach((type) => {
    const remaining = remainingCounts.get(type) ?? 0

    if (remaining <= 0) {
      throw new Error(`Opening overuses tile type ${type}`)
    }

    remainingCounts.set(type, remaining - 1)
    types.push(type)
  })

  let cursor = 0
  const guardLimit = layout.slots.length * filler.length * 24

  while (types.length < layout.slots.length) {
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

const CHAPTER_BLUEPRINTS: ChapterBlueprint[] = [
  {
    id: 'chapter-bloom-path',
    order: 1,
    title: '几何基座',
    subtitle: '基础三关',
    summary: '从圆环、三角架到方匣框，先熟悉“只消相邻对”的节奏和图形化堆叠。',
    rewardLabel: '几何徽章',
    accentColor: '#f0b165',
  },
  {
    id: 'chapter-mirror-court',
    order: 2,
    title: '几何变奏',
    subtitle: '扩展三关',
    summary: '从菱镜、波纹到螺旋，轮廓开始更自由，开局稳对会被更多假动作打断。',
    rewardLabel: '形变纹章',
    accentColor: '#8db6f0',
  },
  {
    id: 'chapter-sunset-orchard',
    order: 3,
    title: '轨迹实验',
    subtitle: '曲线四关',
    summary: '抛物、沙漏、正弦桥与轨道环会让盘面轮廓明显弯起来，更考验你预留槽位的能力。',
    rewardLabel: '轨迹铭牌',
    accentColor: '#ff9c62',
  },
  {
    id: 'chapter-verdant-lab',
    order: 4,
    title: '力学装置',
    subtitle: '器械五关',
    summary: '杠杆、滑轮、单摆、弹簧和斜面会把外轮廓变成器械剪影，控槽失误的代价更高。',
    rewardLabel: '力学扳手',
    accentColor: '#58c99b',
  },
  {
    id: 'chapter-starlit-canopy',
    order: 5,
    title: '光学与场',
    subtitle: '终章五关',
    summary: '透镜、棱镜、磁场、音叉到原子轨道会把轮廓推到最复杂，但仍然保留稳定解法。',
    rewardLabel: '终章星徽',
    accentColor: '#8f92ff',
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
    summary: '以圆环轮廓热身，开局直接给三组安全连续对，先习惯 144 张大盘面和四格顶部槽。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 150, 156],
    startingAssists: { undo: 2, hint: 2 },
    typePool: ['ember', 'leaf', 'bloom', 'bell'],
    countProfile: [36, 36, 36, 36],
    opening: ['ember', 'ember', 'leaf', 'leaf', 'bloom', 'bloom'],
    fillerPattern: 'paired',
  },
  {
    id: 'lantern-steps-02',
    name: '三角架构',
    shapeId: 'tripod',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 2,
    summary: '三角架轮廓开始引入受力感，仍然是 4 类头像，但会先给两对安全对子再混一张干扰牌。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 152, 160],
    startingAssists: { undo: 2, hint: 2 },
    typePool: ['ember', 'leaf', 'bloom', 'bell'],
    countProfile: [40, 36, 34, 34],
    opening: ['ember', 'ember', 'leaf', 'leaf', 'bloom', 'bell'],
    fillerPattern: 'echo',
  },
  {
    id: 'ivy-arcade-03',
    name: '方匣框架',
    shapeId: 'boxFrame',
    difficulty: 'normal',
    chapterId: 'chapter-bloom-path',
    order: 3,
    summary: '方匣框开始把层级包起来，章节收尾关加入第 5 类头像，开局只给一对明显对子。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 154, 162],
    startingAssists: { undo: 2, hint: 2 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud'],
    countProfile: [32, 30, 30, 28, 24],
    opening: ['ember', 'leaf', 'ember', 'bloom', 'bell', 'cloud'],
    fillerPattern: 'echo',
  },
  {
    id: 'mirror-court-04',
    name: '菱镜折线',
    shapeId: 'rhombus',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 4,
    summary: '菱镜轮廓开始拉高斜向判断，新章节先给你一对稳的，再把剩下 4 张开局位换成不同头像。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 154, 164],
    startingAssists: { undo: 2, hint: 2 },
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell'],
    countProfile: [30, 30, 28, 28, 28],
    opening: ['leaf', 'leaf', 'bloom', 'bell', 'cloud', 'shell'],
    fillerPattern: 'paired',
  },
  {
    id: 'moon-pond-05',
    name: '波纹叠层',
    shapeId: 'ripple',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 5,
    summary: '波纹轮廓会让可见牌呈横向起伏，相邻对开始藏在不同颜色之间，需要先为第二张留落点。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 156, 166],
    startingAssists: { undo: 2, hint: 1 },
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell'],
    countProfile: [32, 30, 30, 28, 24],
    opening: ['leaf', 'bloom', 'cloud', 'leaf', 'bell', 'shell'],
    fillerPattern: 'braid',
  },
  {
    id: 'crown-greenhouse-06',
    name: '螺旋涡阵',
    shapeId: 'spiral',
    difficulty: 'hard',
    chapterId: 'chapter-mirror-court',
    order: 6,
    summary: '螺旋轮廓会把视线往中心卷，第二章终局抬到 6 类头像，ABAC 的误判从这里开始惩罚人。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 158, 168],
    startingAssists: { undo: 2, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'cloud', 'shell', 'berry'],
    countProfile: [30, 26, 24, 22, 22, 20],
    opening: ['ember', 'leaf', 'bloom', 'cloud', 'ember', 'shell'],
    fillerPattern: 'braid',
  },
  {
    id: 'sunset-orchard-07',
    name: '抛物拱桥',
    shapeId: 'parabola',
    difficulty: 'normal',
    chapterId: 'chapter-sunset-orchard',
    order: 7,
    summary: '抛物拱轮廓把中部抬高，第三章开场先把盘面做厚，但仍保留一对稳入口。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 156, 168],
    startingAssists: { undo: 2, hint: 1 },
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    countProfile: [28, 24, 24, 24, 22, 22],
    opening: ['leaf', 'leaf', 'bloom', 'cloud', 'shell', 'berry'],
    fillerPattern: 'paired',
  },
  {
    id: 'petal-carousel-08',
    name: '沙漏夹层',
    shapeId: 'hourglass',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 8,
    summary: '沙漏轮廓会在中腰收紧，这关会频繁逼你先塞单张，再拼出后手连续对。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 158, 170],
    startingAssists: { undo: 2, hint: 1 },
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    countProfile: [26, 24, 24, 24, 24, 22],
    opening: ['leaf', 'bloom', 'cloud', 'berry', 'leaf', 'shell'],
    fillerPattern: 'orbit',
  },
  {
    id: 'prism-walk-09',
    name: '正弦桥面',
    shapeId: 'sineBridge',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 9,
    summary: '正弦桥轮廓会让露出区域左右起伏，加入第 7 类头像后留错一个槽位就会断节奏。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 160, 172],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    countProfile: [24, 22, 20, 20, 20, 20, 18],
    opening: ['ember', 'leaf', 'bloom', 'cloud', 'ember', 'berry'],
    fillerPattern: 'braid',
  },
  {
    id: 'glass-canopy-10',
    name: '轨道环廊',
    shapeId: 'orbit',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 10,
    summary: '轨道环轮廓把盘面收成双轨迹，章节收官关让 7 类头像同时轮转，最后两段明显更碎。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 160, 174],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    countProfile: [22, 22, 20, 20, 20, 20, 20],
    opening: ['leaf', 'bloom', 'bell', 'cloud', 'berry', 'leaf'],
    fillerPattern: 'orbit',
  },
  {
    id: 'amber-terrace-11',
    name: '杠杆平台',
    shapeId: 'lever',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 11,
    summary: '杠杆轮廓把重心偏向一侧，第四章开始把“记住槽尾是谁”这件事放到核心位置。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 162, 176],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [24, 22, 20, 20, 20, 20, 18],
    opening: ['leaf', 'leaf', 'bloom', 'cloud', 'berry', 'pine'],
    fillerPattern: 'paired',
  },
  {
    id: 'fern-fairway-12',
    name: '滑轮井架',
    shapeId: 'pulley',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 12,
    summary: '滑轮轮廓会把上下路径拉开，这一关会不断让你在连续对和开层之间做取舍。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 164, 178],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [22, 22, 20, 20, 20, 20, 20],
    opening: ['bloom', 'cloud', 'bell', 'berry', 'bloom', 'pine'],
    fillerPattern: 'braid',
  },
  {
    id: 'mist-vault-13',
    name: '单摆回廊',
    shapeId: 'pendulum',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 13,
    summary: '单摆轮廓把注意力从上方支点甩到底部重球，能看见的对子会更像诱饵。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 164, 180],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [24, 22, 20, 20, 20, 20, 18],
    opening: ['ember', 'cloud', 'shell', 'berry', 'ember', 'pine'],
    fillerPattern: 'orbit',
  },
  {
    id: 'dew-labyrinth-14',
    name: '弹簧压栈',
    shapeId: 'spring',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 14,
    summary: '弹簧轮廓会形成反复折返的走向，后半章切到 8 类头像，局面更花但仍有稳定路线。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 166, 182],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [20, 18, 18, 18, 18, 18, 18, 16],
    opening: ['ember', 'leaf', 'bloom', 'cloud', 'berry', 'ember'],
    fillerPattern: 'orbit',
  },
  {
    id: 'nectar-engine-15',
    name: '斜面长坡',
    shapeId: 'incline',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 15,
    summary: '斜面轮廓会把堆叠拉成一条长坡，本章最后一关把 8 类头像压成更密的断对结构。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 166, 184],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [18, 18, 18, 18, 18, 18, 18, 18],
    opening: ['leaf', 'bloom', 'bell', 'cloud', 'shell', 'leaf'],
    fillerPattern: 'cross',
  },
  {
    id: 'starlight-archive-16',
    name: '透镜光舱',
    shapeId: 'lens',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 16,
    summary: '透镜轮廓在中段收紧、边缘鼓起，终章开场不再温柔，但还留着可控的首对。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 168, 184],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [20, 18, 18, 18, 18, 18, 18, 16],
    opening: ['ember', 'leaf', 'cloud', 'shell', 'ember', 'pine'],
    fillerPattern: 'orbit',
  },
  {
    id: 'comet-boulevard-17',
    name: '棱镜分光',
    shapeId: 'prism',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 17,
    summary: '棱镜轮廓会让盘面看起来像错位双三角，会连续出现“先补单张再回收连续对”的节奏考题。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 168, 186],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [18, 18, 18, 18, 18, 18, 18, 18],
    opening: ['leaf', 'bloom', 'bell', 'berry', 'pine', 'leaf'],
    fillerPattern: 'cross',
  },
  {
    id: 'aurora-nursery-18',
    name: '磁场回线',
    shapeId: 'magnetism',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 18,
    summary: '磁场回线把轮廓拉成上下两道场线，第 18 关会把记忆压力再往上推一档。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 170, 188],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [20, 18, 18, 18, 18, 18, 18, 16],
    opening: ['bloom', 'cloud', 'shell', 'pine', 'bloom', 'berry'],
    fillerPattern: 'orbit',
  },
  {
    id: 'midnight-trellis-19',
    name: '音叉共振',
    shapeId: 'tuningFork',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 19,
    summary: '音叉轮廓会在上方分岔、下方收束，最终章倒数第二关加入第 9 类头像，开局只给一对明显连续对。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 172, 190],
    startingAssists: { undo: 1, hint: 0 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine', 'wave'],
    countProfile: [16, 16, 16, 16, 16, 16, 16, 16, 16],
    opening: ['ember', 'leaf', 'bloom', 'cloud', 'shell', 'ember'],
    fillerPattern: 'orbit',
  },
  {
    id: 'dream-bloom-20',
    name: '原子轨道',
    shapeId: 'atom',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 20,
    summary: '20 关终局把 9 类头像全部压进原子轨道轮廓里，必须按顺序经营顶部四格槽。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 174, 192],
    startingAssists: { undo: 1, hint: 0 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine', 'wave'],
    countProfile: [16, 16, 16, 16, 16, 16, 16, 16, 16],
    opening: ['leaf', 'bloom', 'bell', 'cloud', 'berry', 'leaf'],
    fillerPattern: 'orbit',
  },
]

const CHAPTERS_BY_ID = new Map(
  CHAPTER_BLUEPRINTS.map((chapter) => [chapter.id, chapter] as const),
)

const LEVELS: LevelDefinition[] = LEVEL_BLUEPRINTS.map((blueprint, index) => {
  const layout = LEVEL_LAYOUTS[blueprint.shapeId]
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
      shapeId: blueprint.shapeId,
      shapeLabel: SHAPE_THEMES[blueprint.shapeId].label,
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
