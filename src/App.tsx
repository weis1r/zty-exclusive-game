import { useEffect, useReducer, useState, type CSSProperties } from 'react'
import './App.css'
import { GAME_CONFIG, TILE_THEMES } from './game/config'
import {
  clearResolvedMatches,
  createInitialGameState,
  getRemainingBoardTiles,
  isTileBlocked,
  pickTile,
  restartGame,
  startGame,
} from './game/engine'
import { DEFAULT_LEVEL } from './game/levels'
import { loadPreferences, savePreferences } from './game/storage'
import type {
  GameConfig,
  GameState,
  LevelDefinition,
  TileDefinition,
} from './game/types'

const DIFFICULTY_LABELS: Record<NonNullable<LevelDefinition['difficulty']>, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

type GameAction =
  | { type: 'start' }
  | { type: 'pick'; tileId: string }
  | { type: 'restart' }
  | { type: 'clear-match-bursts' }

interface GameAppProps {
  level?: LevelDefinition
  config?: GameConfig
}

function createGameReducer(level: LevelDefinition, config: GameConfig) {
  return (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
      case 'start':
        return startGame(level)
      case 'pick':
        return pickTile(state, action.tileId, level, config)
      case 'restart':
        return restartGame(level)
      case 'clear-match-bursts':
        return clearResolvedMatches(state)
      default:
        return state
    }
  }
}

function getTileStyle(tile: TileDefinition) {
  const theme = TILE_THEMES[tile.type]

  return {
    left: `${tile.x}px`,
    top: `${tile.y}px`,
    zIndex: tile.layer * 10 + Math.round(tile.y / 10),
    '--tile-main': theme.main,
    '--tile-accent': theme.accent,
    '--tile-shadow': theme.shadow,
  } as CSSProperties
}

function getBurstStyle(slotIndex: number) {
  return {
    gridColumnStart: slotIndex + 1,
    gridRowStart: 1,
  } as CSSProperties
}

export function GameApp({
  level = DEFAULT_LEVEL,
  config = GAME_CONFIG,
}: GameAppProps) {
  const difficultyLabel = level.difficulty ? DIFFICULTY_LABELS[level.difficulty] : null
  const [state, dispatch] = useReducer(
    createGameReducer(level, config),
    level,
    (currentLevel) => createInitialGameState(currentLevel),
  )
  const [soundEnabled, setSoundEnabled] = useState(
    () => loadPreferences().soundEnabled,
  )

  useEffect(() => {
    savePreferences({ soundEnabled })
  }, [soundEnabled])

  useEffect(() => {
    if (state.matchBursts.length === 0) {
      return
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: 'clear-match-bursts' })
    }, config.animationMs.matchClear)

    return () => {
      window.clearTimeout(timer)
    }
  }, [config.animationMs.matchClear, state.matchBursts.length])

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
  const isResolvingMatch = state.matchBursts.length > 0
  const remainingCount = activeBoardTiles.length

  return (
    <main className="app-shell">
      <div className="sky-glow sky-glow--left" aria-hidden="true" />
      <div className="sky-glow sky-glow--right" aria-hidden="true" />

      <section className="phone-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">H5 砖块消除 MVP</p>
            <h1>砖了个砖</h1>
          </div>

          <button
            type="button"
            className="sound-toggle"
            onClick={() => setSoundEnabled((currentValue) => !currentValue)}
            aria-pressed={!soundEnabled}
          >
            音效 {soundEnabled ? '开' : '关'}
          </button>
        </header>

        {state.status === 'idle' ? (
          <section className="intro-card">
            <div className="intro-card__hero">
              <span className="intro-badge">{level.name}</span>
              <p className="intro-title">叠层点选，三消过关</p>
              <p className="intro-copy">
                先点开最上层可见砖块，凑齐 3 个相同图案就会自动消除。
                收集槽一共只有 7 格，满了还没消掉就会失败。
              </p>
            </div>

            <div className="intro-preview" aria-hidden="true">
              {(['ember', 'leaf', 'bloom'] as const).map((tileType) => {
                const theme = TILE_THEMES[tileType]

                return (
                  <div
                    key={tileType}
                    className="preview-tile"
                    style={
                      {
                        '--tile-main': theme.main,
                        '--tile-accent': theme.accent,
                        '--tile-shadow': theme.shadow,
                      } as CSSProperties
                    }
                  >
                    <span>{theme.label}</span>
                  </div>
                )
              })}
            </div>

            <div className="intro-rules">
              <div className="rule-chip">1 关完整体验</div>
              <div className="rule-chip">固定 7 格槽位</div>
              <div className="rule-chip">手机竖屏优先</div>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => dispatch({ type: 'start' })}
            >
              开始挑战
            </button>
          </section>
        ) : (
          <section className="game-stage">
            <div className="status-strip">
              <div className="status-chip">
                <span className="status-label">关卡</span>
                <strong>{level.name}</strong>
              </div>
              {difficultyLabel ? (
                <div className="status-chip">
                  <span className="status-label">难度</span>
                  <strong>{difficultyLabel}</strong>
                </div>
              ) : null}
              <div className="status-chip">
                <span className="status-label">已选</span>
                <strong data-testid="selected-count">{state.selectedCount} 次</strong>
              </div>
              <div className="status-chip">
                <span className="status-label">剩余</span>
                <strong data-testid="remaining-count">{remainingCount} 块</strong>
              </div>
            </div>

            <div
              className="board-shell"
              style={
                {
                  '--board-width': `${config.boardWidth}px`,
                  '--board-height': `${config.boardHeight}px`,
                  '--board-scale': config.boardScaleBase,
                } as CSSProperties
              }
            >
              <div className="board-surface">
                {activeBoardTiles.map((tile) => {
                  const theme = TILE_THEMES[tile.type]
                  const blocked = blockedTileIds.has(tile.id)

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className={`tile-card${blocked ? ' is-blocked' : ''}`}
                      style={getTileStyle(tile)}
                      onClick={() => dispatch({ type: 'pick', tileId: tile.id })}
                      aria-label={theme.title}
                      disabled={blocked || isResolvingMatch || state.status !== 'playing'}
                    >
                      <span className="tile-card__shadow" aria-hidden="true" />
                      <span className="tile-card__face">
                        <span className="tile-card__label">{theme.label}</span>
                        <span className="tile-card__caption">{theme.title}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <section className="tray-panel">
              <div className="tray-panel__heading">
                <div>
                  <p className="eyebrow">收集槽</p>
                  <h2>
                    {state.trayTiles.length}/{config.trayCapacity}
                  </h2>
                </div>
                <p className="tray-tip">
                  {isResolvingMatch ? '正在结算三消...' : '同类砖块会自动相邻整理'}
                </p>
              </div>

              <div
                className="tray-grid"
                data-testid="tray-grid"
                style={{
                  gridTemplateColumns: `repeat(${config.trayCapacity}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: config.trayCapacity }, (_, slotIndex) => {
                  const trayTile = state.trayTiles[slotIndex]

                  return (
                    <div key={`slot-${slotIndex}`} className="tray-slot">
                      {trayTile ? (
                        <div
                          className="tray-tile"
                          data-testid={`tray-slot-${slotIndex}`}
                          style={
                            {
                              '--tile-main': TILE_THEMES[trayTile.type].main,
                              '--tile-accent': TILE_THEMES[trayTile.type].accent,
                              '--tile-shadow': TILE_THEMES[trayTile.type].shadow,
                              '--entry-duration': `${config.animationMs.trayEntry}ms`,
                            } as CSSProperties
                          }
                        >
                          <span>{TILE_THEMES[trayTile.type].label}</span>
                        </div>
                      ) : (
                        <div className="tray-slot__placeholder" />
                      )}
                    </div>
                  )
                })}

                {state.matchBursts.map((burst) => (
                  <div
                    key={burst.id}
                    className="match-burst"
                    style={getBurstStyle(burst.slotIndex)}
                    aria-hidden="true"
                  >
                    <span>{TILE_THEMES[burst.type].label}</span>
                  </div>
                ))}
              </div>
            </section>
          </section>
        )}

        {(state.status === 'won' || state.status === 'lost') && (
          <div className="modal-backdrop">
            <div className="result-modal">
              <p className="eyebrow">{state.status === 'won' ? '通关' : '失败'}</p>
              <h2>{state.status === 'won' ? '挑战成功' : '卡住了'}</h2>
              <p>
                {state.status === 'won'
                  ? `本局共消除了 ${state.removedCount} 块砖，整层花园已经清空。`
                  : '收集槽已经装满，重新整理一下节奏再来一局。'}
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => dispatch({ type: 'restart' })}
              >
                再来一局
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default function App() {
  return <GameApp />
}
