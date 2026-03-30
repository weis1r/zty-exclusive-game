import type {
  AssistCharges,
  BoardTileState,
  GameConfig,
  GameState,
  GameStateSnapshot,
  GameStatus,
  HintSuggestion,
  LevelDefinition,
  MatchBurst,
  TileDefinition,
  TileType,
  TrayTile,
} from './types'

function createBoardTiles(level: LevelDefinition): BoardTileState[] {
  return level.tiles.map((tile) => ({
    ...tile,
    removed: false,
  }))
}

function cloneBoardTiles(boardTiles: BoardTileState[]): BoardTileState[] {
  return boardTiles.map((tile) => ({ ...tile }))
}

function cloneTrayTiles(trayTiles: TrayTile[]): TrayTile[] {
  return trayTiles.map((tile) => ({ ...tile }))
}

function cloneMatchBursts(matchBursts: MatchBurst[]): MatchBurst[] {
  return matchBursts.map((burst) => ({ ...burst }))
}

function overlaps(topTile: TileDefinition, bottomTile: TileDefinition, config: GameConfig) {
  return (
    Math.abs(topTile.x - bottomTile.x) < config.blockerOverlapX &&
    Math.abs(topTile.y - bottomTile.y) < config.blockerOverlapY
  )
}

function createTrayEntry(tile: TileDefinition, selectionNumber: number): TrayTile {
  return {
    entryId: `${tile.id}-${selectionNumber}`,
    sourceTileId: tile.id,
    type: tile.type,
  }
}

function resolveTrayMatches(
  trayTiles: TrayTile[],
  matchCount: number,
): { nextTrayTiles: TrayTile[]; matchBursts: MatchBurst[] } {
  const typeCounts = new Map<string, number>()

  trayTiles.forEach((trayTile) => {
    typeCounts.set(trayTile.type, (typeCounts.get(trayTile.type) ?? 0) + 1)
  })

  const removalsByType = new Map<string, number>()

  typeCounts.forEach((count, type) => {
    if (count >= matchCount) {
      removalsByType.set(type, Math.floor(count / matchCount) * matchCount)
    }
  })

  const nextTrayTiles: TrayTile[] = []
  const matchBursts: MatchBurst[] = []

  trayTiles.forEach((trayTile, slotIndex) => {
    const remainingRemovals = removalsByType.get(trayTile.type) ?? 0

    if (remainingRemovals > 0) {
      removalsByType.set(trayTile.type, remainingRemovals - 1)
      matchBursts.push({
        id: trayTile.entryId,
        slotIndex,
        type: trayTile.type,
      })
      return
    }

    nextTrayTiles.push(trayTile)
  })

  return {
    nextTrayTiles,
    matchBursts,
  }
}

function getStartingAssistCharges(level: LevelDefinition): AssistCharges {
  return {
    undo: level.campaign?.startingAssists?.undo ?? 1,
    hint: level.campaign?.startingAssists?.hint ?? 2,
  }
}

function createSnapshot(state: GameState): GameStateSnapshot {
  return {
    boardTiles: cloneBoardTiles(state.boardTiles),
    trayTiles: cloneTrayTiles(state.trayTiles),
    status: state.status,
    selectedCount: state.selectedCount,
    removedCount: state.removedCount,
    resolvedMatchIds: [...state.resolvedMatchIds],
    matchBursts: cloneMatchBursts(state.matchBursts),
    lastHintTileId: state.lastHintTileId,
  }
}

function pushHistory(state: GameState): GameStateSnapshot[] {
  const nextHistory = [...state.history, createSnapshot(state)]
  return nextHistory.slice(-20)
}

function getTrayTypeCounts(trayTiles: TrayTile[]) {
  const counts = new Map<TileType, number>()

  trayTiles.forEach((trayTile) => {
    counts.set(trayTile.type, (counts.get(trayTile.type) ?? 0) + 1)
  })

  return counts
}

function getSortedExposedTiles(state: GameState, config: GameConfig): BoardTileState[] {
  return getRemainingBoardTiles(state)
    .filter((tile) => !isTileBlocked(tile.id, state, config))
    .sort((leftTile, rightTile) => {
      if (leftTile.layer !== rightTile.layer) {
        return rightTile.layer - leftTile.layer
      }

      if (leftTile.y !== rightTile.y) {
        return leftTile.y - rightTile.y
      }

      return leftTile.x - rightTile.x
    })
}

export function createInitialGameState(
  level: LevelDefinition,
  status: GameStatus = 'idle',
): GameState {
  return {
    levelId: level.id,
    boardTiles: createBoardTiles(level),
    trayTiles: [],
    status,
    selectedCount: 0,
    removedCount: 0,
    resolvedMatchIds: [],
    matchBursts: [],
    assistCharges: getStartingAssistCharges(level),
    lastHintTileId: null,
    history: [],
  }
}

export function startGame(level: LevelDefinition): GameState {
  return createInitialGameState(level, 'playing')
}

export function restartGame(level: LevelDefinition): GameState {
  return createInitialGameState(level, 'playing')
}

export function clearResolvedMatches(state: GameState): GameState {
  if (state.matchBursts.length === 0 && state.resolvedMatchIds.length === 0) {
    return state
  }

  return {
    ...state,
    matchBursts: [],
    resolvedMatchIds: [],
  }
}

export function clearHint(state: GameState): GameState {
  if (state.lastHintTileId === null) {
    return state
  }

  return {
    ...state,
    lastHintTileId: null,
  }
}

export function getRemainingBoardTiles(state: GameState): BoardTileState[] {
  return state.boardTiles.filter((tile) => !tile.removed)
}

export function isTileBlocked(
  tileId: string,
  state: GameState,
  config: GameConfig,
): boolean {
  const tile = state.boardTiles.find(
    (candidateTile) => candidateTile.id === tileId && !candidateTile.removed,
  )

  if (!tile) {
    return false
  }

  return state.boardTiles.some(
    (candidateTile) =>
      !candidateTile.removed &&
      candidateTile.layer > tile.layer &&
      overlaps(candidateTile, tile, config),
  )
}

export function insertIntoTray(trayTiles: TrayTile[], nextTile: TrayTile): TrayTile[] {
  const lastSameIndex = trayTiles.findLastIndex(
    (existingTile) => existingTile.type === nextTile.type,
  )

  if (lastSameIndex === -1) {
    return [...trayTiles, nextTile]
  }

  return [
    ...trayTiles.slice(0, lastSameIndex + 1),
    nextTile,
    ...trayTiles.slice(lastSameIndex + 1),
  ]
}

export function canUseUndo(state: GameState): boolean {
  return (
    state.status !== 'idle' &&
    state.matchBursts.length === 0 &&
    state.assistCharges.undo > 0 &&
    state.history.length > 0
  )
}

export function useUndo(state: GameState): GameState {
  if (!canUseUndo(state)) {
    return state
  }

  const previousSnapshot = state.history[state.history.length - 1]

  return {
    ...state,
    ...previousSnapshot,
    assistCharges: {
      ...state.assistCharges,
      undo: state.assistCharges.undo - 1,
    },
    history: state.history.slice(0, -1),
    lastHintTileId: null,
  }
}

export function getHintSuggestion(
  state: GameState,
  config: GameConfig,
): HintSuggestion | null {
  if (state.status !== 'playing' || state.matchBursts.length > 0) {
    return null
  }

  const exposedTiles = getSortedExposedTiles(state, config)

  if (exposedTiles.length === 0) {
    return null
  }

  const trayTypeCounts = getTrayTypeCounts(state.trayTiles)
  const exposedTypeCounts = new Map<TileType, number>()

  exposedTiles.forEach((tile) => {
    exposedTypeCounts.set(tile.type, (exposedTypeCounts.get(tile.type) ?? 0) + 1)
  })

  const readyMatchTile = exposedTiles.find(
    (tile) => (trayTypeCounts.get(tile.type) ?? 0) >= config.matchCount - 1,
  )

  if (readyMatchTile) {
    return {
      tileId: readyMatchTile.id,
      type: readyMatchTile.type,
      reason: 'ready-match',
    }
  }

  const traySetupTile = exposedTiles.find(
    (tile) =>
      (trayTypeCounts.get(tile.type) ?? 0) === 0 &&
      (exposedTypeCounts.get(tile.type) ?? 0) >= config.matchCount,
  )

  if (traySetupTile) {
    return {
      tileId: traySetupTile.id,
      type: traySetupTile.type,
      reason: 'tray-setup',
    }
  }

  let bestType: TileType | null = null
  let bestCount = -1

  exposedTypeCounts.forEach((count, type) => {
    if (count > bestCount) {
      bestType = type
      bestCount = count
    }
  })

  if (!bestType) {
    return null
  }

  const openLayerTile = exposedTiles.find((tile) => tile.type === bestType) ?? null

  if (!openLayerTile) {
    return null
  }

  return {
    tileId: openLayerTile.id,
    type: openLayerTile.type,
    reason: 'open-layer',
  }
}

export function useHint(state: GameState, config: GameConfig): GameState {
  if (
    state.status !== 'playing' ||
    state.matchBursts.length > 0 ||
    state.assistCharges.hint <= 0
  ) {
    return state
  }

  const suggestion = getHintSuggestion(state, config)

  if (!suggestion) {
    return state
  }

  return {
    ...state,
    assistCharges: {
      ...state.assistCharges,
      hint: state.assistCharges.hint - 1,
    },
    lastHintTileId: suggestion.tileId,
  }
}

export function pickTile(
  state: GameState,
  tileId: string,
  level: LevelDefinition,
  config: GameConfig,
): GameState {
  if (state.status !== 'playing' || state.matchBursts.length > 0) {
    return state
  }

  const targetTile = state.boardTiles.find((tile) => tile.id === tileId)

  if (!targetTile || targetTile.removed || isTileBlocked(tileId, state, config)) {
    return state
  }

  const nextBoardTiles = state.boardTiles.map((tile) =>
    tile.id === tileId
      ? {
          ...tile,
          removed: true,
        }
      : tile,
  )
  const nextSelectionCount = state.selectedCount + 1
  const trayCandidate = createTrayEntry(targetTile, nextSelectionCount)
  const insertedTrayTiles = insertIntoTray(state.trayTiles, trayCandidate)
  const { nextTrayTiles, matchBursts } = resolveTrayMatches(
    insertedTrayTiles,
    config.matchCount,
  )

  const nextResolvedMatchIds = matchBursts.map((burst) => burst.id)
  const remainingBoardTileCount = nextBoardTiles.filter((tile) => !tile.removed).length

  let nextStatus: GameStatus = 'playing'

  if (remainingBoardTileCount === 0 && nextTrayTiles.length === 0) {
    nextStatus = 'won'
  } else if (remainingBoardTileCount === 0) {
    nextStatus = 'lost'
  } else if (nextTrayTiles.length >= config.trayCapacity) {
    nextStatus = 'lost'
  }

  return {
    ...state,
    levelId: level.id,
    boardTiles: nextBoardTiles,
    trayTiles: nextTrayTiles,
    status: nextStatus,
    selectedCount: nextSelectionCount,
    removedCount: state.removedCount + matchBursts.length,
    resolvedMatchIds: nextResolvedMatchIds,
    matchBursts,
    lastHintTileId: null,
    history: pushHistory(state),
  }
}
