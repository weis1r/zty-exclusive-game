import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './config'
import {
  areLevelGoalsComplete,
  canUseMomentumSkill,
  canUseUndo,
  clearResolvedMatches,
  createInitialGameState,
  getEffectiveTrayCapacity,
  getRemainingBoardTiles,
  getHintSuggestion,
  insertIntoTray,
  isTileBlocked,
  pickTile,
  restartGame,
  useHint,
  useMomentumSkill,
  useUndo,
} from './engine'
import { CAMPAIGN, CAMPAIGN_LEVELS, DEFAULT_LEVEL, getCampaignChapters } from './levels'
import type { LevelDefinition, TrayTile } from './types'

function createLevel(tiles: LevelDefinition['tiles']): LevelDefinition {
  return {
    id: 'test-level',
    name: '测试关',
    boardWidth: GAME_CONFIG.boardWidth,
    boardHeight: GAME_CONFIG.boardHeight,
    tiles,
  }
}

function serializeState(level: LevelDefinition, state: ReturnType<typeof createInitialGameState>) {
  const removedTiles = level.tiles
    .filter((tile) => state.boardTiles.find((boardTile) => boardTile.id === tile.id)?.removed)
    .map((tile) => tile.id)
    .join(',')

  return [
    removedTiles,
    state.trayTiles.map((tile) => tile.type).join(','),
    `${state.clearedSpecialCounts.crate}-${state.clearedSpecialCounts.companion}-${state.clearedSpecialCounts.wild}`,
    `${state.bonusTrayCapacity}-${state.momentumCharge}`,
    state.status,
  ].join('|')
}

function getExposedTilesByPriority(
  state: ReturnType<typeof createInitialGameState>,
) {
  const trayTypeCounts = state.trayTiles.reduce<Map<string, number>>((counts, tile) => {
    counts.set(tile.type, (counts.get(tile.type) ?? 0) + 1)
    return counts
  }, new Map())

  return getRemainingBoardTiles(state)
    .filter((tile) => !isTileBlocked(tile.id, state, GAME_CONFIG))
    .sort((leftTile, rightTile) => {
      const leftTrayCount = trayTypeCounts.get(leftTile.type) ?? 0
      const rightTrayCount = trayTypeCounts.get(rightTile.type) ?? 0

      if (leftTrayCount !== rightTrayCount) {
        return rightTrayCount - leftTrayCount
      }

      if (leftTile.layer !== rightTile.layer) {
        return rightTile.layer - leftTile.layer
      }

      if (leftTile.y !== rightTile.y) {
        return leftTile.y - rightTile.y
      }

      return leftTile.x - rightTile.x
    })
}

function findWinningPath(level: LevelDefinition, maxVisited = 300_000): string[] | null {
  const seenStates = new Set<string>()
  let visitedCount = 0

  function search(
    state: ReturnType<typeof createInitialGameState>,
  ): string[] | null {
    const settledState =
      state.matchBursts.length > 0 ? clearResolvedMatches(state) : state

    if (settledState.status === 'won') {
      return []
    }

    if (settledState.status === 'lost') {
      return null
    }

    const stateKey = serializeState(level, settledState)

    if (seenStates.has(stateKey) || visitedCount >= maxVisited) {
      return null
    }

    seenStates.add(stateKey)
    visitedCount += 1

    for (const tile of getExposedTilesByPriority(settledState)) {
      const nextState = pickTile(settledState, tile.id, level, GAME_CONFIG)

      if (nextState === settledState) {
        continue
      }

      const nextPath = search(nextState)

      if (nextPath) {
        return [tile.id, ...nextPath]
      }
    }

    return null
  }

  return search(createInitialGameState(level, 'playing'))
}

function getLevelUniqueTypeCount(level: LevelDefinition) {
  return new Set(level.tiles.map((tile) => tile.type)).size
}

function getOpeningUniqueTypeCount(level: LevelDefinition) {
  const state = createInitialGameState(level, 'playing')

  return new Set(
    level.tiles
      .filter((tile) => !isTileBlocked(tile.id, state, GAME_CONFIG))
      .map((tile) => tile.type),
  ).size
}

describe('game engine', () => {
  it('marks lower overlapping tiles as blocked', () => {
    const level = createLevel([
      { id: 'bottom', type: 'ember', x: 120, y: 120, layer: 0 },
      { id: 'top', type: 'leaf', x: 142, y: 142, layer: 1 },
    ])
    const state = createInitialGameState(level, 'playing')

    expect(isTileBlocked('bottom', state, GAME_CONFIG)).toBe(true)
    expect(isTileBlocked('top', state, GAME_CONFIG)).toBe(false)
  })

  it('groups same tile types together when adding to the tray', () => {
    const trayTiles: TrayTile[] = [
      { entryId: 'ember-1', sourceTileId: 'ember-a', type: 'ember' },
      { entryId: 'leaf-1', sourceTileId: 'leaf-a', type: 'leaf' },
    ]

    const result = insertIntoTray(trayTiles, {
      entryId: 'ember-2',
      sourceTileId: 'ember-b',
      type: 'ember',
    })

    expect(result.map((tile) => tile.type)).toEqual(['ember', 'ember', 'leaf'])
  })

  it('clears a match of three identical tiles and blocks new picks during the clear animation window', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
      { id: 'ember-2', type: 'ember', x: 130, y: 40, layer: 0 },
      { id: 'ember-3', type: 'ember', x: 220, y: 40, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 40, y: 150, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = pickTile(state, 'ember-1', level, GAME_CONFIG)
    state = pickTile(state, 'ember-2', level, GAME_CONFIG)
    state = pickTile(state, 'ember-3', level, GAME_CONFIG)

    expect(state.trayTiles).toHaveLength(0)
    expect(state.removedCount).toBe(3)
    expect(state.matchBursts).toHaveLength(3)

    const unchangedState = pickTile(state, 'leaf-1', level, GAME_CONFIG)

    expect(unchangedState).toEqual(state)

    const settledState = clearResolvedMatches(state)

    expect(settledState.matchBursts).toHaveLength(0)
    expect(settledState.resolvedMatchIds).toHaveLength(0)
  })

  it('marks the game as lost when the tray reaches capacity without a match', () => {
    const level = createLevel([
      { id: 'ember', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'leaf', type: 'leaf', x: 80, y: 0, layer: 0 },
      { id: 'bloom', type: 'bloom', x: 160, y: 0, layer: 0 },
      { id: 'bell', type: 'bell', x: 240, y: 0, layer: 0 },
      { id: 'cloud', type: 'cloud', x: 0, y: 100, layer: 0 },
      { id: 'shell', type: 'shell', x: 80, y: 100, layer: 0 },
      { id: 'berry', type: 'berry', x: 160, y: 100, layer: 0 },
      { id: 'wave', type: 'wave', x: 240, y: 100, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')

    for (const tile of level.tiles.slice(0, GAME_CONFIG.trayCapacity)) {
      state = pickTile(state, tile.id, level, GAME_CONFIG)
    }

    expect(state.status).toBe('lost')
    expect(state.trayTiles).toHaveLength(GAME_CONFIG.trayCapacity)
  })

  it('resets the board state when the game restarts', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 20, y: 20, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 120, y: 20, layer: 0 },
    ])

    const progressedState = pickTile(
      createInitialGameState(level, 'playing'),
      'ember-1',
      level,
      GAME_CONFIG,
    )

    const restartedState = restartGame(level)

    expect(progressedState.selectedCount).toBe(1)
    expect(restartedState.status).toBe('playing')
    expect(restartedState.selectedCount).toBe(0)
    expect(restartedState.removedCount).toBe(0)
    expect(restartedState.trayTiles).toHaveLength(0)
    expect(restartedState.boardTiles.every((tile) => !tile.removed)).toBe(true)
  })

  it('recommends a matching tile and consumes a hint charge', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
      { id: 'ember-3', type: 'ember', x: 160, y: 0, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 0, y: 100, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = pickTile(state, 'ember-1', level, GAME_CONFIG)

    const suggestion = getHintSuggestion(state, GAME_CONFIG)
    const hintedState = useHint(state, GAME_CONFIG)

    expect(suggestion).toEqual({
      tileId: 'ember-2',
      type: 'ember',
      reason: 'tray-setup',
    })
    expect(hintedState.lastHintTileId).toBe('ember-2')
    expect(hintedState.assistCharges.hint).toBe(state.assistCharges.hint - 1)
  })

  it('clears crate tiles instantly and can complete special-goal levels without entering the tray', () => {
    const level: LevelDefinition = {
      ...createLevel([{ id: 'crate-ember', type: 'ember', x: 0, y: 0, layer: 0, special: { kind: 'crate' } }]),
      goals: [
        {
          id: 'goal-crate',
          kind: 'clear-special',
          specialKind: 'crate',
          target: 1,
          label: '拆开 1 个礼盒砖',
        },
      ],
    }

    const state = pickTile(
      createInitialGameState(level, 'playing'),
      'crate-ember',
      level,
      GAME_CONFIG,
    )

    expect(state.trayTiles).toHaveLength(0)
    expect(state.clearedSpecialCounts.crate).toBe(1)
    expect(state.status).toBe('won')
  })

  it('resolves wild tiles into the most useful tray type', () => {
    const level = createLevel([
      { id: 'leaf-1', type: 'leaf', x: 0, y: 0, layer: 0 },
      { id: 'wild-ember', type: 'ember', x: 80, y: 0, layer: 0, special: { kind: 'wild' } },
      { id: 'bell-1', type: 'bell', x: 160, y: 0, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = pickTile(state, 'leaf-1', level, GAME_CONFIG)
    state = pickTile(state, 'wild-ember', level, GAME_CONFIG)

    expect(state.trayTiles.map((tile) => tile.type)).toEqual(['leaf', 'leaf'])
    expect(state.trayTiles.at(-1)?.specialKind).toBe('wild')
    expect(state.clearedSpecialCounts.wild).toBe(1)
  })

  it('fills momentum on matches and expands tray capacity when the charge skill is used', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
      { id: 'ember-3', type: 'ember', x: 160, y: 0, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 240, y: 0, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = pickTile(state, 'ember-1', level, GAME_CONFIG)
    state = pickTile(state, 'ember-2', level, GAME_CONFIG)
    state = pickTile(state, 'ember-3', level, GAME_CONFIG)
    state = clearResolvedMatches(state)

    expect(state.momentumCharge).toBe(GAME_CONFIG.momentumChargeTarget)
    expect(canUseMomentumSkill(state, GAME_CONFIG)).toBe(true)

    const boostedState = useMomentumSkill(state, GAME_CONFIG)

    expect(boostedState.momentumCharge).toBe(0)
    expect(getEffectiveTrayCapacity(boostedState, GAME_CONFIG)).toBe(GAME_CONFIG.trayCapacity + 1)
  })

  it('restores the previous snapshot when undo is used', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 80, y: 0, layer: 0 },
    ])

    const startedState = createInitialGameState(level, 'playing')
    const progressedState = pickTile(startedState, 'ember-1', level, GAME_CONFIG)
    const undoneState = useUndo(progressedState)

    expect(canUseUndo(progressedState)).toBe(true)
    expect(undoneState.selectedCount).toBe(0)
    expect(undoneState.trayTiles).toHaveLength(0)
    expect(undoneState.boardTiles.every((tile) => !tile.removed)).toBe(true)
    expect(undoneState.assistCharges.undo).toBe(progressedState.assistCharges.undo - 1)
  })

  it('ships a 20-level campaign and keeps the default level matchable', () => {
    const tileCounts = DEFAULT_LEVEL.tiles.reduce<Record<string, number>>((counts, tile) => {
      counts[tile.type] = (counts[tile.type] ?? 0) + 1
      return counts
    }, {})

    expect(CAMPAIGN_LEVELS).toHaveLength(20)
    expect(getCampaignChapters(CAMPAIGN)).toHaveLength(5)
    expect(DEFAULT_LEVEL.id).toBe('thorn-garden-01')
    expect(DEFAULT_LEVEL.name).toBe('荆棘迷圃')
    expect(DEFAULT_LEVEL.difficulty).toBe('easy')
    expect(DEFAULT_LEVEL.tiles).toHaveLength(36)
    expect(Object.values(tileCounts).every((count) => count % GAME_CONFIG.matchCount === 0)).toBe(
      true,
    )
  })

  it('starts the default level with only the top six tiles exposed', () => {
    const state = createInitialGameState(DEFAULT_LEVEL, 'playing')
    const exposedTileIds = DEFAULT_LEVEL.tiles
      .filter((tile) => !isTileBlocked(tile.id, state, GAME_CONFIG))
      .map((tile) => tile.id)
      .sort()

    expect(exposedTileIds).toEqual(
      ['bloom-1', 'ember-1', 'ember-2', 'ember-3', 'leaf-1', 'leaf-2'].sort(),
    )
    expect(DEFAULT_LEVEL.tiles.filter((tile) => isTileBlocked(tile.id, state, GAME_CONFIG))).toHaveLength(30)
  })

  it('gives the default level one immediate match and two setup tiles at the start', () => {
    const state = createInitialGameState(DEFAULT_LEVEL, 'playing')
    const exposedTypeCounts = DEFAULT_LEVEL.tiles
      .filter((tile) => !isTileBlocked(tile.id, state, GAME_CONFIG))
      .reduce<Record<string, number>>((counts, tile) => {
        counts[tile.type] = (counts[tile.type] ?? 0) + 1
        return counts
      }, {})

    expect(exposedTypeCounts).toEqual({
      ember: 3,
      leaf: 2,
      bloom: 1,
    })
  })

  it('ramps tile variety across all 20 levels and gives chapter finais more visible icons', () => {
    const expectedTypeCurve = [4, 4, 5, 5, 5, 6, 5, 5, 6, 6, 5, 5, 5, 6, 6, 5, 5, 5, 6, 6]
    const uniqueTypeCounts = CAMPAIGN_LEVELS.map((level) => getLevelUniqueTypeCount(level))

    expect(uniqueTypeCounts).toEqual(expectedTypeCurve)
    expect(uniqueTypeCounts.every((count) => count <= 6)).toBe(true)

    for (const chapter of getCampaignChapters(CAMPAIGN)) {
      const chapterLevels = CAMPAIGN_LEVELS.filter((level) => level.campaign?.chapterId === chapter.id)
      const finaleStartIndex = chapterLevels.length === 3 ? chapterLevels.length - 1 : chapterLevels.length - 2
      const earlierLevels = chapterLevels.slice(0, finaleStartIndex)
      const finaleLevels = chapterLevels.slice(finaleStartIndex)

      const earlierTypeMax = Math.max(...earlierLevels.map((level) => getLevelUniqueTypeCount(level)))
      const finaleTypeMin = Math.min(...finaleLevels.map((level) => getLevelUniqueTypeCount(level)))
      const earlierOpeningMax = Math.max(
        ...earlierLevels.map((level) => getOpeningUniqueTypeCount(level)),
      )
      const finaleOpeningMin = Math.min(
        ...finaleLevels.map((level) => getOpeningUniqueTypeCount(level)),
      )

      expect(finaleTypeMin).toBeGreaterThan(earlierTypeMax)
      expect(finaleOpeningMin).toBeGreaterThan(earlierOpeningMax)
    }
  })

  it('keeps assist charges on the intended campaign curve', () => {
    expect(CAMPAIGN_LEVELS.map((level) => level.campaign?.startingAssists)).toEqual([
      { undo: 2, hint: 2 },
      { undo: 2, hint: 2 },
      { undo: 2, hint: 2 },
      { undo: 2, hint: 2 },
      { undo: 2, hint: 2 },
      { undo: 2, hint: 1 },
      { undo: 2, hint: 1 },
      { undo: 2, hint: 1 },
      { undo: 2, hint: 1 },
      { undo: 2, hint: 1 },
      { undo: 2, hint: 1 },
      { undo: 2, hint: 1 },
      { undo: 2, hint: 1 },
      { undo: 2, hint: 1 },
      { undo: 1, hint: 1 },
      { undo: 1, hint: 1 },
      { undo: 1, hint: 1 },
      { undo: 1, hint: 1 },
      { undo: 1, hint: 1 },
      { undo: 1, hint: 1 },
    ])
  })

  it('supports a full winning solution path on the default easy level', () => {
    const winningPath = findWinningPath(DEFAULT_LEVEL)

    expect(winningPath).not.toBeNull()
    expect(winningPath!.length).toBeGreaterThan(0)

    let state = createInitialGameState(DEFAULT_LEVEL, 'playing')

    for (const tileId of winningPath ?? []) {
      state = pickTile(state, tileId, DEFAULT_LEVEL, GAME_CONFIG)

      if (state.matchBursts.length > 0) {
        state = clearResolvedMatches(state)
      }
    }

    expect(state.status).toBe('won')
    expect(state.trayTiles).toHaveLength(0)
    expect(areLevelGoalsComplete(state, DEFAULT_LEVEL)).toBe(true)
    expect(state.boardTiles.some((tile) => !tile.removed)).toBe(true)
  })

  it('keeps every shipped campaign level solvable', () => {
    const unsolvedLevels = CAMPAIGN_LEVELS.flatMap((level) => {
      const winningPath = findWinningPath(level)

      if (!winningPath || winningPath.length === 0) {
        return [level.id]
      }

      let state = createInitialGameState(level, 'playing')

      for (const tileId of winningPath) {
        state = pickTile(state, tileId, level, GAME_CONFIG)

        if (state.matchBursts.length > 0) {
          state = clearResolvedMatches(state)
        }
      }

      if (state.status !== 'won' || !areLevelGoalsComplete(state, level)) {
        return [level.id]
      }

      return []
    })

    expect(unsolvedLevels).toEqual([])
  })
})
