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

type LevelLayoutId = 'stack36' | 'stair27'
type TileCountSpec = readonly [TileType, number]

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
  counts: TileCountSpec[]
  opening: TileType[]
  filler: TileType[]
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

const LEVEL_LAYOUTS: Record<LevelLayoutId, LevelLayoutDefinition> = {
  stack36: {
    slots: STACK_36_SLOTS,
    boardWidth: 360,
    boardHeight: 520,
    openingCount: 6,
  },
  stair27: {
    slots: STAIR_27_SLOTS,
    boardWidth: 360,
    boardHeight: 520,
    openingCount: 9,
  },
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
  const guardLimit = layout.slots.length * filler.length * 12

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
    title: '晨露花径',
    subtitle: '热身三关',
    summary: '起手不再白送两组三连，但仍会给你足够空间熟悉节奏。',
    rewardLabel: '露珠徽章',
    accentColor: '#f0b165',
  },
  {
    id: 'chapter-mirror-court',
    order: 2,
    title: '镜庭深处',
    subtitle: '转折三关',
    summary: '从这里开始要学会看下一层，很多局面只会给你一组三连入口。',
    rewardLabel: '镜庭纹章',
    accentColor: '#8db6f0',
  },
  {
    id: 'chapter-sunset-orchard',
    order: 3,
    title: '晚照果园',
    subtitle: '进阶四关',
    summary: '颜色和类型都在回升，适合把之前学会的留槽意识用起来。',
    rewardLabel: '落霞果徽',
    accentColor: '#ff9c62',
  },
  {
    id: 'chapter-verdant-lab',
    order: 4,
    title: '翠影工房',
    subtitle: '挑战五关',
    summary: '这一章会更常出现双对子与假入口，选错一步就得多补一轮。',
    rewardLabel: '工房调色盘',
    accentColor: '#58c99b',
  },
  {
    id: 'chapter-starlit-canopy',
    order: 5,
    title: '星幕秘苑',
    subtitle: '终章五关',
    summary: '终章保留可解空间，但会把六类砖块重新摆回台面，考验整体节奏。',
    rewardLabel: '星幕冠饰',
    accentColor: '#8f92ff',
  },
]

const LEVEL_BLUEPRINTS: LevelBlueprint[] = [
  {
    id: 'thorn-garden-01',
    name: '荆棘迷圃',
    layout: 'stack36',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 1,
    summary: '起手只有一组三连，先从“看见能消”和“保留对子”开始。',
    recommendedSelectionCount: 42,
    starSelectionThresholds: [37, 44, 52],
    startingAssists: { undo: 2, hint: 2 },
    counts: [
      ['ember', 9],
      ['leaf', 9],
      ['bloom', 9],
      ['bell', 9],
    ],
    opening: ['ember', 'leaf', 'ember', 'bloom', 'ember', 'leaf'],
    filler: ['bell', 'leaf', 'bloom', 'ember', 'bell', 'leaf', 'bloom', 'ember'],
  },
  {
    id: 'lantern-steps-02',
    name: '灯影台阶',
    layout: 'stair27',
    difficulty: 'easy',
    chapterId: 'chapter-bloom-path',
    order: 2,
    summary: '顶层能看见一组三连，但剩下的要靠你自己整理出第二波。',
    recommendedSelectionCount: 32,
    starSelectionThresholds: [29, 35, 41],
    startingAssists: { undo: 2, hint: 2 },
    counts: [
      ['ember', 6],
      ['leaf', 6],
      ['bloom', 6],
      ['bell', 9],
    ],
    opening: ['ember', 'leaf', 'bell', 'bloom', 'ember', 'bell', 'leaf', 'bloom', 'bell'],
    filler: ['ember', 'leaf', 'bloom', 'bell', 'bell', 'ember', 'leaf', 'bloom'],
  },
  {
    id: 'ivy-arcade-03',
    name: '常青回廊',
    layout: 'stack36',
    difficulty: 'normal',
    chapterId: 'chapter-bloom-path',
    order: 3,
    summary: '不再直给双三连，得先判断哪一种更值得先腾槽。',
    recommendedSelectionCount: 44,
    starSelectionThresholds: [39, 46, 54],
    startingAssists: { undo: 2, hint: 2 },
    counts: [
      ['bloom', 9],
      ['cloud', 9],
      ['leaf', 9],
      ['bell', 9],
    ],
    opening: ['bloom', 'cloud', 'leaf', 'bloom', 'bell', 'cloud'],
    filler: ['leaf', 'bell', 'bloom', 'cloud', 'leaf', 'bell', 'bloom', 'cloud'],
  },
  {
    id: 'mirror-court-04',
    name: '镜庭重楼',
    layout: 'stack36',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 4,
    summary: '顶层只给两组对子，开始要求你主动预判下一层的第三张。',
    recommendedSelectionCount: 45,
    starSelectionThresholds: [40, 47, 56],
    startingAssists: { undo: 2, hint: 2 },
    counts: [
      ['shell', 9],
      ['wave', 9],
      ['cloud', 9],
      ['berry', 9],
    ],
    opening: ['shell', 'wave', 'shell', 'cloud', 'berry', 'wave'],
    filler: ['cloud', 'berry', 'shell', 'wave', 'cloud', 'berry', 'shell', 'wave'],
  },
  {
    id: 'moon-pond-05',
    name: '月池回声',
    layout: 'stack36',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 5,
    summary: '同屏仍只有四类，但三消入口不止一个，顺序错误会拖慢整局。',
    recommendedSelectionCount: 46,
    starSelectionThresholds: [41, 48, 57],
    startingAssists: { undo: 2, hint: 2 },
    counts: [
      ['berry', 9],
      ['shell', 9],
      ['pine', 9],
      ['cloud', 9],
    ],
    opening: ['berry', 'shell', 'pine', 'berry', 'cloud', 'shell'],
    filler: ['pine', 'cloud', 'berry', 'shell', 'pine', 'cloud', 'berry', 'shell'],
  },
  {
    id: 'crown-greenhouse-06',
    name: '冠冕温室',
    layout: 'stack36',
    difficulty: 'normal',
    chapterId: 'chapter-mirror-court',
    order: 6,
    summary: '六类砖块重新回场，但起手仍保留一对安全对子，作为进入长战役前的分界线。',
    recommendedSelectionCount: 48,
    starSelectionThresholds: [43, 50, 60],
    startingAssists: { undo: 2, hint: 2 },
    counts: [
      ['cloud', 6],
      ['pine', 6],
      ['wave', 6],
      ['bloom', 6],
      ['ember', 6],
      ['berry', 6],
    ],
    opening: ['cloud', 'pine', 'wave', 'cloud', 'pine', 'bloom'],
    filler: ['wave', 'bloom', 'ember', 'berry', 'cloud', 'pine'],
  },
  {
    id: 'sunset-orchard-07',
    name: '晚照果园',
    layout: 'stair27',
    difficulty: 'normal',
    chapterId: 'chapter-sunset-orchard',
    order: 7,
    summary: '新章节会把提示感收一点，但台阶局仍然会给你可控的节奏入口。',
    recommendedSelectionCount: 33,
    starSelectionThresholds: [30, 36, 42],
    startingAssists: { undo: 2, hint: 2 },
    counts: [
      ['wave', 6],
      ['leaf', 6],
      ['bell', 6],
      ['cloud', 9],
    ],
    opening: ['wave', 'leaf', 'cloud', 'bell', 'wave', 'cloud', 'leaf', 'bell', 'cloud'],
    filler: ['bell', 'leaf', 'wave', 'cloud', 'bell', 'leaf', 'wave', 'cloud'],
  },
  {
    id: 'petal-carousel-08',
    name: '花瓣回旋',
    layout: 'stack36',
    difficulty: 'normal',
    chapterId: 'chapter-sunset-orchard',
    order: 8,
    summary: '顶层会给一组对子和一组错位对子，适合练“先拆哪一边”。',
    recommendedSelectionCount: 46,
    starSelectionThresholds: [41, 48, 57],
    startingAssists: { undo: 2, hint: 2 },
    counts: [
      ['ember', 9],
      ['berry', 9],
      ['cloud', 9],
      ['pine', 9],
    ],
    opening: ['ember', 'berry', 'cloud', 'ember', 'pine', 'berry'],
    filler: ['cloud', 'pine', 'ember', 'berry', 'cloud', 'pine', 'ember', 'berry'],
  },
  {
    id: 'prism-walk-09',
    name: '棱镜步道',
    layout: 'stair27',
    difficulty: 'normal',
    chapterId: 'chapter-sunset-orchard',
    order: 9,
    summary: '五类砖块第一次真正混在一起，台阶局也开始要求更少的误点。',
    recommendedSelectionCount: 34,
    starSelectionThresholds: [31, 37, 43],
    startingAssists: { undo: 2, hint: 1 },
    counts: [
      ['ember', 6],
      ['leaf', 6],
      ['bloom', 6],
      ['cloud', 6],
      ['bell', 3],
    ],
    opening: ['ember', 'leaf', 'bloom', 'cloud', 'ember', 'bell', 'leaf', 'bloom', 'cloud'],
    filler: ['bell', 'ember', 'leaf', 'bloom', 'cloud', 'ember', 'leaf', 'bloom', 'cloud'],
  },
  {
    id: 'glass-canopy-10',
    name: '玻璃穹顶',
    layout: 'stack36',
    difficulty: 'hard',
    chapterId: 'chapter-sunset-orchard',
    order: 10,
    summary: '这是中盘的第一次硬一点的关，六类砖块同时出现，但顶部仍给你一组保底对子。',
    recommendedSelectionCount: 49,
    starSelectionThresholds: [44, 52, 61],
    startingAssists: { undo: 2, hint: 1 },
    counts: [
      ['ember', 6],
      ['shell', 6],
      ['berry', 6],
      ['bell', 6],
      ['cloud', 6],
      ['wave', 6],
    ],
    opening: ['ember', 'shell', 'berry', 'bell', 'cloud', 'shell'],
    filler: ['wave', 'ember', 'berry', 'cloud', 'bell', 'shell'],
  },
  {
    id: 'amber-terrace-11',
    name: '琥珀阶庭',
    layout: 'stack36',
    difficulty: 'normal',
    chapterId: 'chapter-verdant-lab',
    order: 11,
    summary: '从这里开始，表面上的“对子很多”不代表能马上消，你得留心第三张藏在哪。',
    recommendedSelectionCount: 47,
    starSelectionThresholds: [42, 49, 58],
    startingAssists: { undo: 2, hint: 1 },
    counts: [
      ['leaf', 9],
      ['bloom', 6],
      ['bell', 6],
      ['pine', 6],
      ['wave', 9],
    ],
    opening: ['leaf', 'bloom', 'wave', 'bell', 'leaf', 'pine'],
    filler: ['wave', 'bloom', 'bell', 'pine', 'leaf'],
  },
  {
    id: 'fern-fairway-12',
    name: '蕨影长道',
    layout: 'stair27',
    difficulty: 'normal',
    chapterId: 'chapter-verdant-lab',
    order: 12,
    summary: '台阶局回来了，但这一关更像小考，顶层虽然有三连入口，顺手贪多会被反卡。',
    recommendedSelectionCount: 34,
    starSelectionThresholds: [31, 37, 43],
    startingAssists: { undo: 2, hint: 1 },
    counts: [
      ['shell', 6],
      ['berry', 6],
      ['cloud', 6],
      ['pine', 9],
    ],
    opening: ['shell', 'berry', 'pine', 'cloud', 'shell', 'pine', 'berry', 'cloud', 'pine'],
    filler: ['shell', 'berry', 'cloud', 'pine', 'shell', 'berry', 'cloud', 'pine'],
  },
  {
    id: 'mist-vault-13',
    name: '迷雾花库',
    layout: 'stack36',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 13,
    summary: '六类砖块第二次回场，这次顶部不会让你一眼看出答案。',
    recommendedSelectionCount: 50,
    starSelectionThresholds: [45, 53, 62],
    startingAssists: { undo: 2, hint: 1 },
    counts: [
      ['ember', 6],
      ['leaf', 6],
      ['bloom', 6],
      ['bell', 6],
      ['cloud', 6],
      ['berry', 6],
    ],
    opening: ['ember', 'leaf', 'bloom', 'ember', 'bell', 'cloud'],
    filler: ['berry', 'leaf', 'bloom', 'bell', 'cloud', 'ember'],
  },
  {
    id: 'dew-labyrinth-14',
    name: '露华迷阵',
    layout: 'stack36',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 14,
    summary: '同类很多，但入口故意拆散成两组对子，要比前几关更舍得留空位。',
    recommendedSelectionCount: 50,
    starSelectionThresholds: [45, 53, 62],
    startingAssists: { undo: 2, hint: 1 },
    counts: [
      ['shell', 9],
      ['wave', 9],
      ['pine', 9],
      ['berry', 9],
    ],
    opening: ['shell', 'wave', 'pine', 'berry', 'shell', 'wave'],
    filler: ['pine', 'berry', 'shell', 'wave', 'pine', 'berry', 'shell', 'wave'],
  },
  {
    id: 'nectar-engine-15',
    name: '蜜泉工坊',
    layout: 'stair27',
    difficulty: 'hard',
    chapterId: 'chapter-verdant-lab',
    order: 15,
    summary: '顶层没有现成三连，必须靠你自己先把两种对子摆顺。',
    recommendedSelectionCount: 35,
    starSelectionThresholds: [32, 38, 45],
    startingAssists: { undo: 1, hint: 1 },
    counts: [
      ['ember', 6],
      ['leaf', 6],
      ['cloud', 6],
      ['wave', 6],
      ['berry', 3],
    ],
    opening: ['ember', 'leaf', 'cloud', 'wave', 'ember', 'leaf', 'cloud', 'wave', 'berry'],
    filler: ['berry', 'ember', 'leaf', 'cloud', 'wave', 'ember', 'leaf', 'cloud', 'wave'],
  },
  {
    id: 'starlight-archive-16',
    name: '星辉典藏馆',
    layout: 'stack36',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 16,
    summary: '终章第一关会先用温和的开局提醒你：现在不能再只看眼前两步。',
    recommendedSelectionCount: 50,
    starSelectionThresholds: [45, 53, 62],
    startingAssists: { undo: 1, hint: 1 },
    counts: [
      ['leaf', 6],
      ['bloom', 6],
      ['bell', 6],
      ['cloud', 6],
      ['pine', 6],
      ['wave', 6],
    ],
    opening: ['leaf', 'bloom', 'bell', 'cloud', 'pine', 'bloom'],
    filler: ['wave', 'leaf', 'bell', 'cloud', 'pine', 'bloom'],
  },
  {
    id: 'comet-boulevard-17',
    name: '彗尾大道',
    layout: 'stack36',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 17,
    summary: '四类砖块重新归拢，但每一类都被拆成很多小段，节奏会更像拉锯战。',
    recommendedSelectionCount: 49,
    starSelectionThresholds: [44, 52, 60],
    startingAssists: { undo: 1, hint: 1 },
    counts: [
      ['ember', 9],
      ['bell', 9],
      ['shell', 9],
      ['wave', 9],
    ],
    opening: ['ember', 'bell', 'shell', 'ember', 'wave', 'bell'],
    filler: ['shell', 'wave', 'ember', 'bell', 'shell', 'wave', 'ember', 'bell'],
  },
  {
    id: 'aurora-nursery-18',
    name: '极光苗圃',
    layout: 'stair27',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 18,
    summary: '九张可见砖里只有两组对子，台阶局也开始真正考验忍耐力。',
    recommendedSelectionCount: 36,
    starSelectionThresholds: [33, 39, 45],
    startingAssists: { undo: 1, hint: 1 },
    counts: [
      ['bloom', 6],
      ['shell', 6],
      ['pine', 6],
      ['wave', 6],
      ['cloud', 3],
    ],
    opening: ['bloom', 'shell', 'pine', 'wave', 'bloom', 'shell', 'pine', 'wave', 'cloud'],
    filler: ['cloud', 'bloom', 'shell', 'pine', 'wave', 'bloom', 'shell', 'pine', 'wave'],
  },
  {
    id: 'midnight-trellis-19',
    name: '午夜藤架',
    layout: 'stack36',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 19,
    summary: '这一关会给你很多“差一点就能消”的假象，是终章里最容易心急的一局。',
    recommendedSelectionCount: 51,
    starSelectionThresholds: [46, 54, 63],
    startingAssists: { undo: 1, hint: 1 },
    counts: [
      ['ember', 6],
      ['leaf', 6],
      ['shell', 6],
      ['berry', 6],
      ['pine', 6],
      ['wave', 6],
    ],
    opening: ['ember', 'leaf', 'shell', 'berry', 'pine', 'leaf'],
    filler: ['wave', 'ember', 'shell', 'berry', 'pine', 'leaf'],
  },
  {
    id: 'dream-bloom-20',
    name: '梦绽穹庭',
    layout: 'stack36',
    difficulty: 'hard',
    chapterId: 'chapter-starlit-canopy',
    order: 20,
    summary: '最终关不给花哨机制，只把二十关里学过的节奏全部叠回来。',
    recommendedSelectionCount: 52,
    starSelectionThresholds: [47, 55, 64],
    startingAssists: { undo: 1, hint: 1 },
    counts: [
      ['bloom', 6],
      ['bell', 6],
      ['cloud', 6],
      ['shell', 6],
      ['berry', 6],
      ['pine', 6],
    ],
    opening: ['bloom', 'bell', 'cloud', 'shell', 'berry', 'bell'],
    filler: ['pine', 'bloom', 'cloud', 'shell', 'berry', 'bell'],
  },
]

function createCampaignLevels(): LevelDefinition[] {
  const chapterTitles = new Map(
    CHAPTER_BLUEPRINTS.map((chapter) => [chapter.id, chapter.title] as const),
  )

  return LEVEL_BLUEPRINTS.map((blueprint, index) => {
    const layout = LEVEL_LAYOUTS[blueprint.layout]
    const chapterTitle = chapterTitles.get(blueprint.chapterId)

    if (!chapterTitle) {
      throw new Error(`Missing chapter title for ${blueprint.chapterId}`)
    }

    return {
      id: blueprint.id,
      name: blueprint.name,
      boardWidth: layout.boardWidth,
      boardHeight: layout.boardHeight,
      difficulty: blueprint.difficulty,
      campaign: {
        order: blueprint.order,
        chapterId: blueprint.chapterId,
        chapter: chapterTitle,
        summary: blueprint.summary,
        unlocksLevelId: LEVEL_BLUEPRINTS[index + 1]?.id,
        recommendedSelectionCount: blueprint.recommendedSelectionCount,
        starSelectionThresholds: blueprint.starSelectionThresholds,
        startingAssists: blueprint.startingAssists,
      },
      tiles: createTiles(
        layout.slots,
        buildLevelTypes(layout, blueprint.counts, blueprint.opening, blueprint.filler),
      ),
    }
  })
}

const LEVELS = createCampaignLevels()

const CHAPTERS: CampaignChapterDefinition[] = CHAPTER_BLUEPRINTS.map((chapter) => ({
  ...chapter,
  levelIds: LEVELS.filter((level) => level.campaign?.chapterId === chapter.id).map((level) => level.id),
}))

export const CAMPAIGN: CampaignDefinition = {
  id: 'brick-match-campaign-v2',
  name: '朱天宇专属游戏',
  chapters: CHAPTERS,
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
