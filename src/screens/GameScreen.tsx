import { useEffect, useRef, useState, type CSSProperties } from 'react'
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

function getTileStyle(
  tile: TileDefinition,
  boardScale: number,
  boardOffsetX: number,
  boardOffsetY: number,
) {
  const seed = tile.x * 13 + tile.y * 7 + tile.layer * 17
  const offsetX = ((seed % 5) - 2) * 2
  const offsetY = ((Math.floor(seed / 3) % 5) - 2) * 2
  const rotate = ((Math.floor(seed / 5) % 7) - 3) * 0.8

  return {
    left: `${boardOffsetX + tile.x * boardScale}px`,
    top: `${boardOffsetY + tile.y * boardScale}px`,
    width: `${72 * boardScale}px`,
    height: `${92 * boardScale}px`,
    zIndex: tile.layer * 10 + Math.round(tile.y / 10),
    '--tile-offset-x': `${offsetX * boardScale}px`,
    '--tile-offset-y': `${offsetY * boardScale}px`,
    '--tile-rotate': `${rotate}deg`,
  } as CSSProperties
}

function formatShiftCountdown(msUntilSelectable: number) {
  return `${Math.max(1, Math.ceil(msUntilSelectable / 1000))}秒`
}

function formatRoundCountdown(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function useBoardViewportSize() {
  const boardShellRef = useRef<HTMLDivElement | null>(null)
  const [boardViewport, setBoardViewport] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = boardShellRef.current

    if (!element) {
      return
    }

    const updateViewport = (width: number, height: number) => {
      setBoardViewport({
        width,
        height,
      })
    }

    const syncFromElement = () => {
      const rect = element.getBoundingClientRect()
      updateViewport(rect.width, rect.height)
    }

    syncFromElement()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncFromElement)

      return () => {
        window.removeEventListener('resize', syncFromElement)
      }
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      updateViewport(entry.contentRect.width, entry.contentRect.height)
    })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return {
    boardShellRef,
    boardViewport,
  }
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
  const totalTileCount = currentLevel.campaign?.tileCount ?? currentLevel.tiles.length
  const boardWidth = currentLevel.boardWidth || config.boardWidth
  const boardHeight = currentLevel.boardHeight || config.boardHeight
  const { boardShellRef, boardViewport } = useBoardViewportSize()
  const widthScale = boardViewport.width > 0 ? Math.max(0.1, boardViewport.width / boardWidth) : 1
  const heightScale =
    boardViewport.height > 0 ? Math.max(0.1, boardViewport.height / boardHeight) : 1
  const boardScale = Math.min(1, widthScale, heightScale)
  const isResolvingMatch = state.matchBursts.length > 0 || state.hintBursts.length > 0
  const remainingCount = Math.max(0, totalTileCount - state.removedCount)
  const scaledBoardWidth = boardWidth * boardScale
  const scaledBoardHeight = boardHeight * boardScale
  const boardOffsetX = Math.max(0, (boardViewport.width - scaledBoardWidth) / 2)
  const boardOffsetY = Math.max(0, (boardViewport.height - scaledBoardHeight) / 2)
  const timerUrgent = state.timerRemainingMs <= 15_000
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
        <div className="game-screen__topbar">
          <button
            type="button"
            className="icon-button icon-button--wood"
            data-testid="game-back-button"
            aria-label="返回首页"
            onClick={onBack}
          >
            <span className="icon-button__glyph">←</span>
          </button>

          <div className="game-screen__hud-row">
            <div className="game-screen__info-pill">
              <span className="game-screen__info-label">关卡</span>
              <strong className="game-screen__info-value">
                {levelOrder}
                <span className="game-screen__info-total">/{totalLevels}</span>
              </strong>
              <span className="sr-only" data-testid="current-level-order">
                {levelOrder}
              </span>
              <span className="sr-only" data-testid="current-level-id">
                {currentLevel.id}
              </span>
            </div>

            <div className="game-screen__info-pill game-screen__info-pill--match">
              <span className="game-screen__info-label">剩余块数</span>
              <strong className="game-screen__info-value" data-testid="match-progress">
                {remainingCount}
              </strong>
            </div>
          </div>
        </div>

        <div className={`game-timer${timerUrgent ? ' game-timer--urgent' : ''}`}>
          <span className="game-timer__label">倒计时</span>
          <strong className="game-timer__value" data-testid="countdown-remaining">
            {formatRoundCountdown(state.timerRemainingMs)}
          </strong>
        </div>

        <span className="sr-only" data-testid="selected-count">
          {state.selectedCount} 次
        </span>
        <span className="sr-only" data-testid="remaining-count">
          {remainingCount} 块
        </span>
        <span className="sr-only" data-testid="game-tile-count">
          {totalTileCount}
        </span>
        <span className="sr-only" data-testid="game-rule-chip">
          {currentLevel.campaign?.chapterRuleLabel ?? '经典四槽'}
        </span>
      </header>

      <section className="tray-rack">
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
              <span className="orbit-pockets__label">暂存</span>
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
            </div>
          ) : null}
        </div>
      </section>

      <div
        className="game-board"
        ref={boardShellRef}
        style={{ '--board-scale': boardScale } as CSSProperties}
      >
        {state.hintBursts.map((burst) => (
          <div
            key={burst.id}
            className="board-burst board-burst--hint"
            style={getTileStyle(burst, boardScale, boardOffsetX, boardOffsetY)}
            aria-hidden="true"
          >
            <TilePiece theme={TILE_THEMES[burst.type]} />
          </div>
        ))}

        {activeBoardTiles.map((tile) => {
          const theme = TILE_THEMES[getDisplayedTileType(tile, currentLevel, state.elapsedMs)]
          const blocked = blockedTileIds.has(tile.id)
          const cycleState = getTileCycleState(tile, state.elapsedMs)
          const locked = !blocked && !isTileSelectableInCurrentCycle(tile, state.elapsedMs)
          const faceDown = blocked || locked

          return (
            <button
              key={tile.id}
              type="button"
              className={`board-tile${blocked ? ' board-tile--blocked' : ''}${
                cycleState ? ' board-tile--dynamic' : ''
              }${
                locked ? ' board-tile--locked' : ''
              }${cycleState?.group === 'shift-b' ? ' board-tile--reverse' : ''}`}
              style={getTileStyle(tile, boardScale, boardOffsetX, boardOffsetY)}
              onClick={() => onPick(tile.id)}
              aria-label={faceDown ? '未揭开的牌' : theme.title}
              data-testid={`tile-${tile.id}`}
              disabled={blocked || locked || isResolvingMatch || state.status !== 'playing'}
            >
              <TilePiece theme={theme} faceDown={faceDown} />
              {cycleState && !blocked ? (
                <span className={`board-tile__shift-state board-tile__shift-state--${cycleState.group}`}>
                  {cycleState.selectable ? '可点' : formatShiftCountdown(cycleState.msUntilSelectable)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {state.status === 'won' ? (
        <div className="game-win-celebration" data-testid="game-win-celebration" aria-hidden="true">
          <div className="game-win-celebration__glow" />
          <div className="game-win-celebration__ring game-win-celebration__ring--outer" />
          <div className="game-win-celebration__ring game-win-celebration__ring--inner" />
          <div className="game-win-celebration__spark game-win-celebration__spark--a">✦</div>
          <div className="game-win-celebration__spark game-win-celebration__spark--b">✦</div>
          <div className="game-win-celebration__spark game-win-celebration__spark--c">✶</div>
          <div className="game-win-celebration__spark game-win-celebration__spark--d">✶</div>
          <div className="game-win-celebration__banner">
            <span className="game-win-celebration__eyebrow">Victory</span>
            <strong className="game-win-celebration__title">本关通过</strong>
            <span className="game-win-celebration__note">剩余 4 块自动收官</span>
          </div>
        </div>
      ) : null}

      <footer className="game-tools">
        <button
          type="button"
          className="tool-button"
          data-testid="hint-button"
          disabled={!canUseHintButton}
          onClick={onUseHint}
        >
          <span className="tool-button__text">消除</span>
          <span className="tool-button__count">{state.assistCharges.hint}</span>
        </button>
        <button
          type="button"
          className="tool-button"
          data-testid="undo-button"
          disabled={!canUseUndoButton}
          onClick={onUseUndo}
        >
          <span className="tool-button__text">撤销</span>
          <span className="tool-button__count">{state.assistCharges.undo}</span>
        </button>
      </footer>
    </section>
  )
}
