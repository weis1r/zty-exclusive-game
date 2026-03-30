import type { CSSProperties } from 'react'
import { TILE_THEMES } from '../game/config'
import {
  canMoveTrayTileToPocket,
  canReleasePocketToTray,
  canUseUndo,
  getDisplayedTileType,
  getHintSuggestion,
  getRemainingBoardTiles,
  getTileCycleState,
  isTileBlocked,
  isTileSelectableInCurrentCycle,
} from '../game/engine'
import type { GameConfig, GameState, LevelDefinition, TileDefinition } from '../game/types'
import { TilePiece } from '../components/TilePiece'
import { ShapeBadge } from '../components/ShapeBadge'

interface GameScreenProps {
  currentLevel: LevelDefinition
  totalLevels: number
  config: GameConfig
  state: GameState
  onBack: () => void
  onPick: (tileId: string) => void
  onMoveTrayToPocket: (trayIndex: number) => void
  onReleasePocket: (pocketIndex: number) => void
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

function formatShiftCountdown(msUntilSelectable: number) {
  return `${Math.max(1, Math.ceil(msUntilSelectable / 1000))}秒`
}

export function GameScreen({
  currentLevel,
  totalLevels,
  config,
  state,
  onBack,
  onPick,
  onMoveTrayToPocket,
  onReleasePocket,
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
  const shapeId = currentLevel.campaign?.shapeId
  const shapeLabel = currentLevel.campaign?.shapeLabel
  const tileCount = currentLevel.campaign?.tileCount ?? currentLevel.tiles.length
  const chapterRuleLabel = currentLevel.campaign?.chapterRuleLabel ?? '经典四槽'
  const hintSuggestion = getHintSuggestion(state, currentLevel, config)
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
            <span className="game-stat__label">块数</span>
            <strong className="game-stat__value" data-testid="game-tile-count">
              {tileCount}
            </strong>
          </div>
          <div className="game-stat">
            <span className="game-stat__label">剩余</span>
            <strong className="game-stat__value" data-testid="remaining-count">
              {remainingCount} 块
            </strong>
          </div>
        </div>

        <div className="game-screen__meta">
          <ShapeBadge shapeId={shapeId} shapeLabel={shapeLabel} className="game-screen__shape-chip" />
          <span className="hud-chip" data-testid="game-rule-chip">
            {chapterRuleLabel}
          </span>
          <div className="game-screen__progress">/ {totalLevels}</div>
        </div>
      </header>

      <section className="tray-rack">
        <div className="tray-rack__header">
          <div>
            <p>顶部配对槽</p>
            <span className="tray-rack__rule">{chapterRuleLabel}</span>
          </div>
          <strong>
            {state.trayTiles.length}/{config.trayCapacity}
          </strong>
        </div>

        <div className="tray-rack__body">
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
              const canPocketTile =
                trayTile !== undefined && canMoveTrayTileToPocket(state, currentLevel, slotIndex)

              return (
                <div key={`slot-${slotIndex}`} className="tray-rack__slot">
                  {trayTile ? (
                    state.orbitPockets.length > 0 ? (
                      <button
                        type="button"
                        className={`tray-rack__tile-button${
                          canPocketTile ? ' tray-rack__tile-button--ready' : ''
                        }`}
                        data-testid={`tray-slot-button-${slotIndex}`}
                        onClick={() => onMoveTrayToPocket(slotIndex)}
                        disabled={!canPocketTile}
                        aria-label={`暂存托盘第 ${slotIndex + 1} 张牌`}
                      >
                        <div className="tray-rack__tile" data-testid={`tray-slot-${slotIndex}`}>
                          <TilePiece theme={TILE_THEMES[trayTile.type]} compact />
                        </div>
                      </button>
                    ) : (
                      <div className="tray-rack__tile" data-testid={`tray-slot-${slotIndex}`}>
                        <TilePiece theme={TILE_THEMES[trayTile.type]} compact />
                      </div>
                    )
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

          {state.orbitPockets.length > 0 ? (
            <div className="orbit-pockets" data-testid="orbit-pockets">
              <span className="orbit-pockets__label">轨道暂存</span>
              <div className="orbit-pockets__grid">
                {state.orbitPockets.map((pocketTile, pocketIndex) => {
                  const canRelease = canReleasePocketToTray(state, currentLevel, pocketIndex)

                  return (
                    <button
                      key={`orbit-pocket-${pocketIndex}`}
                      type="button"
                      className={`orbit-pocket${pocketTile ? ' orbit-pocket--filled' : ''}`}
                      data-testid={`orbit-pocket-${pocketIndex}`}
                      onClick={() => onReleasePocket(pocketIndex)}
                      disabled={!canRelease}
                      aria-label={
                        pocketTile
                          ? `取回第 ${pocketIndex + 1} 个暂存位`
                          : `第 ${pocketIndex + 1} 个暂存位为空`
                      }
                    >
                      {pocketTile ? (
                        <TilePiece theme={TILE_THEMES[pocketTile.type]} compact />
                      ) : (
                        <span className="orbit-pocket__placeholder">空</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <span className="shift-note">点托盘牌送入暂存，点暂存位取回</span>
            </div>
          ) : (
            <div className="game-screen__shift-legend" data-testid="shift-legend">
              <span className="shift-chip shift-chip--a">A组顺变</span>
              <span className="shift-chip shift-chip--b">B组逆变</span>
              <span className="shift-note">变换块每 3 秒换型，最后 1 秒才可点</span>
            </div>
          )}
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
          <div className="game-board__watermark" aria-hidden="true">
            <ShapeBadge
              shapeId={shapeId}
              shapeLabel={shapeLabel}
              className="game-board__watermark-badge"
            />
          </div>

          {activeBoardTiles.map((tile) => {
            const theme = TILE_THEMES[getDisplayedTileType(tile, currentLevel, state.elapsedMs)]
            const blocked = blockedTileIds.has(tile.id)
            const hinted = state.lastHintTileId === tile.id
            const cycleState = getTileCycleState(tile, state.elapsedMs)
            const locked = !blocked && !isTileSelectableInCurrentCycle(tile, state.elapsedMs)

            return (
              <button
                key={tile.id}
                type="button"
                className={`board-tile${blocked ? ' board-tile--blocked' : ''}${
                  hinted ? ' board-tile--hinted' : ''
                }${cycleState ? ' board-tile--dynamic' : ''}${
                  locked ? ' board-tile--locked' : ''
                }${cycleState?.group === 'shift-b' ? ' board-tile--reverse' : ''}`}
                style={getTileStyle(tile)}
                onClick={() => onPick(tile.id)}
                aria-label={theme.title}
                data-testid={`tile-${tile.id}`}
                disabled={blocked || locked || isResolvingMatch || state.status !== 'playing'}
              >
                <TilePiece theme={theme} />
                {cycleState ? (
                  <span className={`board-tile__shift-state board-tile__shift-state--${cycleState.group}`}>
                    {cycleState.selectable
                      ? '可点'
                      : formatShiftCountdown(cycleState.msUntilSelectable)}
                  </span>
                ) : null}
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
