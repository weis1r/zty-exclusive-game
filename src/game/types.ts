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

export interface TileDefinition {
  id: string
  type: TileType
  x: number
  y: number
  layer: number
}

export interface LevelDefinition {
  id: string
  name: string
  boardWidth: number
  boardHeight: number
  difficulty?: 'easy' | 'normal' | 'hard'
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

export interface MatchBurst {
  id: string
  slotIndex: number
  type: TileType
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

export interface GameState {
  levelId: string
  boardTiles: BoardTileState[]
  trayTiles: TrayTile[]
  status: GameStatus
  selectedCount: number
  removedCount: number
  resolvedMatchIds: string[]
  matchBursts: MatchBurst[]
}

export interface TileTheme {
  label: string
  title: string
  main: string
  accent: string
  shadow: string
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
