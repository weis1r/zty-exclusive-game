import type { CSSProperties } from 'react'
import { TILE_THEMES } from '../game/config'
import {
  canUseUndo,
  getHintSuggestion,
  getRemainingBoardTiles,
  isTileBlocked,
} from '../game/engine'
import type { GameConfig, GameState, LevelDefinition, TileDefinition } from '../game/types'
import { TilePiece } from '../components/TilePiece'

interface GameScreenProps {
  currentLevel: LevelDefinition
  totalLevels: number
  config: GameConfig
  state: GameState
  onBack: () => void
  onPick: (tileId: string) => void
  onUseHint: () => void
  onUseUndo: () => void
}

function getTileStyle(tile: TileDefinition) {
  const seed = tile.x * 13 + tile.y * 7 + tile.layer * 17
  const offsetX = ((seed % 5) - 2) * 2
  const offsetY = ((Math.floor(seed / 3) % 5) - 2) * 2
  const rotate = ((Math.floor(seed / 5) % 7) - 3) * 0.8

  return {
    left: `${tile.x}px`,
    top: `${tile.y}px`,
    zIndex: tile.layer * 10 + Math.round(tile.y / 10),
    '--tile-offset-x': `${offsetX}px`,
    '--tile-offset-y': `${offsetY}px`,
    '--tile-rotate': `${rotate}deg`,
  } as CSSProperties
}

export function GameScreen({
  currentLevel,
  totalLevels,
  config,
  state,
  onBack,
  onPick,
  onUseHint,
  onUseUndo,
}: GameScreenProps) {
  const activeBoardTiles = getRemainingBoardTiles(state).sort((leftTile, rightTile) => {
    if (leftTile.layer !== rightTile.layer) {
      return leftTile.layer - rightTile.layer
    }

    return leftTile.y - rightTile.y
  })
  const blockedTileIds = new Set(
    activeBoardTiles
      .filter((tile) => isTileBlocked(tile.id, state, config))
      .map((tile) => tile.id),
  )
  const levelOrder = currentLevel.campaign?.order ?? 1
  const boardWidth = currentLevel.boardWidth || config.boardWidth
  const boardHeight = currentLevel.boardHeight || config.boardHeight
  const boardScale = Math.min(1, 352 / boardWidth)
  const isResolvingMatch = state.matchBursts.length > 0
  const remainingCount = activeBoardTiles.length
  const hintSuggestion = getHintSuggestion(state, config)
  const canUseHintButton =
    state.status === 'playing' &&
    state.assistCharges.hint > 0 &&
    !isResolvingMatch &&
    hintSuggestion !== null
  const canUseUndoButton = canUseUndo(state)

  return (
    <section className="game-screen" data-testid="game-screen">
      <header className="game-screen__hud">
        <button
          type="button"
          className="icon-button icon-button--wood"
          data-testid="game-back-button"
          aria-label="返回首页"
          onClick={onBack}
        >
          <span className="icon-button__glyph">←</span>
        </button>

        <div className="game-screen__stats">
          <div className="game-stat">
            <span className="game-stat__label">关卡</span>
            <strong className="game-stat__value" data-testid="current-level-order">
              {levelOrder}
            </strong>
            <span className="sr-only" data-testid="current-level-id">
              {currentLevel.id}
            </span>
          </div>
          <div className="game-stat">
            <span className="game-stat__label">已点</span>
            <strong className="game-stat__value" data-testid="selected-count">
              {state.selectedCount} 次
            </strong>
          </div>
          <div className="game-stat">
            <span className="game-stat__label">剩余</span>
            <strong className="game-stat__value" data-testid="remaining-count">
              {remainingCount} 块
            </strong>
          </div>
        </div>

        <div className="game-screen__progress">/ {totalLevels}</div>
      </header>

      <section className="tray-rack">
        <div className="tray-rack__header">
          <p>顶部配对槽</p>
          <strong>
            {state.trayTiles.length}/{config.trayCapacity}
          </strong>
        </div>

        <div
          className="tray-rack__grid"
          data-testid="tray-grid"
          style={{
            gridTemplateColumns: `repeat(${config.trayCapacity}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: config.trayCapacity }, (_, slotIndex) => {
            const trayTile = state.trayTiles[slotIndex]
            const burst = state.matchBursts.find((matchBurst) => matchBurst.slotIndex === slotIndex)

            return (
              <div key={`slot-${slotIndex}`} className="tray-rack__slot">
                {trayTile ? (
                  <div className="tray-rack__tile" data-testid={`tray-slot-${slotIndex}`}>
                    <TilePiece theme={TILE_THEMES[trayTile.type]} compact />
                  </div>
                ) : (
                  <div className="tray-rack__placeholder" />
                )}

                {burst ? (
                  <div className="tray-rack__burst" aria-hidden="true">
                    <TilePiece theme={TILE_THEMES[burst.type]} compact burst />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <div
        className="game-board-shell"
        style={
          {
            '--board-width': `${boardWidth}px`,
            '--board-height': `${boardHeight}px`,
            '--board-scale': boardScale,
            '--scaled-board-width': `${boardWidth * boardScale}px`,
            '--scaled-board-height': `${boardHeight * boardScale}px`,
          } as CSSProperties
        }
      >
        <div className="game-board">
          {activeBoardTiles.map((tile) => {
            const theme = TILE_THEMES[tile.type]
            const blocked = blockedTileIds.has(tile.id)
            const hinted = state.lastHintTileId === tile.id

            return (
              <button
                key={tile.id}
                type="button"
                className={`board-tile${blocked ? ' board-tile--blocked' : ''}${
                  hinted ? ' board-tile--hinted' : ''
                }`}
                style={getTileStyle(tile)}
                onClick={() => onPick(tile.id)}
                aria-label={theme.title}
                data-testid={`tile-${tile.id}`}
                disabled={blocked || isResolvingMatch || state.status !== 'playing'}
              >
                <TilePiece theme={theme} />
              </button>
            )
          })}
        </div>
      </div>

      <footer className="game-tools">
        <button
          type="button"
          className="tool-button"
          data-testid="hint-button"
          disabled={!canUseHintButton}
          onClick={onUseHint}
        >
          <span className="tool-button__icon">灯</span>
          <span className="tool-button__text">提示</span>
          <span className="tool-button__count">{state.assistCharges.hint}</span>
        </button>
        <button
          type="button"
          className="tool-button"
          data-testid="undo-button"
          disabled={!canUseUndoButton}
          onClick={onUseUndo}
        >
          <span className="tool-button__icon">回</span>
          <span className="tool-button__text">撤销</span>
          <span className="tool-button__count">{state.assistCharges.undo}</span>
        </button>
      </footer>
    </section>
  )
}
