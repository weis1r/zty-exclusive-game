import { getRemainingBoardTiles, isTileBlocked } from './game/engine'
import type { GameConfig, GameState, TileType } from './game/types'

const QUICK_SHIFT_PORTION = 0.2

function getSortedExposedBoardTiles(state: GameState, config: GameConfig) {
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

export function buildQuickShiftPlan(
  state: GameState,
  config: GameConfig,
  cursor: number,
): { typeMap: Record<string, TileType>; shiftedTileIds: string[] } | null {
  const exposedTiles = getSortedExposedBoardTiles(state, config)
  const pairsByType = new Map<TileType, string[]>()

  exposedTiles.forEach((tile) => {
    pairsByType.set(tile.type, [...(pairsByType.get(tile.type) ?? []), tile.id])
  })

  const pairGroups = [...pairsByType.entries()]
    .filter(([, tileIds]) => tileIds.length >= config.matchCount)
    .map(([type, tileIds]) => ({
      type,
      tileIds: tileIds.slice(0, config.matchCount),
    }))

  if (pairGroups.length < 2) {
    return null
  }

  const desiredGroupCount = Math.min(
    pairGroups.length,
    Math.max(2, Math.round((exposedTiles.length * QUICK_SHIFT_PORTION) / config.matchCount)),
  )
  const selectedGroups = Array.from({ length: desiredGroupCount }, (_, index) => {
    return pairGroups[(cursor + index) % pairGroups.length]
  })
  const typeMap: Record<string, TileType> = {}

  selectedGroups.forEach((group, index) => {
    const nextType = selectedGroups[(index + 1) % selectedGroups.length]?.type

    if (!nextType || nextType === group.type) {
      return
    }

    group.tileIds.forEach((tileId) => {
      typeMap[tileId] = nextType
    })
  })

  const shiftedTileIds = Object.keys(typeMap)

  if (shiftedTileIds.length === 0) {
    return null
  }

  return {
    typeMap,
    shiftedTileIds,
  }
}
