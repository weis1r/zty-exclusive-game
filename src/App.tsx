import { startTransition, useEffect, useReducer, useRef, useState } from 'react'
import './App.css'
import { GAME_CONFIG } from './game/config'
import {
  advanceGameTime,
  canUseUndo,
  clearHint,
  clearResolvedMatches,
  createInitialGameState,
  getHintSuggestion,
  getDisplayedTileType,
  getRemainingBoardTiles,
  getTileCycleState,
  isTileBlocked,
  moveTrayTileToPocket,
  pickTile,
  releasePocketToTray,
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
import type {
  CampaignDefinition,
  CampaignProgress,
  GameConfig,
  GameState,
  LevelDefinition,
  LossReason,
} from './game/types'
import { HomeScreen } from './screens/HomeScreen'
import { GameScreen } from './screens/GameScreen'
import { ResultScreen } from './screens/ResultScreen'
import type { AppScreen, RoundSummary } from './screens/screen-types'

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => Promise<void>
    androidHandleBack?: () => boolean
  }
}

type GameAction =
  | { type: 'start-level'; level: LevelDefinition; timerRemainingMs: number; hintCharges: number }
  | { type: 'pick'; tileId: string }
  | { type: 'move-tray-to-pocket'; trayIndex: number }
  | { type: 'release-pocket'; pocketIndex: number }
  | { type: 'advance-time'; ms: number }
  | { type: 'restart'; timerRemainingMs: number; hintCharges: number }
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

interface AppHistoryState {
  appScreen: AppScreen
  levelId: string | null
}

const SESSION_START_TIMER_MS = 240_000
const SESSION_BONUS_TIMER_MS = 45_000
const SESSION_START_HINTS = 6
const SESSION_BONUS_HINTS = 2
const WIN_CELEBRATION_MS = 1280

function isAppHistoryState(value: unknown): value is AppHistoryState {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<AppHistoryState>

  return (
    (candidate.appScreen === 'home' ||
      candidate.appScreen === 'game' ||
      candidate.appScreen === 'result') &&
    ('levelId' in candidate ? candidate.levelId === null || typeof candidate.levelId === 'string' : true)
  )
}

function areHistoryStatesEqual(left: AppHistoryState, right: unknown) {
  return isAppHistoryState(right) && left.appScreen === right.appScreen && left.levelId === right.levelId
}

function createGameReducer(level: LevelDefinition, config: GameConfig) {
  return (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
      case 'start-level':
        return startGame(action.level, {
          assistChargesOverride: { hint: action.hintCharges },
          timerRemainingMs: action.timerRemainingMs,
        })
      case 'pick':
        return pickTile(state, action.tileId, level, config)
      case 'move-tray-to-pocket':
        return moveTrayTileToPocket(state, level, action.trayIndex)
      case 'release-pocket':
        return releasePocketToTray(state, level, action.pocketIndex, config)
      case 'advance-time':
        return advanceGameTime(state, action.ms)
      case 'restart':
        return restartGame(level, {
          assistChargesOverride: { hint: action.hintCharges },
          timerRemainingMs: action.timerRemainingMs,
        })
      case 'clear-match-bursts':
        return clearResolvedMatches(state)
      case 'clear-hint':
        return clearHint(state)
      case 'use-hint':
        return useHint(state, level, config)
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
  remainingTimerMs: number,
  lossReason: LossReason | null,
): RoundSummary {
  return {
    outcome,
    levelId: level.id,
    levelOrder: getLevelOrder(level),
    shapeId: level.campaign?.shapeId ?? null,
    shapeLabel: level.campaign?.shapeLabel ?? null,
    tileCount: level.campaign?.tileCount ?? level.tiles.length,
    chapterRuleId: level.campaign?.chapterRuleId ?? null,
    chapterRuleLabel: level.campaign?.chapterRuleLabel ?? null,
    nextLevelId: nextLevel?.id ?? null,
    nextLevelOrder: nextLevel ? getLevelOrder(nextLevel) : null,
    selectedCount,
    durationMs,
    hintUsed: assistUsage.hintUsed,
    undoUsed: assistUsage.undoUsed,
    remainingTimerMs,
    lossReason,
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
  const historyInitializedRef = useRef(false)
  const skipNextHistorySyncRef = useRef(false)
  const historyModeRef = useRef<'push' | 'replace'>('replace')

  const homeLevel = getCampaignLevelById(campaignProgress.currentLevelId, campaign) ?? fallbackLevel
  const currentLevel = getCampaignLevelById(activeLevelId, campaign) ?? fallbackLevel
  const [state, dispatch] = useReducer(
    createGameReducer(currentLevel, config),
    currentLevel,
    (level) =>
      createInitialGameState(level, 'idle', {
        assistChargesOverride: { hint: SESSION_START_HINTS },
        timerRemainingMs: SESSION_START_TIMER_MS,
      }),
  )

  useEffect(() => {
    savePreferences({ soundEnabled })
  }, [soundEnabled])

  useEffect(() => {
    window.advanceTime = async (ms: number) => {
      dispatch({ type: 'advance-time', ms })
    }

    return () => {
      delete window.advanceTime
    }
  }, [])

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const nextHistoryState = isAppHistoryState(event.state)
        ? event.state
        : {
            appScreen: 'home',
            levelId: campaignProgress.currentLevelId,
          }

      skipNextHistorySyncRef.current = true
      setSettingsOpen(false)

      if (nextHistoryState.appScreen === 'home') {
        setScreen('home')
        dispatch({ type: 'clear-hint' })
        return
      }

      if (nextHistoryState.levelId) {
        setActiveLevelId(nextHistoryState.levelId)
      }

      if (nextHistoryState.appScreen === 'game') {
        setScreen('game')
        return
      }

      setScreen('result')
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [campaignProgress.currentLevelId])

  useEffect(() => {
    const nextHistoryState: AppHistoryState = {
      appScreen: screen,
      levelId:
        screen === 'home'
          ? campaignProgress.currentLevelId
          : screen === 'result'
            ? roundSummary?.levelId ?? activeLevelId
            : activeLevelId,
    }

    if (!historyInitializedRef.current) {
      window.history.replaceState(nextHistoryState, '')
      historyInitializedRef.current = true
      historyModeRef.current = 'replace'
      return
    }

    if (skipNextHistorySyncRef.current) {
      skipNextHistorySyncRef.current = false
      window.history.replaceState(nextHistoryState, '')
      historyModeRef.current = 'replace'
      return
    }

    if (areHistoryStatesEqual(nextHistoryState, window.history.state)) {
      historyModeRef.current = 'replace'
      return
    }

    if (historyModeRef.current === 'push') {
      window.history.pushState(nextHistoryState, '')
    } else {
      window.history.replaceState(nextHistoryState, '')
    }

    historyModeRef.current = 'replace'
  }, [activeLevelId, campaignProgress.currentLevelId, roundSummary?.levelId, screen])

  useEffect(() => {
    if (screen !== 'game' || state.status !== 'playing') {
      return
    }

    const tickMs = 250
    const timer = window.setInterval(() => {
      dispatch({ type: 'advance-time', ms: tickMs })
    }, tickMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [screen, state.status])

  useEffect(() => {
    const renderGameToText = () => {
      if (screen === 'home') {
        return JSON.stringify({
          screen,
          currentLevelId: homeLevel.id,
          currentLevelOrder: getLevelOrder(homeLevel),
          currentShapeId: homeLevel.campaign?.shapeId ?? null,
          currentShapeLabel: homeLevel.campaign?.shapeLabel ?? null,
          currentTileCount: homeLevel.campaign?.tileCount ?? homeLevel.tiles.length,
          currentChapterRuleId: homeLevel.campaign?.chapterRuleId ?? null,
          currentChapterRuleLabel: homeLevel.campaign?.chapterRuleLabel ?? null,
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
        tileCount: currentLevel.campaign?.tileCount ?? currentLevel.tiles.length,
        chapterRuleId: currentLevel.campaign?.chapterRuleId ?? null,
        chapterRuleLabel: currentLevel.campaign?.chapterRuleLabel ?? null,
        status: state.status,
        settingsOpen,
        elapsedMs: state.elapsedMs,
        timerRemainingMs: state.timerRemainingMs,
        lossReason: state.lossReason,
        selectedCount: state.selectedCount,
        trayTiles: state.trayTiles.map((trayTile) => trayTile.type),
        orbitPockets: state.orbitPockets.map((pocketTile) => pocketTile?.type ?? null),
        assistCharges: state.assistCharges,
        remainingCount:
          (currentLevel.campaign?.tileCount ?? currentLevel.tiles.length) - state.removedCount,
        boardRemainingCount: getRemainingBoardTiles(state).length,
        hintBursts: state.hintBursts.length,
        exposedTiles: getRemainingBoardTiles(state)
          .filter((tile) => !isTileBlocked(tile.id, state, config))
          .map((tile) => ({
            id: tile.id,
            baseType: tile.type,
            currentType: getDisplayedTileType(tile, currentLevel, state.elapsedMs),
            x: tile.x,
            y: tile.y,
            layer: tile.layer,
            dynamicGroup: tile.dynamicGroup ?? null,
            cycle: getTileCycleState(tile, state.elapsedMs),
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
    if (state.hintBursts.length === 0) {
      return
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: 'clear-hint' })
    }, config.animationMs.matchClear + 120)

    return () => {
      window.clearTimeout(timer)
    }
  }, [config.animationMs.matchClear, state.hintBursts.length])

  useEffect(() => {
    if (screen !== 'game' || (state.status !== 'won' && state.status !== 'lost')) {
      return
    }

    const settleKey = `${state.levelId}:${state.status}:${state.lossReason ?? 'none'}:${state.selectedCount}:${state.timerRemainingMs}:${startedAt ?? 'na'}`

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
      state.timerRemainingMs,
      state.lossReason,
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
        historyModeRef.current = 'replace'
        setSettingsOpen(false)
        setRoundSummary(summary)
        setScreen('result')
      })
    }, state.status === 'won' ? WIN_CELEBRATION_MS : 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    assistUsage,
    campaign,
    currentLevel,
    screen,
    startedAt,
    state.levelId,
    state.lossReason,
    state.selectedCount,
    state.status,
    state.timerRemainingMs,
  ])

  function startLevel(
    levelId: string,
    allowLocked = false,
    nextSessionState: {
      timerRemainingMs?: number
      hintCharges?: number
    } = {},
  ) {
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
    historyModeRef.current = screen === 'home' ? 'push' : 'replace'
    setActiveLevelId(levelId)
    setScreen('game')
    setCampaignProgress((currentProgress) =>
      setCurrentCampaignLevel(currentProgress, campaign, levelId),
    )
    dispatch({
      type: 'start-level',
      level: nextLevel,
      timerRemainingMs: nextSessionState.timerRemainingMs ?? SESSION_START_TIMER_MS,
      hintCharges: nextSessionState.hintCharges ?? SESSION_START_HINTS,
    })
  }

  function retryCurrentLevel() {
    settledRoundRef.current = null
    setSettingsOpen(false)
    setRoundSummary(null)
    setAssistUsage({
      hintUsed: 0,
      undoUsed: 0,
    })
    setStartedAt(Date.now())
    historyModeRef.current = 'replace'
    setScreen('game')
    dispatch({
      type: 'restart',
      timerRemainingMs: SESSION_START_TIMER_MS,
      hintCharges: SESSION_START_HINTS,
    })
  }

  function goHome() {
    historyModeRef.current = 'replace'
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

    dispatch({ type: 'clear-hint' })

    if (window.history.length > 1 && isAppHistoryState(window.history.state)) {
      window.history.back()
      return
    }

    goHome()
  }

  function handleUseHint() {
    const canUseHintNow =
      state.status === 'playing' &&
      state.assistCharges.hint > 0 &&
      state.matchBursts.length === 0 &&
      state.hintBursts.length === 0 &&
      getHintSuggestion(state, currentLevel, config) !== null

    if (!canUseHintNow) {
      return
    }

    setAssistUsage((currentUsage) => ({
      ...currentUsage,
      hintUsed: currentUsage.hintUsed + 1,
    }))
    dispatch({ type: 'use-hint' })
  }

  function handleUseUndo() {
    if (!canUseUndo(state)) {
      return
    }

    setAssistUsage((currentUsage) => ({
      ...currentUsage,
      undoUsed: currentUsage.undoUsed + 1,
    }))
    dispatch({ type: 'use-undo' })
  }

  useEffect(() => {
    window.androidHandleBack = () => {
      if (settingsOpen) {
        setSettingsOpen(false)
        return true
      }

      if (screen === 'game') {
        if (state.status === 'playing' && canUseUndo(state)) {
          handleUseUndo()
          return true
        }

        handleBackFromGame()
        return true
      }

      if (screen === 'result') {
        handleSecondaryResultAction()
        return true
      }

      return false
    }

    return () => {
      delete window.androidHandleBack
    }
  }, [handleBackFromGame, handleSecondaryResultAction, handleUseUndo, screen, settingsOpen, state])

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
      startLevel(roundSummary.nextLevelId, true, {
        timerRemainingMs: state.timerRemainingMs + SESSION_BONUS_TIMER_MS,
        hintCharges: state.assistCharges.hint + SESSION_BONUS_HINTS,
      })
      return
    }

    retryCurrentLevel()
  }

  function handleSecondaryResultAction() {
    if (window.history.length > 1 && isAppHistoryState(window.history.state)) {
      window.history.back()
      return
    }

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
            onMoveTrayToPocket={(trayIndex) => dispatch({ type: 'move-tray-to-pocket', trayIndex })}
            onReleasePocket={(pocketIndex) => dispatch({ type: 'release-pocket', pocketIndex })}
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
