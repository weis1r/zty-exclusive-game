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

type LevelLayoutId = 'stack144'
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

function repeatSlots(baseSlots: TileSlot[], copies: number, layerStride: number): TileSlot[] {
  const slots: TileSlot[] = []

  for (let copyIndex = copies - 1; copyIndex >= 0; copyIndex -= 1) {
    const layerOffset = copyIndex * layerStride

    baseSlots.forEach((slot) => {
      slots.push({
        ...slot,
        layer: slot.layer + layerOffset,
      })
    })
  }

  return slots
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

const STACK_144_SLOTS: TileSlot[] = repeatSlots(STACK_36_SLOTS, 4, 4)

const LEVEL_LAYOUTS: Record<LevelLayoutId, LevelLayoutDefinition> = {
  stack144: {
    slots: STACK_144_SLOTS,
    boardWidth: 356,
    boardHeight: 450,
    openingCount: 6,
  },
}

const CHAPTER_BLUEPRINTS: ChapterBlueprint[] = [
  {
    id: 'chapter-bloom-path',
    order: 1,
    title: '晨露花径',
    subtitle: '热身三关',
    summary: '前 3 关先让你熟悉“只消相邻对”的节奏，顶部四格槽必须按顺序经营。',
    rewardLabel: '露珠徽章',
    accentColor: '#f0b165',
  },
  {
    id: 'chapter-mirror-court',
    order: 2,
    title: '镜庭深处',
    subtitle: '转折三关',
    summary: '从这里开始，能看到的对子会变少，ABAC 这种断开的同类不会自动帮你收掉。',
    rewardLabel: '镜庭纹章',
    accentColor: '#8db6f0',
  },
  {
    id: 'chapter-sunset-orchard',
    order: 3,
    title: '晚照果园',
    subtitle: '变奏四关',
    summary: '这一章会把更多头像类型塞进 144 张物品里，要求你会提前为连续对腾位置。',
    rewardLabel: '落霞果徽',
    accentColor: '#ff9c62',
  },
  {
    id: 'chapter-verdant-lab',
    order: 4,
    title: '翠影工房',
    subtitle: '压阵五关',
    summary: '中后段开始把假对子和打断对混合出现，想过关就得控槽、记层、记顺序。',
    rewardLabel: '工房调色盘',
    accentColor: '#58c99b',
  },
  {
    id: 'chapter-starlit-canopy',
    order: 5,
    title: '星幕秘苑',
    subtitle: '终章五关',
    summary: '终章把 9 类头像全部带回场，最后几关会明显更花，但仍然保留稳定解法。',
    rewardLabel: '星幕冠饰',
    accentColor: '#8f92ff',
  },
]

const LEVEL_BLUEPRINTS: LevelBlueprint[] = [
  {
    id: 'thorn-garden-01',
    name: '荆棘迷圃',
    layout: 'stack144',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 1,
    summary: '开局直接给三组安全连续对，先习惯 144 张大盘面和四格顶部槽。',
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
    name: '灯影台阶',
    layout: 'stack144',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 2,
    summary: '仍然是 4 类头像，但会先给两对安全对子再混一张干扰牌。',
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
    name: '常青回廊',
    layout: 'stack144',
    difficulty: 'normal',
    chapterId: 'chapter-bloom-path',
    order: 3,
    summary: '章节收尾关加入第 5 类头像，开局只给一对明显对子，开始要求你选顺序。',
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
    name: '镜庭重楼',
    layout: 'stack144',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 4,
    summary: '新章节先给你一对稳的，再把剩下 4 张开局位全换成不同头像。',
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
    name: '月池回声',
    layout: 'stack144',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 5,
    summary: '相邻对开始藏在不同颜色之间，需要你先为第二张留出落点。',
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
    name: '冠冕温室',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-mirror-court',
    order: 6,
    summary: '第二章终局抬到 6 类头像，打断对会明显变多，ABAC 的误判从这里开始惩罚人。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 158, 168],
    startingAssists: { undo: 2, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'cloud', 'shell', 'berry'],
    countProfile: [30, 26, 24, 22, 22, 20],
    opening: ['ember', 'leaf', 'bloom', 'cloud', 'ember', 'shell'],
    fillerPattern: 'cross',
  },
  {
    id: 'sunset-orchard-07',
    name: '晚照果园',
    layout: 'stack144',
    difficulty: 'normal',
    chapterId: 'chapter-sunset-orchard',
    order: 7,
    summary: '第三章开场先把盘面做厚，但仍保留一对稳入口，帮助你重新找节奏。',
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
    name: '花瓣回旋',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 8,
    summary: '这关会频繁逼你先塞单张，再拼出后手连续对。',
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
    name: '棱镜步道',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 9,
    summary: '加入第 7 类头像后，开局可见类型更花，留错一个槽位就会断节奏。',
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
    name: '玻璃穹顶',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 10,
    summary: '章节收官关让 7 类头像同时轮转，最后两段会明显比前两关更碎。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 160, 174],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry'],
    countProfile: [22, 22, 20, 20, 20, 20, 20],
    opening: ['leaf', 'bloom', 'bell', 'cloud', 'berry', 'leaf'],
    fillerPattern: 'cross',
  },
  {
    id: 'amber-terrace-11',
    name: '琥珀阶庭',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 11,
    summary: '第四章开始把“记住槽尾是谁”这件事放到核心位置。',
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
    name: '蕨影长道',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 12,
    summary: '这一关会不断让你在连续对和开层之间做取舍。',
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
    name: '迷雾花库',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 13,
    summary: '能看见的对子会更像诱饵，真正稳的解法往往在第二手。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 164, 180],
    startingAssists: { undo: 1, hint: 1 },
    typePool: ['ember', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine'],
    countProfile: [24, 22, 20, 20, 20, 20, 18],
    opening: ['ember', 'cloud', 'shell', 'berry', 'ember', 'pine'],
    fillerPattern: 'cross',
  },
  {
    id: 'dew-labyrinth-14',
    name: '露华迷阵',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 14,
    summary: '后半章切到 8 类头像，局面会更花，但仍然保留一条稳定路线。',
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
    name: '蜜泉工坊',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 15,
    summary: '本章最后一关把 8 类头像压成更密的断对结构，要求你少犯顺序错误。',
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
    name: '星辉典藏馆',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 16,
    summary: '终章开场不再温柔，8 类头像会反复穿插，但还留着可控的首对。',
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
    name: '彗尾大道',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 17,
    summary: '会连续出现“先补单张再回收连续对”的节奏考题。',
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
    name: '极光苗圃',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 18,
    summary: '第 18 关会把记忆压力再往上推一档，为 9 类头像终局做预热。',
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
    name: '午夜藤架',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 19,
    summary: '最终章倒数第二关加入第 9 类头像，开局只给一对明显连续对。',
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
    name: '梦绽穹庭',
    layout: 'stack144',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 20,
    summary: '20 关终局把 9 类头像全部压进 144 张物品里，必须按顺序经营顶部四格槽。',
    recommendedSelectionCount: 144,
    starSelectionThresholds: [144, 174, 192],
    startingAssists: { undo: 1, hint: 0 },
    typePool: ['ember', 'leaf', 'bloom', 'bell', 'cloud', 'shell', 'berry', 'pine', 'wave'],
    countProfile: [16, 16, 16, 16, 16, 16, 16, 16, 16],
    opening: ['leaf', 'bloom', 'bell', 'cloud', 'berry', 'leaf'],
    fillerPattern: 'cross',
  },
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
