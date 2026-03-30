import type {
  AssistCharges,
  BoardTileState,
  ChapterRuleId,
  DynamicTileGroup,
  GameConfig,
  GameState,
  GameStateSnapshot,
  GameStatus,
  HintSuggestion,
  LevelDefinition,
  LossReason,
  MatchBurst,
  OrbitPocket,
  TileDefinition,
  TileType,
  TrayTile,
} from './types'

const TILE_SHIFT_CYCLE_MS = 3000
const TILE_SHIFT_SELECTABLE_WINDOW_MS = 1000
const TILE_SHIFT_BEHAVIOR: Record<
  DynamicTileGroup,
  { direction: 1 | -1; phaseOffsetMs: number }
> = {
  'shift-a': {
    direction: 1,
    phaseOffsetMs: 0,
  },
  'shift-b': {
    direction: -1,
    phaseOffsetMs: 1500,
  },
}

export interface TileCycleState {
  group: DynamicTileGroup
  direction: 1 | -1
  selectable: boolean
  phaseMs: number
  msUntilSelectable: number
  msUntilShift: number
}

interface ChapterRuleSettings {
  pocketCapacity: number
  trayMoveMode: 'none' | 'tail' | 'any'
  releaseTarget: 'head' | 'tail'
}

interface ExposedTileState extends BoardTileState {
  currentType: TileType
}

interface GameStartOptions {
  assistChargesOverride?: Partial<AssistCharges>
  timerRemainingMs?: number
}

const CHAPTER_RULE_SETTINGS: Record<ChapterRuleId, ChapterRuleSettings> = {
  classic: {
    pocketCapacity: 0,
    trayMoveMode: 'none',
    releaseTarget: 'tail',
  },
  'single-pocket-tail': {
    pocketCapacity: 1,
    trayMoveMode: 'tail',
    releaseTarget: 'tail',
  },
  'single-pocket-head-return': {
    pocketCapacity: 1,
    trayMoveMode: 'tail',
    releaseTarget: 'head',
  },
  'single-pocket-any': {
    pocketCapacity: 1,
    trayMoveMode: 'any',
    releaseTarget: 'tail',
  },
  'double-pocket-any': {
    pocketCapacity: 2,
    trayMoveMode: 'any',
    releaseTarget: 'tail',
  },
}

export function getChapterRuleId(level: LevelDefinition): ChapterRuleId {
  return level.campaign?.chapterRuleId ?? 'classic'
}

export function getPocketCapacityForRule(ruleId: ChapterRuleId): number {
  return CHAPTER_RULE_SETTINGS[ruleId].pocketCapacity
}

export function getPocketCapacity(level: LevelDefinition): number {
  return getPocketCapacityForRule(getChapterRuleId(level))
}

function getChapterRuleSettings(level: LevelDefinition): ChapterRuleSettings {
  return CHAPTER_RULE_SETTINGS[getChapterRuleId(level)]
}

function createOrbitPockets(level: LevelDefinition): OrbitPocket[] {
  return Array.from({ length: getPocketCapacity(level) }, () => null)
}

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

function cloneOrbitPockets(orbitPockets: OrbitPocket[]): OrbitPocket[] {
  return orbitPockets.map((pocketTile) => (pocketTile ? { ...pocketTile } : null))
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

function createTrayEntry(
  tile: TileDefinition,
  resolvedType: TileType,
  selectionNumber: number,
): TrayTile {
  return {
    entryId: `${tile.id}-${selectionNumber}`,
    sourceTileId: tile.id,
    type: resolvedType,
  }
}

function resolveTrayMatches(
  trayTiles: TrayTile[],
  matchCount: number,
): { nextTrayTiles: TrayTile[]; matchBursts: MatchBurst[] } {
  const matchBursts: MatchBurst[] = []
  let nextTrayTiles = [...trayTiles]
  let foundMatch = true

  while (foundMatch) {
    foundMatch = false

    for (let cursor = 0; cursor < nextTrayTiles.length; cursor += 1) {
      const runStart = cursor
      const runType = nextTrayTiles[cursor].type

      while (cursor + 1 < nextTrayTiles.length && nextTrayTiles[cursor + 1].type === runType) {
        cursor += 1
      }

      const runLength = cursor - runStart + 1

      if (runLength < matchCount) {
        continue
      }

      const removableCount = Math.floor(runLength / matchCount) * matchCount

      for (let offset = 0; offset < removableCount; offset += 1) {
        const trayTile = nextTrayTiles[runStart + offset]

        matchBursts.push({
          id: trayTile.entryId,
          slotIndex: runStart + offset,
          type: trayTile.type,
        })
      }

      nextTrayTiles = [
        ...nextTrayTiles.slice(0, runStart),
        ...nextTrayTiles.slice(runStart + removableCount),
      ]
      foundMatch = true
      break
    }
  }

  return {
    nextTrayTiles,
    matchBursts,
  }
}

function getStartingAssistCharges(
  level: LevelDefinition,
  assistChargesOverride?: Partial<AssistCharges>,
): AssistCharges {
  return {
    undo: level.campaign?.startingAssists?.undo ?? 1,
    hint: level.campaign?.startingAssists?.hint ?? 2,
    ...assistChargesOverride,
  }
}

function createSnapshot(state: GameState): GameStateSnapshot {
  return {
    boardTiles: cloneBoardTiles(state.boardTiles),
    trayTiles: cloneTrayTiles(state.trayTiles),
    orbitPockets: cloneOrbitPockets(state.orbitPockets),
    status: state.status,
    selectedCount: state.selectedCount,
    removedCount: state.removedCount,
    resolvedMatchIds: [...state.resolvedMatchIds],
    matchBursts: cloneMatchBursts(state.matchBursts),
    lastHintTileId: state.lastHintTileId,
    elapsedMs: state.elapsedMs,
    timerRemainingMs: state.timerRemainingMs,
    lossReason: state.lossReason,
  }
}

function pushHistory(state: GameState): GameStateSnapshot[] {
  const nextHistory = [...state.history, createSnapshot(state)]
  return nextHistory.slice(-20)
}

function getTrayTailRun(trayTiles: TrayTile[]) {
  const lastTrayTile = trayTiles.at(-1)

  if (!lastTrayTile) {
    return null
  }

  let count = 0

  for (let index = trayTiles.length - 1; index >= 0; index -= 1) {
    if (trayTiles[index].type !== lastTrayTile.type) {
      break
    }

    count += 1
  }

  return {
    type: lastTrayTile.type,
    count,
  }
}

function getLevelTypePool(level: LevelDefinition): TileType[] {
  if (level.typePool && level.typePool.length > 0) {
    return level.typePool
  }

  return level.tiles.reduce<TileType[]>((types, tile) => {
    if (types.includes(tile.type)) {
      return types
    }

    return [...types, tile.type]
  }, [])
}

export function getTileCycleState(
  tile: TileDefinition,
  elapsedMs: number,
): TileCycleState | null {
  if (!tile.dynamicGroup) {
    return null
  }

  const behavior = TILE_SHIFT_BEHAVIOR[tile.dynamicGroup]
  const phaseMs =
    (((elapsedMs + behavior.phaseOffsetMs) % TILE_SHIFT_CYCLE_MS) + TILE_SHIFT_CYCLE_MS) %
    TILE_SHIFT_CYCLE_MS
  const selectable = phaseMs >= TILE_SHIFT_CYCLE_MS - TILE_SHIFT_SELECTABLE_WINDOW_MS

  return {
    group: tile.dynamicGroup,
    direction: behavior.direction,
    selectable,
    phaseMs,
    msUntilSelectable: selectable
      ? 0
      : TILE_SHIFT_CYCLE_MS - TILE_SHIFT_SELECTABLE_WINDOW_MS - phaseMs,
    msUntilShift: TILE_SHIFT_CYCLE_MS - phaseMs,
  }
}

export function isTileSelectableInCurrentCycle(
  tile: TileDefinition,
  elapsedMs: number,
): boolean {
  return getTileCycleState(tile, elapsedMs)?.selectable ?? true
}

export function getDisplayedTileType(
  tile: TileDefinition,
  level: LevelDefinition,
  elapsedMs: number,
): TileType {
  const cycleState = getTileCycleState(tile, elapsedMs)

  if (!cycleState) {
    return tile.type
  }

  const typePool = getLevelTypePool(level)
  const baseTypeIndex = typePool.indexOf(tile.type)

  if (baseTypeIndex === -1 || typePool.length === 0) {
    return tile.type
  }

  const behavior = TILE_SHIFT_BEHAVIOR[cycleState.group]
  const shiftSteps = Math.floor((elapsedMs + behavior.phaseOffsetMs) / TILE_SHIFT_CYCLE_MS)
  const nextTypeIndex =
    (((baseTypeIndex + shiftSteps * behavior.direction) % typePool.length) + typePool.length) %
    typePool.length

  return typePool[nextTypeIndex]
}

function getSortedExposedTiles(
  state: GameState,
  level: LevelDefinition,
  config: GameConfig,
): ExposedTileState[] {
  return getRemainingBoardTiles(state)
    .filter(
      (tile) =>
        !isTileBlocked(tile.id, state, config) &&
        isTileSelectableInCurrentCycle(tile, state.elapsedMs),
    )
    .map((tile) => ({
      ...tile,
      currentType: getDisplayedTileType(tile, level, state.elapsedMs),
    }))
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

function resolveGameStatus(
  remainingBoardTileCount: number,
  trayTiles: TrayTile[],
  trayCapacity: number,
): { status: GameStatus; lossReason: LossReason | null } {
  if (remainingBoardTileCount === 0 && trayTiles.length === 0) {
    return {
      status: 'won',
      lossReason: null,
    }
  }

  if (remainingBoardTileCount === 0 || trayTiles.length >= trayCapacity) {
    return {
      status: 'lost',
      lossReason: 'stuck',
    }
  }

  return {
    status: 'playing',
    lossReason: null,
  }
}

function insertPocketTileIntoTray(
  trayTiles: TrayTile[],
  trayTile: TrayTile,
  releaseTarget: ChapterRuleSettings['releaseTarget'],
): TrayTile[] {
  return releaseTarget === 'head' ? [trayTile, ...trayTiles] : [...trayTiles, trayTile]
}

export function createInitialGameState(
  level: LevelDefinition,
  status: GameStatus = 'idle',
  options: GameStartOptions = {},
): GameState {
  return {
    levelId: level.id,
    boardTiles: createBoardTiles(level),
    trayTiles: [],
    orbitPockets: createOrbitPockets(level),
    status,
    selectedCount: 0,
    removedCount: 0,
    resolvedMatchIds: [],
    matchBursts: [],
    assistCharges: getStartingAssistCharges(level, options.assistChargesOverride),
    lastHintTileId: null,
    elapsedMs: 0,
    timerRemainingMs: options.timerRemainingMs ?? 90_000,
    lossReason: null,
    history: [],
  }
}

export function startGame(level: LevelDefinition, options: GameStartOptions = {}): GameState {
  return createInitialGameState(level, 'playing', options)
}

export function restartGame(level: LevelDefinition, options: GameStartOptions = {}): GameState {
  return createInitialGameState(level, 'playing', options)
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

export function advanceGameTime(state: GameState, elapsedMsDelta: number): GameState {
  if (state.status !== 'playing' || elapsedMsDelta <= 0) {
    return state
  }

  const nextTimerRemainingMs = Math.max(0, state.timerRemainingMs - elapsedMsDelta)

  if (nextTimerRemainingMs === 0) {
    return {
      ...state,
      elapsedMs: state.elapsedMs + elapsedMsDelta,
      timerRemainingMs: 0,
      status: 'lost',
      lossReason: 'time-up',
      lastHintTileId: null,
    }
  }

  return {
    ...state,
    elapsedMs: state.elapsedMs + elapsedMsDelta,
    timerRemainingMs: nextTimerRemainingMs,
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
  return [...trayTiles, nextTile]
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
  level: LevelDefinition,
  config: GameConfig,
): HintSuggestion | null {
  if (state.status !== 'playing' || state.matchBursts.length > 0) {
    return null
  }

  const exposedTiles = getSortedExposedTiles(state, level, config)

  if (exposedTiles.length === 0) {
    return null
  }

  const exposedTypeCounts = new Map<TileType, number>()

  exposedTiles.forEach((tile) => {
    exposedTypeCounts.set(tile.currentType, (exposedTypeCounts.get(tile.currentType) ?? 0) + 1)
  })

  const trayTailRun = getTrayTailRun(state.trayTiles)
  const readyMatchTile =
    trayTailRun && trayTailRun.count < config.matchCount
      ? exposedTiles.find((tile) => tile.currentType === trayTailRun.type)
      : null

  if (readyMatchTile) {
    return {
      tileId: readyMatchTile.id,
      type: readyMatchTile.currentType,
      reason: 'ready-match',
    }
  }

  const hasRoomForFreshPair =
    state.trayTiles.length <= config.trayCapacity - config.matchCount
  const traySetupTile = hasRoomForFreshPair
    ? exposedTiles.find(
        (tile) => (exposedTypeCounts.get(tile.currentType) ?? 0) >= config.matchCount,
      )
    : null

  if (traySetupTile) {
    return {
      tileId: traySetupTile.id,
      type: traySetupTile.currentType,
      reason: 'tray-setup',
    }
  }

  return {
    tileId: exposedTiles[0].id,
    type: exposedTiles[0].currentType,
    reason: 'open-layer',
  }
}

export function useHint(
  state: GameState,
  level: LevelDefinition,
  config: GameConfig,
): GameState {
  if (
    state.status !== 'playing' ||
    state.matchBursts.length > 0 ||
    state.assistCharges.hint <= 0
  ) {
    return state
  }

  const suggestion = getHintSuggestion(state, level, config)

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

export function canMoveTrayTileToPocket(
  state: GameState,
  level: LevelDefinition,
  trayIndex: number,
): boolean {
  if (state.status !== 'playing' || state.matchBursts.length > 0) {
    return false
  }

  const settings = getChapterRuleSettings(level)

  if (
    settings.pocketCapacity === 0 ||
    trayIndex < 0 ||
    trayIndex >= state.trayTiles.length ||
    !state.orbitPockets.some((pocketTile) => pocketTile === null)
  ) {
    return false
  }

  if (settings.trayMoveMode === 'tail' && trayIndex !== state.trayTiles.length - 1) {
    return false
  }

  return settings.trayMoveMode === 'tail' || settings.trayMoveMode === 'any'
}

export function moveTrayTileToPocket(
  state: GameState,
  level: LevelDefinition,
  trayIndex: number,
): GameState {
  if (!canMoveTrayTileToPocket(state, level, trayIndex)) {
    return state
  }

  const nextOrbitPockets = cloneOrbitPockets(state.orbitPockets)
  const nextTrayTiles = state.trayTiles.filter((_, index) => index !== trayIndex)
  const emptyPocketIndex = nextOrbitPockets.findIndex((pocketTile) => pocketTile === null)

  nextOrbitPockets[emptyPocketIndex] = { ...state.trayTiles[trayIndex] }

  return {
    ...state,
    trayTiles: nextTrayTiles,
    orbitPockets: nextOrbitPockets,
    lastHintTileId: null,
    history: pushHistory(state),
  }
}

export function canReleasePocketToTray(
  state: GameState,
  level: LevelDefinition,
  pocketIndex: number,
): boolean {
  if (state.status !== 'playing' || state.matchBursts.length > 0) {
    return false
  }

  const settings = getChapterRuleSettings(level)

  return (
    settings.pocketCapacity > 0 &&
    pocketIndex >= 0 &&
    pocketIndex < state.orbitPockets.length &&
    state.orbitPockets[pocketIndex] !== null
  )
}

export function releasePocketToTray(
  state: GameState,
  level: LevelDefinition,
  pocketIndex: number,
  config: GameConfig,
): GameState {
  if (!canReleasePocketToTray(state, level, pocketIndex)) {
    return state
  }

  const settings = getChapterRuleSettings(level)
  const pocketTile = state.orbitPockets[pocketIndex]

  if (!pocketTile) {
    return state
  }

  const nextOrbitPockets = cloneOrbitPockets(state.orbitPockets)
  nextOrbitPockets[pocketIndex] = null

  const trayCandidate = insertPocketTileIntoTray(
    state.trayTiles,
    { ...pocketTile },
    settings.releaseTarget,
  )
  const { nextTrayTiles, matchBursts } = resolveTrayMatches(trayCandidate, config.matchCount)
  const remainingBoardTileCount = getRemainingBoardTiles(state).length

  return {
    ...state,
    trayTiles: nextTrayTiles,
    orbitPockets: nextOrbitPockets,
    ...resolveGameStatus(remainingBoardTileCount, nextTrayTiles, config.trayCapacity),
    removedCount: state.removedCount + matchBursts.length,
    resolvedMatchIds: matchBursts.map((burst) => burst.id),
    matchBursts,
    lastHintTileId: null,
    history: pushHistory(state),
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

  if (
    !targetTile ||
    targetTile.removed ||
    isTileBlocked(tileId, state, config) ||
    !isTileSelectableInCurrentCycle(targetTile, state.elapsedMs)
  ) {
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
  const trayCandidate = createTrayEntry(
    targetTile,
    getDisplayedTileType(targetTile, level, state.elapsedMs),
    nextSelectionCount,
  )
  const insertedTrayTiles = insertIntoTray(state.trayTiles, trayCandidate)
  const { nextTrayTiles, matchBursts } = resolveTrayMatches(
    insertedTrayTiles,
    config.matchCount,
  )

  const remainingBoardTileCount = nextBoardTiles.filter((tile) => !tile.removed).length

  return {
    ...state,
    levelId: level.id,
    boardTiles: nextBoardTiles,
    trayTiles: nextTrayTiles,
    orbitPockets: cloneOrbitPockets(state.orbitPockets),
    ...resolveGameStatus(
      remainingBoardTileCount,
      nextTrayTiles,
      config.trayCapacity,
    ),
    selectedCount: nextSelectionCount,
    removedCount: state.removedCount + matchBursts.length,
    resolvedMatchIds: matchBursts.map((burst) => burst.id),
    matchBursts,
    lastHintTileId: null,
    elapsedMs: state.elapsedMs,
    timerRemainingMs: state.timerRemainingMs,
    history: pushHistory(state),
  }
}
