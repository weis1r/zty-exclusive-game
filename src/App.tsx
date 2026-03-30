import { startTransition, useEffect, useReducer, useRef, useState } from 'react'
import './App.css'
import { GAME_CONFIG } from './game/config'
import {
  clearHint,
  clearResolvedMatches,
  createInitialGameState,
  getRemainingBoardTiles,
  isTileBlocked,
  pickTile,
  restartGame,
  startGame,
  useHint,
  useUndo,
} from './game/engine'
import { CAMPAIGN, DEFAULT_LEVEL, getCampaignLevelById, getNextCampaignLevelId } from './game/levels'
import {
  loadCampaignProgress,
  loadPreferences,
  recordLevelCompletion,
  resetCampaignProgress,
  savePreferences,
  setCurrentCampaignLevel,
} from './game/storage'
import type { CampaignDefinition, CampaignProgress, GameConfig, GameState, LevelDefinition } from './game/types'
import { HomeScreen } from './screens/HomeScreen'
import { GameScreen } from './screens/GameScreen'
import { ResultScreen } from './screens/ResultScreen'
import type { AppScreen, RoundSummary } from './screens/screen-types'

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => Promise<void>
  }
}

type GameAction =
  | { type: 'start-level'; level: LevelDefinition }
  | { type: 'pick'; tileId: string }
  | { type: 'restart' }
  | { type: 'clear-match-bursts' }
  | { type: 'clear-hint' }
  | { type: 'use-hint' }
  | { type: 'use-undo' }

interface GameAppProps {
  config?: GameConfig
  campaign?: CampaignDefinition
}

interface SessionAssistUsage {
  hintUsed: number
  undoUsed: number
}

function createGameReducer(level: LevelDefinition, config: GameConfig) {
  return (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
      case 'start-level':
        return startGame(action.level)
      case 'pick':
        return pickTile(state, action.tileId, level, config)
      case 'restart':
        return restartGame(level)
      case 'clear-match-bursts':
        return clearResolvedMatches(state)
      case 'clear-hint':
        return clearHint(state)
      case 'use-hint':
        return useHint(state, config)
      case 'use-undo':
        return useUndo(state)
      default:
        return state
    }
  }
}

function getLevelOrder(level: LevelDefinition) {
  return level.campaign?.order ?? 1
}

function calculateLevelStars(level: LevelDefinition, selectedCount: number) {
  const thresholds = level.campaign?.starSelectionThresholds

  if (!thresholds) {
    return 3
  }

  if (selectedCount <= thresholds[0]) {
    return 3
  }

  if (selectedCount <= thresholds[1]) {
    return 2
  }

  return 1
}

function buildRoundSummary(
  outcome: 'won' | 'lost',
  level: LevelDefinition,
  nextLevel: LevelDefinition | null,
  selectedCount: number,
  durationMs: number | null,
  assistUsage: SessionAssistUsage,
): RoundSummary {
  return {
    outcome,
    levelId: level.id,
    levelOrder: getLevelOrder(level),
    shapeId: level.campaign?.shapeId ?? null,
    shapeLabel: level.campaign?.shapeLabel ?? null,
    nextLevelId: nextLevel?.id ?? null,
    nextLevelOrder: nextLevel ? getLevelOrder(nextLevel) : null,
    selectedCount,
    durationMs,
    hintUsed: assistUsage.hintUsed,
    undoUsed: assistUsage.undoUsed,
  }
}

export function GameApp({ config = GAME_CONFIG, campaign = CAMPAIGN }: GameAppProps) {
  const campaignLevels = campaign.levels
  const fallbackLevel = campaignLevels[0] ?? DEFAULT_LEVEL
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>(() =>
    loadCampaignProgress(campaign),
  )
  const [activeLevelId, setActiveLevelId] = useState(
    () => loadCampaignProgress(campaign).currentLevelId || fallbackLevel.id,
  )
  const [screen, setScreen] = useState<AppScreen>('home')
  const [soundEnabled, setSoundEnabled] = useState(() => loadPreferences().soundEnabled)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [assistUsage, setAssistUsage] = useState<SessionAssistUsage>({
    hintUsed: 0,
    undoUsed: 0,
  })
  const [roundSummary, setRoundSummary] = useState<RoundSummary | null>(null)
  const settledRoundRef = useRef<string | null>(null)

  const homeLevel = getCampaignLevelById(campaignProgress.currentLevelId, campaign) ?? fallbackLevel
  const currentLevel = getCampaignLevelById(activeLevelId, campaign) ?? fallbackLevel
  const [state, dispatch] = useReducer(
    createGameReducer(currentLevel, config),
    currentLevel,
    (level) => createInitialGameState(level),
  )

  useEffect(() => {
    savePreferences({ soundEnabled })
  }, [soundEnabled])

  useEffect(() => {
    if (typeof window.advanceTime === 'function') {
      return
    }

    window.advanceTime = (ms: number) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, ms)
      })

    return () => {
      delete window.advanceTime
    }
  }, [])

  useEffect(() => {
    const renderGameToText = () => {
      if (screen === 'home') {
        return JSON.stringify({
          screen,
          currentLevelId: homeLevel.id,
          currentLevelOrder: getLevelOrder(homeLevel),
          currentShapeId: homeLevel.campaign?.shapeId ?? null,
          currentShapeLabel: homeLevel.campaign?.shapeLabel ?? null,
          totalLevels: campaignLevels.length,
          soundEnabled,
          settingsOpen,
        })
      }

      if (screen === 'result') {
        return JSON.stringify({
          screen,
          summary: roundSummary,
          currentProgressLevelId: campaignProgress.currentLevelId,
        })
      }

      return JSON.stringify({
        screen,
        levelId: currentLevel.id,
        levelOrder: getLevelOrder(currentLevel),
        shapeId: currentLevel.campaign?.shapeId ?? null,
        shapeLabel: currentLevel.campaign?.shapeLabel ?? null,
        status: state.status,
        selectedCount: state.selectedCount,
        trayTiles: state.trayTiles.map((trayTile) => trayTile.type),
        assistCharges: state.assistCharges,
        remainingCount: getRemainingBoardTiles(state).length,
        exposedTiles: getRemainingBoardTiles(state)
          .filter((tile) => !isTileBlocked(tile.id, state, config))
          .map((tile) => ({
            id: tile.id,
            type: tile.type,
            x: tile.x,
            y: tile.y,
            layer: tile.layer,
          })),
      })
    }

    Reflect.set(window, 'render_game_to_text', renderGameToText)

    return () => {
      Reflect.deleteProperty(window, 'render_game_to_text')
    }
  }, [
    campaignLevels.length,
    campaignProgress.currentLevelId,
    config,
    currentLevel,
    homeLevel,
    roundSummary,
    screen,
    settingsOpen,
    soundEnabled,
    state,
  ])

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

  useEffect(() => {
    if (state.lastHintTileId === null) {
      return
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: 'clear-hint' })
    }, 1500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [state.lastHintTileId])

  useEffect(() => {
    if (screen !== 'game' || (state.status !== 'won' && state.status !== 'lost')) {
      return
    }

    const settleKey = `${state.levelId}:${state.status}:${state.selectedCount}:${startedAt ?? 'na'}`

    if (settledRoundRef.current === settleKey) {
      return
    }

    settledRoundRef.current = settleKey
    const durationMs = startedAt === null ? null : Date.now() - startedAt
    const nextLevelId =
      state.status === 'won' ? getNextCampaignLevelId(state.levelId, campaign) : null
    const nextLevel = nextLevelId ? getCampaignLevelById(nextLevelId, campaign) : null
    const summary = buildRoundSummary(
      state.status,
      currentLevel,
      nextLevel,
      state.selectedCount,
      durationMs,
      assistUsage,
    )
    const timer = window.setTimeout(() => {
      if (state.status === 'won') {
        startTransition(() => {
          setCampaignProgress((currentProgress) =>
            recordLevelCompletion(
              currentProgress,
              campaign,
              {
                levelId: state.levelId,
                selectedCount: state.selectedCount,
                completionMs: durationMs ?? undefined,
              },
              calculateLevelStars(currentLevel, state.selectedCount),
            ),
          )
        })
      }

      startTransition(() => {
        setRoundSummary(summary)
        setScreen('result')
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [assistUsage, campaign, currentLevel, screen, startedAt, state.levelId, state.selectedCount, state.status])

  function startLevel(levelId: string, allowLocked = false) {
    const nextLevel = getCampaignLevelById(levelId, campaign)
    const isUnlocked = campaignProgress.levelRecords[levelId]?.unlocked ?? false

    if (!nextLevel || (!allowLocked && !isUnlocked)) {
      return
    }

    settledRoundRef.current = null
    setSettingsOpen(false)
    setRoundSummary(null)
    setAssistUsage({
      hintUsed: 0,
      undoUsed: 0,
    })
    setStartedAt(Date.now())
    setActiveLevelId(levelId)
    setScreen('game')
    setCampaignProgress((currentProgress) =>
      setCurrentCampaignLevel(currentProgress, campaign, levelId),
    )
    dispatch({ type: 'start-level', level: nextLevel })
  }

  function retryCurrentLevel() {
    settledRoundRef.current = null
    setRoundSummary(null)
    setAssistUsage({
      hintUsed: 0,
      undoUsed: 0,
    })
    setStartedAt(Date.now())
    setScreen('game')
    dispatch({ type: 'restart' })
  }

  function goHome() {
    setSettingsOpen(false)
    setRoundSummary(null)
    setScreen('home')
  }

  function handleBackFromGame() {
    if (state.status === 'playing') {
      const shouldLeave = window.confirm('确定要放弃这一局并返回首页吗？')

      if (!shouldLeave) {
        return
      }
    }

    goHome()
    dispatch({ type: 'clear-hint' })
  }

  function handleUseHint() {
    setAssistUsage((currentUsage) => ({
      ...currentUsage,
      hintUsed: currentUsage.hintUsed + 1,
    }))
    dispatch({ type: 'use-hint' })
  }

  function handleUseUndo() {
    setAssistUsage((currentUsage) => ({
      ...currentUsage,
      undoUsed: currentUsage.undoUsed + 1,
    }))
    dispatch({ type: 'use-undo' })
  }

  function handleResetProgress() {
    if (!window.confirm('要清空当前进度并从第 1 关重新开始吗？')) {
      return
    }

    const nextProgress = resetCampaignProgress(campaign)

    settledRoundRef.current = null
    setCampaignProgress(nextProgress)
    setActiveLevelId(nextProgress.currentLevelId)
    setAssistUsage({
      hintUsed: 0,
      undoUsed: 0,
    })
    setRoundSummary(null)
    setStartedAt(null)
    setScreen('home')
    setSettingsOpen(false)
  }

  function handlePrimaryResultAction() {
    if (!roundSummary) {
      return
    }

    if (roundSummary.outcome === 'won' && roundSummary.nextLevelId) {
      startLevel(roundSummary.nextLevelId, true)
      return
    }

    retryCurrentLevel()
  }

  function handleSecondaryResultAction() {
    goHome()
  }

  return (
    <main className="app-shell">
      <section className="device-shell">
        {screen === 'home' ? (
          <HomeScreen
            currentLevel={homeLevel}
            soundEnabled={soundEnabled}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((currentValue) => !currentValue)}
            onToggleSound={() => setSoundEnabled((currentValue) => !currentValue)}
            onResetProgress={handleResetProgress}
            onStart={() => startLevel(campaignProgress.currentLevelId)}
          />
        ) : null}

        {screen === 'game' ? (
          <GameScreen
            currentLevel={currentLevel}
            totalLevels={campaignLevels.length}
            config={config}
            state={state}
            onBack={handleBackFromGame}
            onPick={(tileId) => dispatch({ type: 'pick', tileId })}
            onUseHint={handleUseHint}
            onUseUndo={handleUseUndo}
          />
        ) : null}

        {screen === 'result' && roundSummary ? (
          <ResultScreen
            summary={roundSummary}
            onPrimary={handlePrimaryResultAction}
            onSecondary={handleSecondaryResultAction}
          />
        ) : null}
      </section>
    </main>
  )
}

export default function App() {
  return <GameApp />
}
