import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './config'
import {
  advanceGameTime,
  canUseUndo,
  clearResolvedMatches,
  createInitialGameState,
  getDisplayedTileType,
  getHintSuggestion,
  getRemainingBoardTiles,
  getTileCycleState,
  insertIntoTray,
  isTileBlocked,
  pickTile,
  restartGame,
  useHint,
  useUndo,
} from './engine'
import { CAMPAIGN, CAMPAIGN_LEVELS, DEFAULT_LEVEL, getCampaignChapters } from './levels'
import type { LevelDefinition, TrayTile } from './types'

function createLevel(
  tiles: LevelDefinition['tiles'],
  overrides?: Partial<LevelDefinition>,
): LevelDefinition {
  return {
    id: 'test-level',
    name: '测试关',
    boardWidth: GAME_CONFIG.boardWidth,
    boardHeight: GAME_CONFIG.boardHeight,
    typePool: overrides?.typePool ?? [...new Set(tiles.map((tile) => tile.type))],
    tiles,
    ...overrides,
  }
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

  it('resets the board state, timer, and classic pockets when the game restarts', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 20, y: 20, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 120, y: 20, layer: 0 },
    ])

    let progressedState = createInitialGameState(level, 'playing')
    progressedState = advanceGameTime(progressedState, 2250)
    progressedState = pickTile(progressedState, 'ember-1', level, GAME_CONFIG)

    const restartedState = restartGame(level)

    expect(progressedState.selectedCount).toBe(1)
    expect(restartedState.status).toBe('playing')
    expect(restartedState.selectedCount).toBe(0)
    expect(restartedState.removedCount).toBe(0)
    expect(restartedState.trayTiles).toHaveLength(0)
    expect(restartedState.orbitPockets).toEqual([])
    expect(restartedState.elapsedMs).toBe(0)
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

    const suggestion = getHintSuggestion(state, level, GAME_CONFIG)
    const hintedState = useHint(state, level, GAME_CONFIG)

    expect(suggestion).toEqual({
      tileId: 'ember-2',
      type: 'ember',
      reason: 'ready-match',
    })
    expect(hintedState.lastHintTileId).toBe('ember-2')
    expect(hintedState.assistCharges.hint).toBe(state.assistCharges.hint - 1)
  })

  it('restores the previous snapshot including elapsed time when undo is used', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 80, y: 0, layer: 0 },
    ])

    let state = createInitialGameState(level, 'playing')
    state = advanceGameTime(state, 2100)
    state = pickTile(state, 'ember-1', level, GAME_CONFIG)

    const undoneState = useUndo(state)

    expect(canUseUndo(state)).toBe(true)
    expect(undoneState.selectedCount).toBe(0)
    expect(undoneState.trayTiles).toHaveLength(0)
    expect(undoneState.elapsedMs).toBe(2100)
    expect(undoneState.boardTiles.every((tile) => !tile.removed)).toBe(true)
    expect(undoneState.assistCharges.undo).toBe(state.assistCharges.undo - 1)
  })

  it('locks shift-a tiles until the last second and picks their displayed type', () => {
    const level = createLevel(
      [
        { id: 'shift-a', type: 'ember', x: 0, y: 0, layer: 0, dynamicGroup: 'shift-a' },
        { id: 'static', type: 'leaf', x: 80, y: 0, layer: 0 },
      ],
      {
        typePool: ['ember', 'leaf', 'bloom'],
      },
    )

    let state = createInitialGameState(level, 'playing')

    expect(getTileCycleState(level.tiles[0], state.elapsedMs)?.selectable).toBe(false)
    expect(pickTile(state, 'shift-a', level, GAME_CONFIG)).toEqual(state)

    state = advanceGameTime(state, 5000)

    expect(getTileCycleState(level.tiles[0], state.elapsedMs)?.selectable).toBe(true)
    expect(getDisplayedTileType(level.tiles[0], level, state.elapsedMs)).toBe('leaf')

    const pickedState = pickTile(state, 'shift-a', level, GAME_CONFIG)

    expect(pickedState.trayTiles.map((tile) => tile.type)).toEqual(['leaf'])
  })

  it('keeps shift-b on the opposite window and opposite direction', () => {
    const level = createLevel(
      [
        { id: 'shift-a', type: 'leaf', x: 0, y: 0, layer: 0, dynamicGroup: 'shift-a' },
        { id: 'shift-b', type: 'leaf', x: 80, y: 0, layer: 0, dynamicGroup: 'shift-b' },
      ],
      {
        typePool: ['ember', 'leaf', 'bloom'],
      },
    )

    const earlyState = advanceGameTime(createInitialGameState(level, 'playing'), 1000)

    expect(getTileCycleState(level.tiles[0], earlyState.elapsedMs)?.selectable).toBe(false)
    expect(getTileCycleState(level.tiles[1], earlyState.elapsedMs)?.selectable).toBe(true)

    const shiftedState = advanceGameTime(createInitialGameState(level, 'playing'), 3500)

    expect(getDisplayedTileType(level.tiles[0], level, shiftedState.elapsedMs)).toBe('bloom')
    expect(getDisplayedTileType(level.tiles[1], level, shiftedState.elapsedMs)).toBe('ember')
  })

  it('ships a 20-level campaign with the 48/60/72/84/96 tile curve capped after level 5', () => {
    expect(CAMPAIGN_LEVELS).toHaveLength(20)
    expect(getCampaignChapters(CAMPAIGN)).toHaveLength(5)
    expect(DEFAULT_LEVEL.id).toBe('thorn-garden-01')
    expect(DEFAULT_LEVEL.campaign?.shapeId).toBe('ring')
    expect(DEFAULT_LEVEL.campaign?.shapeLabel).toBe('圆环')
    expect(CAMPAIGN_LEVELS.map((level) => level.campaign?.tileCount)).toEqual([
      48, 60, 72, 84, 96,
      96, 96, 96, 96, 96,
      96, 96, 96, 96, 96,
      96, 96, 96, 96, 96,
    ])
    expect(CAMPAIGN_LEVELS.map((level) => level.campaign?.chapterRuleId)).toEqual(
      Array.from({ length: 20 }, () => 'classic'),
    )
  })

  it('assigns about 20 percent of the default level to each dynamic group', () => {
    const dynamicCounts = DEFAULT_LEVEL.tiles.reduce<Record<string, number>>((counts, tile) => {
      const key = tile.dynamicGroup ?? 'static'
      counts[key] = (counts[key] ?? 0) + 1
      return counts
    }, {})

    expect(DEFAULT_LEVEL.tiles).toHaveLength(48)
    expect(dynamicCounts['shift-a']).toBe(10)
    expect(dynamicCounts['shift-b']).toBe(10)
    expect(dynamicCounts.static).toBe(28)
  })

  it('keeps every shipped campaign level using even counts per tile type', () => {
    CAMPAIGN_LEVELS.forEach((level) => {
      const tileCounts = level.tiles.reduce<Record<string, number>>((counts, tile) => {
        counts[tile.type] = (counts[tile.type] ?? 0) + 1
        return counts
      }, {})

      expect(Object.values(tileCounts).every((count) => count % GAME_CONFIG.matchCount === 0)).toBe(true)
      expect(level.campaign?.recommendedSelectionCount).toBe(level.tiles.length)
    })
  })

  it('exposes at least one selectable pair on the default level opening', () => {
    const state = createInitialGameState(DEFAULT_LEVEL, 'playing')
    const exposedTiles = getRemainingBoardTiles(state)
      .filter((tile) => !isTileBlocked(tile.id, state, GAME_CONFIG))
      .filter((tile) => getTileCycleState(tile, state.elapsedMs)?.selectable ?? true)

    const exposedTypeCounts = exposedTiles.reduce<Record<string, number>>((counts, tile) => {
      const currentType = getDisplayedTileType(tile, DEFAULT_LEVEL, state.elapsedMs)
      counts[currentType] = (counts[currentType] ?? 0) + 1
      return counts
    }, {})

    expect(Object.values(exposedTypeCounts).some((count) => count >= GAME_CONFIG.matchCount)).toBe(true)
  })
})
