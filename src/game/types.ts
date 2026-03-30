export type TileType =
  | 'ember'
  | 'leaf'
  | 'bloom'
  | 'bell'
  | 'cloud'
  | 'shell'
  | 'berry'
  | 'pine'
  | 'wave'

export type DynamicTileGroup = 'shift-a' | 'shift-b'

export interface TileDefinition {
  id: string
  type: TileType
  x: number
  y: number
  layer: number
  dynamicGroup?: DynamicTileGroup
}

export interface AssistCharges {
  undo: number
  hint: number
}

export type ChapterRuleId =
  | 'classic'
  | 'single-pocket-tail'
  | 'single-pocket-head-return'
  | 'single-pocket-any'
  | 'double-pocket-any'

export interface CampaignLevelMeta {
  order: number
  chapterId?: string
  chapter: string
  summary: string
  shapeId?: string
  shapeLabel?: string
  tileCount?: number
  chapterRuleId?: ChapterRuleId
  chapterRuleLabel?: string
  unlocksLevelId?: string
  recommendedSelectionCount?: number
  // Thresholds are max picks for 3-star / 2-star / 1-star.
  starSelectionThresholds?: [number, number, number]
  startingAssists?: AssistCharges
}

export interface CampaignChapterDefinition {
  id: string
  order: number
  title: string
  subtitle?: string
  summary: string
  rewardLabel?: string
  accentColor?: string
  levelIds: string[]
}

export interface LevelDefinition {
  id: string
  name: string
  boardWidth: number
  boardHeight: number
  difficulty?: 'easy' | 'normal' | 'hard'
  campaign?: CampaignLevelMeta
  typePool?: TileType[]
  tiles: TileDefinition[]
}

export interface BoardTileState extends TileDefinition {
  removed: boolean
}

export interface TrayTile {
  entryId: string
  sourceTileId: string
  type: TileType
}

export type OrbitPocket = TrayTile | null

export interface MatchBurst {
  id: string
  slotIndex: number
  type: TileType
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

export interface GameStateSnapshot {
  boardTiles: BoardTileState[]
  trayTiles: TrayTile[]
  orbitPockets: OrbitPocket[]
  status: GameStatus
  selectedCount: number
  removedCount: number
  resolvedMatchIds: string[]
  matchBursts: MatchBurst[]
  lastHintTileId: string | null
  elapsedMs: number
}

export interface GameState {
  levelId: string
  boardTiles: BoardTileState[]
  trayTiles: TrayTile[]
  orbitPockets: OrbitPocket[]
  status: GameStatus
  selectedCount: number
  removedCount: number
  resolvedMatchIds: string[]
  matchBursts: MatchBurst[]
  assistCharges: AssistCharges
  lastHintTileId: string | null
  elapsedMs: number
  history: GameStateSnapshot[]
}

export type HintReason = 'ready-match' | 'tray-setup' | 'open-layer'

export interface HintSuggestion {
  tileId: string
  type: TileType
  reason: HintReason
}

export interface CampaignDefinition {
  id: string
  name: string
  chapters?: CampaignChapterDefinition[]
  levels: LevelDefinition[]
}

export interface LevelProgressRecord {
  levelId: string
  chapterId: string | null
  unlocked: boolean
  completed: boolean
  stars: number
  bestSelectedCount: number | null
  bestCompletionMs: number | null
  lastPlayedAt: number | null
  completedAt: number | null
}

export interface ChapterProgressRecord {
  chapterId: string
  unlocked: boolean
  completed: boolean
  levelIds: string[]
  unlockedLevelIds: string[]
  completedLevelIds: string[]
  earnedStars: number
  unlockedAt: number | null
  completedAt: number | null
}

export interface CampaignProgress {
  version: 1 | 2
  campaignId: string
  currentChapterId: string
  currentLevelId: string
  unlockedLevelIds: string[]
  completedLevelIds: string[]
  levelRecords: Record<string, LevelProgressRecord>
  chapterRecords: Record<string, ChapterProgressRecord>
  updatedAt: number
}

export interface LevelCompletionStats {
  levelId: string
  selectedCount: number
  completionMs?: number
}

export interface TileTheme {
  label: string
  title: string
  main: string
  accent: string
  shadow: string
  badge: string
  outline: string
  pattern: string
}

export interface GameConfig {
  matchCount: number
  trayCapacity: number
  boardWidth: number
  boardHeight: number
  tileWidth: number
  tileHeight: number
  blockerOverlapX: number
  blockerOverlapY: number
  boardScaleBase: number
  animationMs: {
    matchClear: number
    trayEntry: number
    modal: number
  }
}
