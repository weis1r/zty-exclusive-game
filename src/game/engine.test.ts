import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './config'
import {
  clearResolvedMatches,
  createInitialGameState,
  insertIntoTray,
  isTileBlocked,
  pickTile,
  restartGame,
} from './engine'
import { DEFAULT_LEVEL } from './levels'
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

function pickSequence(level: LevelDefinition, tileIds: string[]) {
  let state = createInitialGameState(level, 'playing')

  for (const tileId of tileIds) {
    state = pickTile(state, tileId, level, GAME_CONFIG)

    if (state.matchBursts.length > 0) {
      state = clearResolvedMatches(state)
    }
  }

  return state
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

  it('keeps the default level weighted toward early repeated matches', () => {
    const typeCounts = DEFAULT_LEVEL.tiles.reduce<Record<string, number>>((counts, tile) => {
      counts[tile.type] = (counts[tile.type] ?? 0) + 1
      return counts
    }, {})

    expect(typeCounts).toEqual({
      ember: 6,
      leaf: 6,
      bloom: 6,
      bell: 3,
      cloud: 3,
      shell: 3,
    })
  })

  it('still allows recovery on the default level after an early mixed pick', () => {
    const state = pickSequence(DEFAULT_LEVEL, [
      'leaf-1',
      'ember-1',
      'ember-2',
      'ember-3',
      'leaf-2',
      'leaf-3',
      'bloom-1',
      'bloom-2',
      'bloom-3',
      'bell-1',
      'bell-2',
      'bell-3',
      'cloud-1',
      'cloud-2',
      'cloud-3',
      'shell-1',
      'shell-2',
      'shell-3',
      'berry-1',
      'berry-2',
      'berry-3',
      'pine-1',
      'pine-2',
      'pine-3',
      'wave-1',
      'wave-2',
      'wave-3',
    ])

    expect(state.status).toBe('won')
    expect(state.trayTiles).toHaveLength(0)
    expect(state.removedCount).toBe(DEFAULT_LEVEL.tiles.length)
  })

  it('still loses the default level after a clearly greedy spread of picks', () => {
    const state = pickSequence(DEFAULT_LEVEL, [
      'ember-1',
      'leaf-1',
      'bloom-1',
      'bell-1',
      'cloud-1',
      'shell-1',
      'berry-1',
    ])

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
})
