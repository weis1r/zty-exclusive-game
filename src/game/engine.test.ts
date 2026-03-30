import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './config'
import {
  canUseUndo,
  clearResolvedMatches,
  createInitialGameState,
  getHintSuggestion,
  getRemainingBoardTiles,
  insertIntoTray,
  isTileBlocked,
  pickTile,
  restartGame,
  useHint,
  useUndo,
} from './engine'
import { CAMPAIGN, CAMPAIGN_LEVELS, DEFAULT_LEVEL, getCampaignChapters } from './levels'
import type { LevelDefinition, TileType, TrayTile } from './types'

function createLevel(tiles: LevelDefinition['tiles']): LevelDefinition {
  return {
    id: 'test-level',
    name: '测试关',
    boardWidth: GAME_CONFIG.boardWidth,
    boardHeight: GAME_CONFIG.boardHeight,
    tiles,
  }
}

function getExposedTiles(state: ReturnType<typeof createInitialGameState>) {
  return getRemainingBoardTiles(state)
    .filter((tile) => !isTileBlocked(tile.id, state, GAME_CONFIG))
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

function getLevelUniqueTypeCount(level: LevelDefinition) {
  return new Set(level.tiles.map((tile) => tile.type)).size
}

function findGreedyWinningPath(level: LevelDefinition): string[] | null {
  const path: string[] = []
  let state = createInitialGameState(level, 'playing')
  let guard = 0

  while (state.status === 'playing' && guard < level.tiles.length * 2) {
    if (state.matchBursts.length > 0) {
      state = clearResolvedMatches(state)
    }

    const exposedTiles = getExposedTiles(state)
    const tailType = state.trayTiles.at(-1)?.type ?? null
    const nextPickIds: string[] = []

    if (tailType) {
      const tailMatchTile = exposedTiles.find((tile) => tile.type === tailType)

      if (tailMatchTile) {
        nextPickIds.push(tailMatchTile.id)
      }
    }

    if (
      nextPickIds.length === 0 &&
      state.trayTiles.length <= GAME_CONFIG.trayCapacity - GAME_CONFIG.matchCount
    ) {
      const pairByType = new Map<TileType, string[]>()

      exposedTiles.forEach((tile) => {
        pairByType.set(tile.type, [...(pairByType.get(tile.type) ?? []), tile.id])
      })

      const safePair = [...pairByType.values()].find((tileIds) => tileIds.length >= GAME_CONFIG.matchCount)

      if (safePair) {
        nextPickIds.push(...safePair.slice(0, GAME_CONFIG.matchCount))
      }
    }

    if (nextPickIds.length === 0) {
      return null
    }

    nextPickIds.forEach((tileId) => {
      state = pickTile(state, tileId, level, GAME_CONFIG)
      path.push(tileId)

      if (state.matchBursts.length > 0) {
        state = clearResolvedMatches(state)
      }
    })

    guard += 1
  }

  return state.status === 'won' ? path : null
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

  it('preserves tray insertion order instead of auto-grouping same tiles', () => {
    const trayTiles: TrayTile[] = [
      { entryId: 'ember-1', sourceTileId: 'ember-a', type: 'ember' },
      { entryId: 'leaf-1', sourceTileId: 'leaf-a', type: 'leaf' },
    ]

    const result = insertIntoTray(trayTiles, {
      entryId: 'ember-2',
      sourceTileId: 'ember-b',
      type: 'ember',
    })

    expect(result.map((tile) => tile.type)).toEqual(['ember', 'leaf', 'ember'])
  })

  it('does not clear a separated ABAC tray pattern', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 60, y: 0, layer: 0 },
      { id: 'ember-2', type: 'ember', x: 120, y: 0, layer: 0 },
      { id: 'cloud-1', type: 'cloud', x: 180, y: 0, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = pickTile(state, 'ember-1', level, GAME_CONFIG)
    state = pickTile(state, 'leaf-1', level, GAME_CONFIG)
    state = pickTile(state, 'ember-2', level, GAME_CONFIG)

    expect(state.trayTiles.map((tile) => tile.type)).toEqual(['ember', 'leaf', 'ember'])
    expect(state.matchBursts).toHaveLength(0)
  })

  it('clears only adjacent pairs and blocks new picks during the clear animation window', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
      { id: 'ember-2', type: 'ember', x: 130, y: 40, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 220, y: 40, layer: 0 },
      { id: 'leaf-2', type: 'leaf', x: 40, y: 150, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = pickTile(state, 'ember-1', level, GAME_CONFIG)
    state = pickTile(state, 'ember-2', level, GAME_CONFIG)

    expect(state.trayTiles).toHaveLength(0)
    expect(state.removedCount).toBe(2)
    expect(state.matchBursts).toHaveLength(2)

    const unchangedState = pickTile(state, 'leaf-1', level, GAME_CONFIG)

    expect(unchangedState).toEqual(state)

    const settledState = clearResolvedMatches(state)

    expect(settledState.matchBursts).toHaveLength(0)
    expect(settledState.resolvedMatchIds).toHaveLength(0)
  })

  it('does not clear a buried internal pair after newer tiles stack above it', () => {
    const level = createLevel([
      { id: 'ember-2', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'cloud-1', type: 'cloud', x: 80, y: 0, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = {
      ...state,
      trayTiles: [
        { entryId: 'ember-1', sourceTileId: 'ember-a', type: 'ember' },
        { entryId: 'leaf-1', sourceTileId: 'leaf-a', type: 'leaf' },
        { entryId: 'leaf-2', sourceTileId: 'leaf-b', type: 'leaf' },
      ],
      selectedCount: 3,
    }

    state = pickTile(state, 'ember-2', level, GAME_CONFIG)

    expect(state.trayTiles.map((tile) => tile.type)).toEqual(['ember', 'leaf', 'leaf', 'ember'])
    expect(state.matchBursts).toHaveLength(0)
    expect(state.status).toBe('lost')
  })

  it('marks the game as lost when the tray reaches capacity without an adjacent pair', () => {
    const level = createLevel([
      { id: 'ember', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'leaf', type: 'leaf', x: 80, y: 0, layer: 0 },
      { id: 'bloom', type: 'bloom', x: 160, y: 0, layer: 0 },
      { id: 'bell', type: 'bell', x: 240, y: 0, layer: 0 },
      { id: 'cloud', type: 'cloud', x: 0, y: 100, layer: 0 },
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

  it('recommends matching the tray tail and consumes a hint charge', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 160, y: 0, layer: 0 },
      { id: 'leaf-2', type: 'leaf', x: 240, y: 0, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = pickTile(state, 'ember-1', level, GAME_CONFIG)

    const suggestion = getHintSuggestion(state, GAME_CONFIG)
    const hintedState = useHint(state, GAME_CONFIG)

    expect(suggestion).toEqual({
      tileId: 'ember-2',
      type: 'ember',
      reason: 'ready-match',
    })
    expect(hintedState.lastHintTileId).toBe('ember-2')
    expect(hintedState.assistCharges.hint).toBe(state.assistCharges.hint - 1)
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

  it('ships a 20-level campaign with the 48/60/72/84 chapter density curve', () => {
    const tileCounts = DEFAULT_LEVEL.tiles.reduce<Record<string, number>>((counts, tile) => {
      counts[tile.type] = (counts[tile.type] ?? 0) + 1
      return counts
    }, {})

    expect(CAMPAIGN_LEVELS).toHaveLength(20)
    expect(getCampaignChapters(CAMPAIGN)).toHaveLength(5)
    expect(DEFAULT_LEVEL.id).toBe('thorn-garden-01')
    expect(DEFAULT_LEVEL.name).toBe('荆棘迷圃')
    expect(DEFAULT_LEVEL.difficulty).toBe('easy')
    expect(DEFAULT_LEVEL.tiles).toHaveLength(48)
    expect(Object.values(tileCounts).every((count) => count % GAME_CONFIG.matchCount === 0)).toBe(true)
    expect(CAMPAIGN_LEVELS.map((level) => level.tiles.length)).toEqual([
      48, 60, 72, 84,
      48, 60, 72, 84,
      48, 60, 72, 84,
      48, 60, 72, 84,
      48, 60, 72, 84,
    ])
  })

  it('starts the default level with a tighter silhouette opening layer', () => {
    const state = createInitialGameState(DEFAULT_LEVEL, 'playing')
    const exposedTiles = DEFAULT_LEVEL.tiles.filter((tile) => !isTileBlocked(tile.id, state, GAME_CONFIG))

    expect(exposedTiles).toHaveLength(12)
    expect(DEFAULT_LEVEL.tiles.filter((tile) => isTileBlocked(tile.id, state, GAME_CONFIG))).toHaveLength(36)
  })

  it('starts the default level with four visible tile types and immediate safe pairs', () => {
    const state = createInitialGameState(DEFAULT_LEVEL, 'playing')
    const exposedTiles = getExposedTiles(state)
    const exposedTypeCounts = exposedTiles.reduce<Record<string, number>>((counts, tile) => {
      counts[tile.type] = (counts[tile.type] ?? 0) + 1
      return counts
    }, {})

    expect(Object.keys(exposedTypeCounts)).toHaveLength(4)
    expect(Object.values(exposedTypeCounts).filter((count) => count >= 2)).toHaveLength(3)
  })

  it('ramps tile variety across the 20-level campaign', () => {
    expect(CAMPAIGN_LEVELS.map((level) => getLevelUniqueTypeCount(level))).toEqual([
      4, 5, 6, 6, 5, 6, 6, 7, 6, 7, 7, 8, 7, 8, 8, 9, 8, 9, 10, 12,
    ])
  })

  it('ships 20 distinct silhouette layouts instead of reusing four templates', () => {
    const layoutSignatures = CAMPAIGN_LEVELS.map((level) =>
      level.tiles
        .map((tile) => `${tile.layer}:${tile.x}:${tile.y}`)
        .sort()
        .join('|'),
    )

    expect(new Set(layoutSignatures).size).toBe(20)
  })

  it('keeps assist charges on the intended difficulty curve', () => {
    expect(CAMPAIGN_LEVELS.map((level) => level.campaign?.startingAssists)).toEqual([
      { undo: 2, hint: 2 },
      { undo: 2, hint: 2 },
      { undo: 2, hint: 2 },
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
      { undo: 1, hint: 1 },
      { undo: 1, hint: 1 },
      { undo: 1, hint: 1 },
      { undo: 1, hint: 1 },
    ])
  })

  it('supports a full greedy winning solution path on the default level', () => {
    const winningPath = findGreedyWinningPath(DEFAULT_LEVEL)

    expect(winningPath).not.toBeNull()
    expect(winningPath).toHaveLength(DEFAULT_LEVEL.tiles.length)
  })

  it('keeps every shipped campaign level solvable with safe adjacent-pair play', () => {
    const unsolvedLevels = CAMPAIGN_LEVELS.flatMap((level) => {
      const winningPath = findGreedyWinningPath(level)

      if (!winningPath || winningPath.length !== level.tiles.length) {
        return [level.id]
      }

      return []
    })

    expect(unsolvedLevels).toEqual([])
  })
})
