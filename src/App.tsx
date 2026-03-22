import {
  startTransition,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import './App.css'
import avatarBloomScout from './assets/avatar-bloom-scout.svg'
import avatarMirrorGuide from './assets/avatar-mirror-guide.svg'
import gardenStickerPack from './assets/garden-sticker-pack.svg'
import sparkRibbon from './assets/spark-ribbon.svg'
import { GAME_CONFIG, TILE_THEMES } from './game/config'
import {
  canUseUndo,
  clearHint,
  clearResolvedMatches,
  createInitialGameState,
  getHintSuggestion,
  getRemainingBoardTiles,
  isTileBlocked,
  pickTile,
  restartGame,
  startGame,
  useHint,
  useUndo,
} from './game/engine'
import {
  CAMPAIGN,
  DEFAULT_LEVEL,
  getCampaignChapters,
  getCampaignLevelById,
  getLevelsForChapter,
  getNextCampaignLevelId,
} from './game/levels'
import {
  loadCampaignProgress,
  loadPreferences,
  recordLevelCompletion,
  resetCampaignProgress,
  savePreferences,
  setCurrentCampaignLevel,
} from './game/storage'
import type {
  CampaignChapterDefinition,
  CampaignDefinition,
  CampaignProgress,
  GameConfig,
  GameState,
  LevelDefinition,
  TileDefinition,
} from './game/types'

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => Promise<void>
  }
}

const DIFFICULTY_LABELS: Record<NonNullable<LevelDefinition['difficulty']>, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

type AppView = 'campaign' | 'game'

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

interface CampaignChapterSummary {
  chapter: CampaignChapterDefinition
  totalLevels: number
  unlockedLevels: number
  completedLevels: number
  earnedStars: number
}

interface ChapterAvatarTheme {
  avatar: string
  ribbon: string
  sticker: string
  accent: string
  accentSoft: string
  roleName: string
  roleTag: string
}

const GAME_TITLE = '朱天宇专属游戏'
const WORLD_SUBTITLE = '花园远征'

const CHAPTER_AVATAR_THEMES: Record<string, ChapterAvatarTheme> = {
  'chapter-bloom-path': {
    avatar: avatarBloomScout,
    ribbon: sparkRibbon,
    sticker: gardenStickerPack,
    accent: '#ff9952',
    accentSoft: '#fff3bc',
    roleName: '晴园小队长',
    roleTag: '元气花园应援官',
  },
  'chapter-mirror-court': {
    avatar: avatarMirrorGuide,
    ribbon: sparkRibbon,
    sticker: gardenStickerPack,
    accent: '#67b7ff',
    accentSoft: '#ffd3ef',
    roleName: '镜庭引路人',
    roleTag: '幻彩镜庭向导',
  },
}

const DEFAULT_CHAPTER_AVATAR_THEME = CHAPTER_AVATAR_THEMES['chapter-bloom-path']

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

function getTileStyle(tile: TileDefinition) {
  const theme = TILE_THEMES[tile.type]

  return {
    left: `${tile.x}px`,
    top: `${tile.y}px`,
    zIndex: tile.layer * 10 + Math.round(tile.y / 10),
    '--tile-main': theme.main,
    '--tile-accent': theme.accent,
    '--tile-shadow': theme.shadow,
    '--tile-outline': theme.outline,
    '--tile-pattern': theme.pattern,
  } as CSSProperties
}

function getBurstStyle(slotIndex: number) {
  return {
    gridColumnStart: slotIndex + 1,
    gridRowStart: 1,
  } as CSSProperties
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

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return '未计时'
  }

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getStarText(stars: number) {
  return Array.from({ length: 3 }, (_, index) => (index < stars ? '★' : '☆')).join('')
}

function getRecommendedGoal(level: LevelDefinition) {
  if (typeof level.campaign?.recommendedSelectionCount !== 'number') {
    return '稳扎稳打'
  }

  return `推荐 ${level.campaign.recommendedSelectionCount} 步内`
}

function getChapterSummaries(
  campaign: CampaignDefinition,
  progress: CampaignProgress,
): CampaignChapterSummary[] {
  return getCampaignChapters(campaign).map((chapter) => {
    const record = progress.chapterRecords[chapter.id]

    return {
      chapter,
      totalLevels: chapter.levelIds.length,
      unlockedLevels: record?.unlockedLevelIds.length ?? 0,
      completedLevels: record?.completedLevelIds.length ?? 0,
      earnedStars: record?.earnedStars ?? 0,
    }
  })
}

function getChapterAvatarTheme(
  chapter?: CampaignChapterDefinition | null,
): ChapterAvatarTheme {
  if (!chapter) {
    return DEFAULT_CHAPTER_AVATAR_THEME
  }

  return (
    CHAPTER_AVATAR_THEMES[chapter.id] ??
    (chapter.order % 2 === 0
      ? CHAPTER_AVATAR_THEMES['chapter-mirror-court']
      : CHAPTER_AVATAR_THEMES['chapter-bloom-path']) ??
    DEFAULT_CHAPTER_AVATAR_THEME
  )
}

function getChapterThemeStyle(theme: ChapterAvatarTheme) {
  return {
    '--chapter-accent': theme.accent,
    '--chapter-accent-soft': theme.accentSoft,
  } as CSSProperties
}

export function GameApp({ config = GAME_CONFIG, campaign = CAMPAIGN }: GameAppProps) {
  const campaignLevels = campaign.levels
  const fallbackLevel = campaignLevels[0] ?? DEFAULT_LEVEL
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>(() =>
    loadCampaignProgress(campaign),
  )
  const [selectedLevelId, setSelectedLevelId] = useState(
    () => loadCampaignProgress(campaign).currentLevelId || fallbackLevel.id,
  )
  const [view, setView] = useState<AppView>('campaign')
  const [soundEnabled, setSoundEnabled] = useState(() => loadPreferences().soundEnabled)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [assistUsage, setAssistUsage] = useState<SessionAssistUsage>({
    hintUsed: 0,
    undoUsed: 0,
  })
  const [completionDurationMs, setCompletionDurationMs] = useState<number | null>(null)
  const completionKeyRef = useRef<string | null>(null)

  const currentLevel = getCampaignLevelById(selectedLevelId, campaign) ?? fallbackLevel
  const difficultyLabel = currentLevel.difficulty
    ? DIFFICULTY_LABELS[currentLevel.difficulty]
    : null
  const [state, dispatch] = useReducer(
    createGameReducer(currentLevel, config),
    currentLevel,
    (level) => createInitialGameState(level),
  )

  const unlockedCount = campaignProgress.unlockedLevelIds.length
  const completedCount = campaignProgress.completedLevelIds.length
  const totalStars = Object.values(campaignProgress.levelRecords).reduce(
    (starCount, record) => starCount + record.stars,
    0,
  )
  const chapterSummaries = getChapterSummaries(campaign, campaignProgress)
  const chapterCount = chapterSummaries.length
  const completionPercent =
    campaignLevels.length === 0 ? 0 : Math.round((completedCount / campaignLevels.length) * 100)
  const currentLevelRecord = campaignProgress.levelRecords[selectedLevelId]
  const nextLevelId = getNextCampaignLevelId(selectedLevelId, campaign)
  const nextLevelUnlocked = nextLevelId
    ? (campaignProgress.levelRecords[nextLevelId]?.unlocked ?? false)
    : false
  const selectedChapterId =
    currentLevel.campaign?.chapterId ?? campaignProgress.currentChapterId
  const selectedChapterSummary =
    chapterSummaries.find((summary) => summary.chapter.id === selectedChapterId) ??
    chapterSummaries[0]
  const selectedChapterTheme = getChapterAvatarTheme(selectedChapterSummary?.chapter)
  const chapterSections = chapterSummaries.map((summary) => ({
    summary,
    levels: getLevelsForChapter(summary.chapter.id, campaign),
  }))
  const nextLevel = nextLevelId ? getCampaignLevelById(nextLevelId, campaign) : null
  const unlockMessage =
    state.status === 'won'
      ? nextLevel
        ? nextLevel.campaign?.chapterId !== currentLevel.campaign?.chapterId
          ? `新章节已开启：${nextLevel.campaign?.chapter ?? '下一章节'}`
          : `已解锁下一关：${nextLevel.name}`
        : '战役通关完成'
      : null

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
      const chapterPayload = chapterSummaries.map((summary) => ({
        id: summary.chapter.id,
        title: summary.chapter.title,
        unlockedLevels: summary.unlockedLevels,
        completedLevels: summary.completedLevels,
        totalLevels: summary.totalLevels,
        earnedStars: summary.earnedStars,
      }))

      if (view === 'campaign') {
        return JSON.stringify({
          view,
          coordinateSystem: {
            origin: 'top-left',
            xDirection: 'right',
            yDirection: 'down',
          },
          campaign: {
            id: campaign.id,
            selectedLevelId,
            unlockedCount,
            completedCount,
            totalLevels: campaignLevels.length,
            currentChapterId: selectedChapterId,
            chapters: chapterPayload,
          },
          level: {
            id: currentLevel.id,
            name: currentLevel.name,
            difficulty: currentLevel.difficulty ?? null,
          },
        })
      }

      return JSON.stringify({
        view,
        coordinateSystem: {
          origin: 'top-left',
          xDirection: 'right',
          yDirection: 'down',
        },
        campaign: {
          id: campaign.id,
          selectedLevelId,
          unlockedCount,
          completedCount,
          totalLevels: campaignLevels.length,
          currentChapterId: selectedChapterId,
          chapters: chapterPayload,
        },
        level: {
          id: currentLevel.id,
          name: currentLevel.name,
          difficulty: currentLevel.difficulty ?? null,
        },
        status: state.status,
        selectedCount: state.selectedCount,
        removedCount: state.removedCount,
        trayCapacity: config.trayCapacity,
        trayTiles: state.trayTiles.map((trayTile) => trayTile.type),
        assistCharges: state.assistCharges,
        lastHintTileId: state.lastHintTileId,
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
    campaign.id,
    campaignLevels.length,
    chapterSummaries,
    completedCount,
    config,
    currentLevel.difficulty,
    currentLevel.id,
    currentLevel.name,
    selectedLevelId,
    state,
    totalStars,
    unlockedCount,
    view,
    selectedChapterId,
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
    if (state.status !== 'won' || startedAt === null) {
      return
    }

    const completionKey = `${state.levelId}:${state.selectedCount}:${startedAt}`

    if (completionKeyRef.current === completionKey) {
      return
    }

    completionKeyRef.current = completionKey
    const durationMs = Date.now() - startedAt
    const stars = calculateLevelStars(currentLevel, state.selectedCount)

    startTransition(() => {
      setCompletionDurationMs(durationMs)
      setCampaignProgress((currentProgress) =>
        recordLevelCompletion(
          currentProgress,
          campaign,
          {
            levelId: state.levelId,
            selectedCount: state.selectedCount,
            completionMs: durationMs,
          },
          stars,
        ),
      )
    })
  }, [campaign, currentLevel, startedAt, state.levelId, state.selectedCount, state.status])

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
  const hintSuggestion = getHintSuggestion(state, config)
  const canUseHintButton =
    state.status === 'playing' &&
    state.assistCharges.hint > 0 &&
    !isResolvingMatch &&
    hintSuggestion !== null

  function startLevel(levelId: string) {
    const nextLevel = getCampaignLevelById(levelId, campaign)
    const isUnlocked = campaignProgress.levelRecords[levelId]?.unlocked ?? false

    if (!nextLevel || !isUnlocked) {
      return
    }

    completionKeyRef.current = null
    setSelectedLevelId(levelId)
    setCampaignProgress((currentProgress) =>
      setCurrentCampaignLevel(currentProgress, campaign, levelId),
    )
    setAssistUsage({
      hintUsed: 0,
      undoUsed: 0,
    })
    setCompletionDurationMs(null)
    setStartedAt(Date.now())
    setView('game')
    dispatch({ type: 'start-level', level: nextLevel })
  }

  function retryCurrentLevel() {
    completionKeyRef.current = null
    setAssistUsage({
      hintUsed: 0,
      undoUsed: 0,
    })
    setCompletionDurationMs(null)
    setStartedAt(Date.now())
    dispatch({ type: 'restart' })
  }

  function returnToCampaign() {
    completionKeyRef.current = null
    setView('campaign')
    dispatch({ type: 'clear-hint' })
  }

  function handleUseHint() {
    if (!canUseHintButton) {
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

  function handleResetProgress() {
    if (!window.confirm('要清空战役进度和星级记录吗？')) {
      return
    }

    const nextProgress = resetCampaignProgress(campaign)

    completionKeyRef.current = null
    setCompletionDurationMs(null)
    setCampaignProgress(nextProgress)
    setSelectedLevelId(nextProgress.currentLevelId)
    setView('campaign')
  }

  const currentStars =
    state.status === 'won' ? calculateLevelStars(currentLevel, state.selectedCount) : 0

  return (
    <main className="app-shell">
      <div className="sky-glow sky-glow--left" aria-hidden="true" />
      <div className="sky-glow sky-glow--right" aria-hidden="true" />

      <section className="phone-frame">
        <header className="topbar">
          <div className="topbar__branding">
            <p className="eyebrow">{WORLD_SUBTITLE} · H5 章节战役</p>
            <h1>{GAME_TITLE}</h1>
            <p className="topbar__subtitle">{WORLD_SUBTITLE}</p>
          </div>

          <div className="topbar__actions">
            <button
              type="button"
              className="sound-toggle"
              onClick={() => setSoundEnabled((currentValue) => !currentValue)}
              aria-pressed={!soundEnabled}
            >
              音效 {soundEnabled ? '开' : '关'}
            </button>
            <button type="button" className="secondary-button" onClick={handleResetProgress}>
              重置进度
            </button>
          </div>
        </header>

        {view === 'campaign' ? (
          <section className="intro-card" data-testid="campaign-screen">
            <div
              className="intro-card__hero"
              style={getChapterThemeStyle(selectedChapterTheme)}
            >
              <img
                src={selectedChapterTheme.ribbon}
                alt=""
                aria-hidden="true"
                className="hero-ribbon hero-ribbon--main"
              />
              <div className="intro-card__hero-copy">
                <span className="intro-badge">朱天宇定制版</span>
                <p className="intro-title">{GAME_TITLE}</p>
                <p className="intro-subtitle">{WORLD_SUBTITLE}</p>
                <p className="intro-copy">
                  这是一份为朱天宇打造的专属闯关版本，已经扩展到 {campaignLevels.length} 关与{' '}
                  {chapterCount} 个章节。沿着角色章节推进、收集星级，并利用提示和撤销稳住节奏。
                </p>

                <div className="intro-card__meta">
                  <div className="rule-chip" data-testid="unlocked-count">
                    已解锁 {unlockedCount}/{campaignLevels.length}
                  </div>
                  <div className="rule-chip" data-testid="completed-count">
                    已通关 {completedCount}
                  </div>
                  <div className="rule-chip">累计星级 {totalStars}</div>
                  <div className="rule-chip">总进度 {completionPercent}%</div>
                </div>
              </div>

              <div className="hero-portrait">
                <div className="hero-portrait__frame">
                  <img
                    src={selectedChapterTheme.avatar}
                    alt={`${selectedChapterTheme.roleName}头像`}
                    className="chapter-avatar chapter-avatar--hero"
                  />
                  <img
                    src={selectedChapterTheme.sticker}
                    alt=""
                    aria-hidden="true"
                    className="hero-portrait__sticker"
                  />
                </div>
                <div className="hero-portrait__card">
                  <span className="hero-portrait__role">{selectedChapterTheme.roleName}</span>
                  <span className="hero-portrait__tag">{selectedChapterTheme.roleTag}</span>
                </div>
              </div>
            </div>

            <section className="campaign-progress-panel">
              <div className="campaign-progress-panel__header">
                <div>
                  <p className="eyebrow">章节总览</p>
                  <h2>专属旅程进度</h2>
                </div>
                <p>每一章都有专属角色领路，通关当前章节后，下一章会自动点亮。</p>
              </div>
              <div className="campaign-progress-track" aria-hidden="true">
                <span
                  className="campaign-progress-track__fill"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <div className="campaign-preview">
                {chapterSummaries.map((summary) => {
                  const isActive = summary.chapter.id === selectedChapterId
                  const chapterTheme = getChapterAvatarTheme(summary.chapter)

                  return (
                    <article
                      key={summary.chapter.id}
                      className={`campaign-preview__card${
                        isActive ? ' campaign-preview__card--active' : ''
                      }`}
                      data-testid={`chapter-card-${summary.chapter.id}`}
                      style={getChapterThemeStyle(chapterTheme)}
                    >
                      <img
                        src={chapterTheme.ribbon}
                        alt=""
                        aria-hidden="true"
                        className="campaign-preview__ribbon"
                      />
                      <div className="campaign-preview__topline">
                        <p className="campaign-preview__badge">
                          第 {summary.chapter.order} 章
                          {summary.chapter.subtitle ? ` · ${summary.chapter.subtitle}` : ''}
                        </p>
                        <div className="campaign-preview__avatar">
                          <img
                            src={chapterTheme.avatar}
                            alt={`${chapterTheme.roleName}头像`}
                            className="chapter-avatar chapter-avatar--card"
                          />
                        </div>
                      </div>
                      <span className="campaign-preview__role">{chapterTheme.roleName}</span>
                      <strong>{summary.chapter.title}</strong>
                      <p className="campaign-preview__summary">{summary.chapter.summary}</p>
                      <span className="campaign-preview__stars">
                        {summary.completedLevels}/{summary.totalLevels} 关 · {summary.earnedStars} 星
                      </span>
                    </article>
                  )
                })}
              </div>
            </section>

            {selectedChapterSummary ? (
              <section
                className="chapter-focus"
                data-testid="chapter-focus"
                style={getChapterThemeStyle(selectedChapterTheme)}
              >
                <img
                  src={selectedChapterTheme.ribbon}
                  alt=""
                  aria-hidden="true"
                  className="chapter-focus__ribbon"
                />
                <div className="chapter-focus__intro">
                  <div className="chapter-focus__copy">
                    <span className="intro-badge">
                      第 {selectedChapterSummary.chapter.order} 章
                    </span>
                    <div>
                      <h2>{selectedChapterSummary.chapter.title}</h2>
                      <p>{selectedChapterSummary.chapter.summary}</p>
                    </div>
                  </div>
                  <div className="chapter-focus__portrait">
                    <div className="chapter-focus__avatar">
                      <img
                        src={selectedChapterTheme.avatar}
                        alt={`${selectedChapterTheme.roleName}头像`}
                        className="chapter-avatar chapter-avatar--focus"
                      />
                      <img
                        src={selectedChapterTheme.sticker}
                        alt=""
                        aria-hidden="true"
                        className="chapter-focus__sticker"
                      />
                    </div>
                    <span className="chapter-focus__role">{selectedChapterTheme.roleName}</span>
                  </div>
                </div>
                <div className="chapter-focus__meta">
                  <div className="focus-chip">
                    <strong>
                      已解锁 {selectedChapterSummary.unlockedLevels}/{selectedChapterSummary.totalLevels}
                    </strong>
                    <span>角色收藏进度</span>
                  </div>
                  <div className="focus-chip">
                    <strong>
                      已完成 {selectedChapterSummary.completedLevels}/{selectedChapterSummary.totalLevels}
                    </strong>
                    <span>章节通关记录</span>
                  </div>
                  <div className="focus-chip">
                    <strong>
                      奖励 {selectedChapterSummary.chapter.rewardLabel ?? '继续推进战役'}
                    </strong>
                    <span>{selectedChapterTheme.roleTag}</span>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="intro-rules">
              <div className="rule-chip">专属角色领路</div>
              <div className="rule-chip">六关双章节</div>
              <div className="rule-chip">提示 / 撤销道具</div>
            </div>

            <div className="campaign-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => startLevel(campaignProgress.currentLevelId)}
              >
                继续战役
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => startLevel(selectedLevelId)}
                disabled={!(campaignProgress.levelRecords[selectedLevelId]?.unlocked ?? false)}
              >
                整理这一片花圃
              </button>
            </div>

            <section className="level-select">
              <div className="level-select__header">
                <div>
                  <p className="eyebrow">关卡选择</p>
                  <h2>{WORLD_SUBTITLE}</h2>
                </div>
                <p>通关解锁下一关，星级会记录最佳成绩，章节角色会陪你一路推进。</p>
              </div>

              <div className="level-select__stack">
                {chapterSections.map(({ summary, levels }) => (
                  <section
                    key={summary.chapter.id}
                    className="chapter-section"
                    data-testid={`chapter-section-${summary.chapter.id}`}
                  >
                    <div className="chapter-section__header">
                      <div>
                        <p className="chapter-section__eyebrow">
                          第 {summary.chapter.order} 章
                          {summary.chapter.subtitle ? ` · ${summary.chapter.subtitle}` : ''}
                        </p>
                        <h3 className="chapter-section__title">{summary.chapter.title}</h3>
                      </div>
                      <div className="chapter-section__meta">
                        <span>{summary.completedLevels}/{summary.totalLevels} 关</span>
                        <span>{summary.earnedStars} 星</span>
                      </div>
                    </div>

                    <div className="chapter-section__grid">
                      {levels.map((level) => {
                        const levelRecord = campaignProgress.levelRecords[level.id]
                        const isUnlocked = levelRecord?.unlocked ?? false
                        const isSelected = selectedLevelId === level.id
                        const isCleared = levelRecord?.completed ?? false
                        const isCurrent = campaignProgress.currentLevelId === level.id

                        return (
                          <article
                            key={level.id}
                            className={`level-card${isUnlocked ? '' : ' level-card--locked'}${
                              isSelected ? ' level-card--active' : ''
                            }${isCleared ? ' level-card--cleared' : ''}`}
                            data-testid={`level-card-${level.id}`}
                          >
                            <div className="level-card__header">
                              <span className="intro-badge">
                                第 {level.campaign?.order} 关
                              </span>
                              <div className="level-card__header-tags">
                                {isCurrent ? <span className="level-card__active-tag">进行中</span> : null}
                                <span className="level-card__difficulty">
                                  {level.difficulty ? DIFFICULTY_LABELS[level.difficulty] : '普通'}
                                </span>
                              </div>
                            </div>
                            <p className="level-card__chapter">{summary.chapter.title}</p>
                            <h3 className="level-card__name">{level.name}</h3>
                            <p className="level-card__summary">{level.campaign?.summary}</p>
                            <p className="level-card__goal">{getRecommendedGoal(level)}</p>
                            <div className="level-card__meta" data-testid={`level-status-${level.id}`}>
                              <span>{isUnlocked ? '已解锁' : '未解锁'}</span>
                              <span>{getStarText(levelRecord?.stars ?? 0)}</span>
                            </div>
                            <div className="level-card__footer">
                              <button
                                type="button"
                                className="secondary-button"
                                data-testid={`start-level-btn-${level.id}`}
                                onClick={() => {
                                  setSelectedLevelId(level.id)
                                  startLevel(level.id)
                                }}
                                disabled={!isUnlocked}
                              >
                                {isUnlocked ? '整理这一片花圃' : '等待解锁'}
                              </button>
                              <span className="level-card__status">
                                {isCurrent
                                  ? '当前推进中'
                                  : levelRecord?.bestSelectedCount !== null
                                    ? `最佳 ${levelRecord.bestSelectedCount} 步`
                                    : '尚未通关'}
                              </span>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </section>
        ) : (
          <section className="game-stage" data-testid="game-screen">
            <div className="campaign-bar" style={getChapterThemeStyle(selectedChapterTheme)}>
              <div className="campaign-bar__chapter">
                <div className="campaign-bar__avatar">
                  <img
                    src={selectedChapterTheme.avatar}
                    alt={`${selectedChapterTheme.roleName}头像`}
                    className="chapter-avatar chapter-avatar--mini"
                  />
                </div>
                <div>
                  <p className="eyebrow">章节角色</p>
                  <strong>{currentLevel.campaign?.chapter ?? WORLD_SUBTITLE}</strong>
                  <span className="campaign-bar__role">{selectedChapterTheme.roleName}</span>
                </div>
              </div>
              <div className="campaign-bar__progress">
                <span>
                  第 {currentLevel.campaign?.order ?? 1} / {campaignLevels.length} 关
                </span>
                <span>{currentLevel.campaign?.chapter}</span>
                <span>{getStarText(currentLevelRecord?.stars ?? 0)}</span>
              </div>
            </div>

            <div className="status-strip status-strip--compact">
              <div className="status-chip status-chip--accent">
                <span className="status-label">关卡</span>
                <strong data-testid="current-level-id">{currentLevel.id}</strong>
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
              <div className="status-chip status-chip--warning">
                <span className="status-label">剩余</span>
                <strong data-testid="remaining-count">{remainingCount} 块</strong>
              </div>
            </div>

            <section className="toolbelt">
              <div className="toolbelt__header">
                <div>
                  <p className="eyebrow">局内辅助</p>
                  <h2>稳住节奏</h2>
                </div>
                <p className="toolbelt__tip">
                  {state.lastHintTileId ? '提示已标记一张推荐砖块。' : '提示只高亮，不会自动帮你点。'}
                </p>
              </div>

              <div className="toolbelt__actions">
                <button
                  type="button"
                  className="tool-button tool-button--hint"
                  data-testid="hint-button"
                  disabled={!canUseHintButton}
                  onClick={handleUseHint}
                >
                  <span className="tool-button__icon">灯</span>
                  <span className="tool-button__label">提示</span>
                  <span className="tool-button__count">{state.assistCharges.hint}</span>
                </button>
                <button
                  type="button"
                  className="tool-button tool-button--undo"
                  data-testid="undo-button"
                  disabled={!canUseUndo(state)}
                  onClick={handleUseUndo}
                >
                  <span className="tool-button__icon">回</span>
                  <span className="tool-button__label">撤销</span>
                  <span className="tool-button__count">{state.assistCharges.undo}</span>
                </button>
                <button
                  type="button"
                  className="tool-button tool-button--map"
                  onClick={returnToCampaign}
                >
                  <span className="tool-button__icon">图</span>
                  <span className="tool-button__label">回到花园地图</span>
                </button>
              </div>
            </section>

            <div
              className="board-shell"
              style={
                {
                  '--board-width': `${config.boardWidth}px`,
                  '--board-height': `${config.boardHeight}px`,
                  '--board-scale': config.boardScaleBase,
                  ...getChapterThemeStyle(selectedChapterTheme),
                } as CSSProperties
              }
            >
              <img
                src={selectedChapterTheme.sticker}
                alt=""
                aria-hidden="true"
                className="board-shell__sticker"
              />
              <div className="board-surface">
                {activeBoardTiles.map((tile) => {
                  const theme = TILE_THEMES[tile.type]
                  const blocked = blockedTileIds.has(tile.id)
                  const hinted = state.lastHintTileId === tile.id

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className={`tile-card${blocked ? ' is-blocked' : ''}${
                        hinted ? ' is-hinted' : ''
                      }`}
                      style={getTileStyle(tile)}
                      onClick={() => dispatch({ type: 'pick', tileId: tile.id })}
                      aria-label={theme.title}
                      data-testid={`tile-${tile.id}`}
                      disabled={blocked || isResolvingMatch || state.status !== 'playing'}
                    >
                      <span className="tile-card__shadow" aria-hidden="true" />
                      <span className="tile-card__face">
                        <span className="tile-card__badge">{theme.badge}</span>
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
                              '--tile-outline': TILE_THEMES[trayTile.type].outline,
                              '--tile-pattern': TILE_THEMES[trayTile.type].pattern,
                              '--entry-duration': `${config.animationMs.trayEntry}ms`,
                            } as CSSProperties
                          }
                        >
                          <span className="tray-tile__badge">{TILE_THEMES[trayTile.type].badge}</span>
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
                    <span
                      style={
                        {
                          '--tile-main': TILE_THEMES[burst.type].main,
                          '--tile-accent': TILE_THEMES[burst.type].accent,
                          '--tile-shadow': TILE_THEMES[burst.type].shadow,
                          '--tile-outline': TILE_THEMES[burst.type].outline,
                          '--tile-pattern': TILE_THEMES[burst.type].pattern,
                        } as CSSProperties
                      }
                    >
                      <span className="tray-tile__badge">{TILE_THEMES[burst.type].badge}</span>
                      <span>{TILE_THEMES[burst.type].label}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </section>
        )}

        {(state.status === 'won' || state.status === 'lost') && view === 'game' && (
          <div className="modal-backdrop">
            <div
              className="result-modal"
              data-testid="result-modal"
              style={getChapterThemeStyle(selectedChapterTheme)}
            >
              <img
                src={selectedChapterTheme.ribbon}
                alt=""
                aria-hidden="true"
                className="result-modal__ribbon"
              />
              <div className="result-modal__hero">
                <div className="result-modal__avatar-shell">
                  <img
                    src={selectedChapterTheme.avatar}
                    alt={`${selectedChapterTheme.roleName}头像`}
                    className="chapter-avatar chapter-avatar--modal"
                  />
                  <img
                    src={selectedChapterTheme.sticker}
                    alt=""
                    aria-hidden="true"
                    className="result-modal__sticker"
                  />
                </div>
                <div className="result-modal__heading">
                  <p className="eyebrow">{state.status === 'won' ? '通关结算' : '本关失败'}</p>
                  <h2>{state.status === 'won' ? '花园整理完成' : '收集槽卡住了'}</h2>
                  <p className="result-modal__role">{selectedChapterTheme.roleName} 正在陪你冲刺下一站</p>
                </div>
              </div>
              {state.status === 'won' ? (
                <>
                  {unlockMessage ? (
                    <div className="result-modal__badge">{unlockMessage}</div>
                  ) : null}
                  <div className="result-modal__stars">{getStarText(currentStars)}</div>
                  <div className="result-modal__reward">
                    <span>本章累计 {selectedChapterSummary?.earnedStars ?? 0} 星</span>
                    <span>
                      最佳步数 {currentLevelRecord?.bestSelectedCount ?? state.selectedCount}
                    </span>
                  </div>
                  <div className="result-modal__summary">
                    <span>点击 {state.selectedCount} 次</span>
                    <span>用时 {formatDuration(completionDurationMs)}</span>
                    <span>提示 {assistUsage.hintUsed} 次</span>
                    <span>撤销 {assistUsage.undoUsed} 次</span>
                  </div>
                  {nextLevel ? (
                    <div className="result-modal__next">
                      下一站：{nextLevel.campaign?.chapter ?? '下一章节'} · {nextLevel.name}
                    </div>
                  ) : null}
                </>
              ) : (
                <p>
                  你还剩 {state.assistCharges.undo} 次撤销、{state.assistCharges.hint} 次提示，
                  可以直接重试，也可以回到地图再选关。
                </p>
              )}

              <div className="result-modal__actions">
                {state.status === 'won' && nextLevelId && nextLevelUnlocked ? (
                  <button
                    type="button"
                    className="primary-button primary-button--next"
                    data-testid="next-level-button"
                    onClick={() => startLevel(nextLevelId)}
                  >
                    前往下一片花圃
                  </button>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  data-testid="retry-level-button"
                  onClick={retryCurrentLevel}
                >
                  重新整理
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  data-testid="back-to-campaign-button"
                  onClick={returnToCampaign}
                >
                  回到花园地图
                </button>
              </div>
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
