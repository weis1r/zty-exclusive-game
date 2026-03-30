import {
  startTransition,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import './App.css'
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
  TileTheme,
  TileType,
} from './game/types'

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => Promise<void>
  }
}

const DIFFICULTY_LABELS: Record<NonNullable<LevelDefinition['difficulty']>, string> = {
  easy: '热身',
  normal: '标准',
  hard: '进阶',
}

type AppView = 'campaign' | 'game'
type SessionMode = 'campaign' | 'quick'

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

interface ChapterSurfaceTheme {
  accent: string
  accentSoft: string
  feltGlow: string
  seal: string
  sealLabel: string
}

type TileMood = 'board-active' | 'board-blocked' | 'board-hinted' | 'tray' | 'burst'

const GAME_TITLE = '朱天宇专属游戏'
const WORLD_SUBTITLE = '花园远征'
const CHAPTER_TILE_STEPS = [48, 60, 72, 84]
const AUTO_HINT_IDLE_MS = 7000
const AUTO_HINT_FLASH_MS = 1700

type UiSoundKind = 'pick' | 'hint' | 'undo' | 'match' | 'win' | 'lose'

interface ToneStep {
  frequency: number
  duration: number
  gain: number
}

let sharedAudioContext: AudioContext | null = null

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextCtor = window.AudioContext

  if (!AudioContextCtor) {
    return null
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextCtor()
  }

  return sharedAudioContext
}

function getSoundSteps(kind: UiSoundKind): ToneStep[] {
  switch (kind) {
    case 'pick':
      return [{ frequency: 440, duration: 0.06, gain: 0.022 }]
    case 'hint':
      return [
        { frequency: 520, duration: 0.08, gain: 0.016 },
        { frequency: 660, duration: 0.09, gain: 0.014 },
      ]
    case 'undo':
      return [
        { frequency: 430, duration: 0.08, gain: 0.016 },
        { frequency: 350, duration: 0.1, gain: 0.014 },
      ]
    case 'match':
      return [
        { frequency: 560, duration: 0.08, gain: 0.02 },
        { frequency: 680, duration: 0.09, gain: 0.018 },
      ]
    case 'win':
      return [
        { frequency: 520, duration: 0.1, gain: 0.018 },
        { frequency: 660, duration: 0.12, gain: 0.016 },
        { frequency: 820, duration: 0.16, gain: 0.014 },
      ]
    case 'lose':
      return [
        { frequency: 360, duration: 0.12, gain: 0.014 },
        { frequency: 300, duration: 0.16, gain: 0.012 },
      ]
    default:
      return []
  }
}

function playUiSound(kind: UiSoundKind) {
  const context = getAudioContext()

  if (!context) {
    return
  }

  const steps = getSoundSteps(kind)

  if (steps.length === 0) {
    return
  }

  const startAt = Math.max(context.currentTime, 0.01)

  if (context.state === 'suspended') {
    void context.resume()
  }

  let offset = 0

  steps.forEach((step) => {
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const stepStart = startAt + offset
    const stepEnd = stepStart + step.duration

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(step.frequency, stepStart)
    gainNode.gain.setValueAtTime(0.0001, stepStart)
    gainNode.gain.exponentialRampToValueAtTime(step.gain, stepStart + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stepEnd)

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start(stepStart)
    oscillator.stop(stepEnd + 0.01)

    offset += step.duration + 0.02
  })
}

const CHAPTER_SURFACE_THEMES: Record<string, ChapterSurfaceTheme> = {
  'chapter-bloom-path': {
    accent: '#c9974b',
    accentSoft: '#efe2bb',
    feltGlow: 'rgba(226, 195, 141, 0.18)',
    seal: 'I',
    sealLabel: '晨露套牌',
  },
  'chapter-mirror-court': {
    accent: '#9cb0bf',
    accentSoft: '#dfe6e8',
    feltGlow: 'rgba(190, 209, 219, 0.18)',
    seal: 'II',
    sealLabel: '镜庭套牌',
  },
  'chapter-sunset-orchard': {
    accent: '#c7866a',
    accentSoft: '#ead5c4',
    feltGlow: 'rgba(220, 170, 145, 0.18)',
    seal: 'III',
    sealLabel: '晚照套牌',
  },
  'chapter-verdant-lab': {
    accent: '#809777',
    accentSoft: '#d7dfd3',
    feltGlow: 'rgba(164, 191, 153, 0.18)',
    seal: 'IV',
    sealLabel: '翠影套牌',
  },
  'chapter-starlit-canopy': {
    accent: '#7d8e9b',
    accentSoft: '#d5dde2',
    feltGlow: 'rgba(160, 177, 196, 0.18)',
    seal: 'V',
    sealLabel: '星幕套牌',
  },
}

const DEFAULT_CHAPTER_THEME = CHAPTER_SURFACE_THEMES['chapter-bloom-path']

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
    return '稳稳推进'
  }

  return `推荐 ${level.campaign.recommendedSelectionCount} 次内`
}

function getQuickPlayLevel(
  campaignLevels: LevelDefinition[],
  progress: CampaignProgress,
  fallbackLevel: LevelDefinition,
) {
  return (
    campaignLevels
      .slice()
      .reverse()
      .find((level) => progress.levelRecords[level.id]?.unlocked) ?? fallbackLevel
  )
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

function getChapterTheme(chapter?: CampaignChapterDefinition | null): ChapterSurfaceTheme {
  if (!chapter) {
    return DEFAULT_CHAPTER_THEME
  }

  return (
    CHAPTER_SURFACE_THEMES[chapter.id] ?? {
      accent: chapter.accentColor ?? DEFAULT_CHAPTER_THEME.accent,
      accentSoft: '#dfe6df',
      feltGlow: 'rgba(188, 201, 189, 0.18)',
      seal: String(chapter.order),
      sealLabel: chapter.title,
    }
  )
}

function getChapterThemeStyle(theme: ChapterSurfaceTheme) {
  return {
    '--chapter-accent': theme.accent,
    '--chapter-accent-soft': theme.accentSoft,
    '--chapter-felt-glow': theme.feltGlow,
  } as CSSProperties
}

function renderDot(cx: number, cy: number, ink: string, accentInk: string) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="11" fill={ink} />
      <circle cx={cx - 1.5} cy={cy - 1.5} r="5.4" fill="#f8f3e9" />
      <circle cx={cx + 3} cy={cy + 3} r="4.7" fill={accentInk} />
    </g>
  )
}

function renderStick(x: number, y: number, ink: string, accentInk: string) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="2" width="10" height="30" rx="5" fill={ink} />
      <rect x="2.4" y="5" width="5.2" height="10" rx="2.6" fill={accentInk} opacity="0.38" />
      <rect x="2.4" y="18" width="5.2" height="10" rx="2.6" fill={accentInk} opacity="0.38" />
    </g>
  )
}

function renderBambooCluster(kind: TileTheme['glyphKind'], ink: string, accentInk: string) {
  const positions =
    kind === 'bamboo-2'
      ? [
          [33, 30],
          [53, 30],
        ]
      : kind === 'bamboo-3'
        ? [
            [24, 26],
            [43, 26],
            [62, 26],
          ]
        : kind === 'bamboo-4'
          ? [
              [28, 20],
              [48, 20],
              [28, 54],
              [48, 54],
            ]
          : [
              [18, 18],
              [38, 18],
              [58, 18],
              [28, 52],
              [48, 52],
            ]

  return positions.map(([x, y], index) => (
    <g key={`${kind}-${index}`}>{renderStick(x, y, ink, accentInk)}</g>
  ))
}

function renderDotCluster(kind: TileTheme['glyphKind'], ink: string, accentInk: string) {
  const positions =
    kind === 'dots-2'
      ? [
          [34, 34],
          [62, 62],
        ]
      : kind === 'dots-4'
        ? [
            [33, 30],
            [62, 30],
            [33, 62],
            [62, 62],
          ]
        : kind === 'dots-5'
          ? [
              [28, 28],
              [58, 28],
              [43, 46],
              [28, 66],
              [58, 66],
            ]
          : [
              [26, 24],
              [56, 24],
              [26, 46],
              [56, 46],
              [26, 68],
              [56, 68],
            ]

  return positions.map(([x, y], index) => (
    <g key={`${kind}-${index}`}>{renderDot(x, y, ink, accentInk)}</g>
  ))
}

function renderMahjongGlyph(theme: TileTheme) {
  const ink = theme.ink
  const accentInk = theme.accentInk

  switch (theme.glyphKind) {
    case 'dog':
      return (
        <>
          <path d="M24 76V32l16 10 16-8 12 12v30H24Z" fill={ink} />
          <path d="M36 42 30 30 22 42M56 38l8-12 10 14" fill={ink} />
          <circle cx="47" cy="54" r="2.6" fill="#f7f2e8" />
          <path d="M52 64c8 2 12 5 16 12" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
          <path d="M34 69h18" fill="none" stroke={accentInk} strokeWidth="3.8" strokeLinecap="round" />
        </>
      )
    case 'cat':
      return (
        <>
          <path d="M30 74c0-20 9-34 22-34 12 0 20 11 20 28 0 11-5 18-16 18H30Z" fill={ink} />
          <path d="M35 44 28 28 40 38M58 36l10-12 6 18" fill={ink} />
          <circle cx="48" cy="52" r="2.4" fill="#f7f2e8" />
          <path d="M60 74c8 0 13-7 13-16 0-10-6-18-14-22" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
          <path d="M26 55h12M60 55h12" fill="none" stroke={accentInk} strokeWidth="2.8" strokeLinecap="round" />
        </>
      )
    case 'fish':
      return (
        <>
          <path d="M20 57c10-18 24-24 40-20 12 3 18 10 20 19-7 1-11 4-15 12-7 14-22 18-45 11 4-5 6-11 6-18s-2-10-6-14Z" fill={ink} />
          <path d="m20 57-8-15 2 30 8-15ZM54 45c6 4 10 6 14 7-5 2-9 5-12 10" fill={accentInk} />
          <circle cx="49" cy="52" r="3" fill="#f7f2e8" />
        </>
      )
    case 'dragon':
      return (
        <>
          <path d="M21 65c8-23 21-36 41-36 10 0 18 4 24 11-10 2-16 8-18 17 0 12-8 20-23 24-8 2-16 0-24-4 7-2 11-6 13-12H21Z" fill={ink} />
          <path d="M54 37c6 2 11 5 15 11M33 70c8 0 14-3 19-8" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
          <circle cx="54" cy="48" r="3" fill="#f7f2e8" />
        </>
      )
    case 'rat':
      return (
        <>
          <path d="M26 74c0-18 10-33 24-33 13 0 22 12 22 26 0 11-7 19-18 19H26Z" fill={ink} />
          <circle cx="48" cy="46" r="7" fill={ink} />
          <circle cx="42" cy="39" r="5" fill={ink} />
          <circle cx="55" cy="50" r="2.2" fill="#f7f2e8" />
          <path d="M63 74c11-1 18-8 18-17 0-8-5-13-13-15" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
        </>
      )
    case 'monkey':
      return (
        <>
          <circle cx="48" cy="42" r="11" fill={ink} />
          <path d="M28 78c0-20 10-34 24-34 13 0 23 12 23 27 0 10-6 17-17 17H28Z" fill={ink} />
          <path d="M30 66c-6 0-12 5-12 13 0 8 6 13 13 13" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
          <path d="M59 65c6 7 11 10 17 10" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
          <circle cx="65" cy="55" r="6" fill={accentInk} />
        </>
      )
    case 'dots-2':
    case 'dots-4':
    case 'dots-5':
    case 'dots-6':
      return <>{renderDotCluster(theme.glyphKind, ink, accentInk)}</>
    case 'bamboo-2':
    case 'bamboo-3':
    case 'bamboo-4':
    case 'bamboo-5':
      return <>{renderBambooCluster(theme.glyphKind, ink, accentInk)}</>
    case 'east':
      return (
        <text x="48" y="72" textAnchor="middle" fontSize="54" fontWeight="900" fill={ink}>
          东
        </text>
      )
    case 'south':
      return (
        <text x="48" y="72" textAnchor="middle" fontSize="54" fontWeight="900" fill={ink}>
          南
        </text>
      )
    case 'frame-red':
      return (
        <>
          <rect x="24" y="25" width="46" height="54" rx="4" fill="none" stroke={ink} strokeWidth="6" />
          <path d="M24 33h12M58 25v12M70 69H58M36 79V67" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
        </>
      )
    case 'frame-green':
      return (
        <>
          <rect x="24" y="25" width="46" height="54" rx="4" fill="none" stroke={ink} strokeWidth="6" />
          <path d="M24 33h12M58 25v12M70 69H58M36 79V67" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
        </>
      )
    case 'blossom':
      return (
        <>
          <circle cx="48" cy="52" r="8" fill={accentInk} />
          <circle cx="48" cy="34" r="10" fill={ink} />
          <circle cx="64" cy="44" r="10" fill={ink} />
          <circle cx="58" cy="62" r="10" fill={ink} />
          <circle cx="38" cy="62" r="10" fill={ink} />
          <circle cx="32" cy="44" r="10" fill={ink} />
        </>
      )
    case 'gourd':
      return (
        <>
          <circle cx="48" cy="38" r="14" fill={ink} />
          <circle cx="48" cy="62" r="20" fill={ink} />
          <path d="M48 19c4 0 8 2 10 5" fill="none" stroke={accentInk} strokeWidth="4" strokeLinecap="round" />
          <circle cx="42" cy="34" r="4" fill="#f7f2e8" opacity="0.35" />
        </>
      )
    default:
      return <circle cx="48" cy="54" r="18" fill={ink} />
  }
}

function CardFace({
  theme,
  mood,
  compact = false,
}: {
  theme: TileTheme
  mood: TileMood
  compact?: boolean
}) {
  return (
    <span className={`card-face card-face--${mood}${compact ? ' card-face--compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 96 112" className="card-face__art" focusable="false">
        {renderMahjongGlyph(theme)}
      </svg>
      <span className="card-face__badge">{theme.label}</span>
    </span>
  )
}

function ChapterSeal({
  chapter,
  emphasis = 'normal',
}: {
  chapter?: CampaignChapterDefinition | null
  emphasis?: 'normal' | 'large' | 'small'
}) {
  const theme = getChapterTheme(chapter)

  return (
    <span
      className={`chapter-seal chapter-seal--${emphasis}`}
      style={getChapterThemeStyle(theme)}
      aria-label={theme.sealLabel}
    >
      <span className="chapter-seal__rim" />
      <strong>{theme.seal}</strong>
      <em>{theme.sealLabel}</em>
    </span>
  )
}

function getTileStyle(tile: TileDefinition) {
  const theme = TILE_THEMES[tile.type]

  return {
    left: `${tile.x}px`,
    top: `${tile.y}px`,
    zIndex: tile.layer * 10 + Math.round(tile.y / 10),
    '--tile-ink': theme.ink,
    '--tile-accent-ink': theme.accentInk,
    '--tile-shadow': theme.shadowGlow,
    '--tile-pattern': theme.facePattern,
  } as CSSProperties
}

function getTrayStyle(tileType: TileType, config: GameConfig) {
  const theme = TILE_THEMES[tileType]

  return {
    '--tile-ink': theme.ink,
    '--tile-accent-ink': theme.accentInk,
    '--tile-shadow': theme.shadowGlow,
    '--tile-pattern': theme.facePattern,
    '--entry-duration': `${config.animationMs.trayEntry}ms`,
  } as CSSProperties
}

function getBurstStyle(slotIndex: number) {
  return {
    gridColumnStart: slotIndex + 1,
    gridRowStart: 1,
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
  const [sessionMode, setSessionMode] = useState<SessionMode>('campaign')
  const [soundEnabled, setSoundEnabled] = useState(() => loadPreferences().soundEnabled)
  const [gameMenuOpen, setGameMenuOpen] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [assistUsage, setAssistUsage] = useState<SessionAssistUsage>({
    hintUsed: 0,
    undoUsed: 0,
  })
  const [completionDurationMs, setCompletionDurationMs] = useState<number | null>(null)
  const [passiveHintTileId, setPassiveHintTileId] = useState<string | null>(null)
  const completionKeyRef = useRef<string | null>(null)

  const currentLevel = getCampaignLevelById(selectedLevelId, campaign) ?? fallbackLevel
  const [state, dispatch] = useReducer(
    createGameReducer(currentLevel, config),
    currentLevel,
    (level) => createInitialGameState(level),
  )
  const previousStatusRef = useRef(state.status)
  const previousMatchBurstCountRef = useRef(0)
  const quickPlayLevel = getQuickPlayLevel(campaignLevels, campaignProgress, fallbackLevel)

  const unlockedCount = campaignProgress.unlockedLevelIds.length
  const completedCount = campaignProgress.completedLevelIds.length
  const totalStars = Object.values(campaignProgress.levelRecords).reduce(
    (starCount, record) => starCount + record.stars,
    0,
  )
  const chapterSummaries = getChapterSummaries(campaign, campaignProgress)
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
  const selectedChapterTheme = getChapterTheme(selectedChapterSummary?.chapter)
  const selectedChapterLevels = selectedChapterSummary
    ? getLevelsForChapter(selectedChapterSummary.chapter.id, campaign)
    : []
  const chapterSections = chapterSummaries.map((summary) => ({
    summary,
    levels: getLevelsForChapter(summary.chapter.id, campaign),
  }))
  const nextLevel = nextLevelId ? getCampaignLevelById(nextLevelId, campaign) : null
  const chapterLevelIndex =
    selectedChapterLevels.findIndex((level) => level.id === currentLevel.id) + 1
  const unlockMessage =
    state.status === 'won' && sessionMode === 'campaign'
      ? nextLevel
        ? nextLevel.campaign?.chapterId !== currentLevel.campaign?.chapterId
          ? `新章节已开启：${nextLevel.campaign?.chapter ?? '下一章节'}`
          : `已解锁下一关：${nextLevel.name}`
        : '整套战役已经打通'
      : state.status === 'won' && sessionMode === 'quick'
        ? '快速单局完成'
        : null

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
  const matchedPairs = Math.floor(state.removedCount / config.matchCount)
  const currentScore = matchedPairs * 800
  const levelHudValue =
    chapterLevelIndex > 0 && selectedChapterSummary
      ? `${selectedChapterSummary.chapter.order}-${chapterLevelIndex}`
      : `${currentLevel.campaign?.order ?? 1}`
  const hintSuggestion = getHintSuggestion(state, config)
  const canUseHintButton =
    state.status === 'playing' &&
    state.assistCharges.hint > 0 &&
    !isResolvingMatch &&
    hintSuggestion !== null
  const canDisplayPassiveHint =
    view === 'game' &&
    state.status === 'playing' &&
    !isResolvingMatch &&
    state.lastHintTileId === null &&
    hintSuggestion !== null
  const displayedHintTileId =
    state.lastHintTileId ?? (canDisplayPassiveHint ? passiveHintTileId : null)
  const autoHintActive =
    canDisplayPassiveHint &&
    passiveHintTileId !== null &&
    passiveHintTileId === displayedHintTileId &&
    state.lastHintTileId === null

  function playSound(kind: UiSoundKind) {
    if (!soundEnabled) {
      return
    }

    playUiSound(kind)
  }

  const playSoundFromEffect = useEffectEvent((kind: UiSoundKind) => {
    if (!soundEnabled) {
      return
    }

    playUiSound(kind)
  })

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
    const chapterPayload = chapterSummaries.map((summary) => ({
      id: summary.chapter.id,
      title: summary.chapter.title,
      unlockedLevels: summary.unlockedLevels,
      completedLevels: summary.completedLevels,
      totalLevels: summary.totalLevels,
      earnedStars: summary.earnedStars,
    }))

    const renderGameToText = () => {
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
            sessionMode,
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
          sessionMode,
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
        matchCount: config.matchCount,
        score: currentScore,
        matchedPairs,
        selectedCount: state.selectedCount,
        removedCount: state.removedCount,
        trayCapacity: config.trayCapacity,
        trayTiles: state.trayTiles.map((trayTile) => trayTile.type),
        assistCharges: state.assistCharges,
        lastHintTileId: state.lastHintTileId,
        autoHintTileId: passiveHintTileId,
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
    currentScore,
    matchedPairs,
    passiveHintTileId,
    sessionMode,
    selectedChapterId,
    selectedLevelId,
    state,
    unlockedCount,
    view,
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
    if (passiveHintTileId === null) {
      return
    }

    const timer = window.setTimeout(() => {
      setPassiveHintTileId((currentHintTileId) =>
        currentHintTileId === passiveHintTileId ? null : currentHintTileId,
      )
    }, AUTO_HINT_FLASH_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [passiveHintTileId])

  useEffect(() => {
    if (!canDisplayPassiveHint) {
      return
    }

    const timer = window.setTimeout(() => {
      if (hintSuggestion) {
        setPassiveHintTileId(hintSuggestion.tileId)
      }
    }, AUTO_HINT_IDLE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    canDisplayPassiveHint,
    hintSuggestion,
  ])

  useEffect(() => {
    if (state.matchBursts.length > 0 && previousMatchBurstCountRef.current === 0) {
      playSoundFromEffect('match')
    }

    previousMatchBurstCountRef.current = state.matchBursts.length
  }, [soundEnabled, state.matchBursts.length])

  useEffect(() => {
    if (previousStatusRef.current !== state.status) {
      if (state.status === 'won') {
        playSoundFromEffect('win')
      } else if (state.status === 'lost') {
        playSoundFromEffect('lose')
      }
    }

    previousStatusRef.current = state.status
  }, [soundEnabled, state.status])

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

      if (sessionMode === 'quick') {
        return
      }

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
  }, [campaign, currentLevel, sessionMode, startedAt, state.levelId, state.selectedCount, state.status])

  function startLevel(levelId: string, mode: SessionMode = 'campaign') {
    const nextLevelDefinition = getCampaignLevelById(levelId, campaign)
    const isUnlocked = campaignProgress.levelRecords[levelId]?.unlocked ?? false

    if (!nextLevelDefinition || !isUnlocked) {
      return
    }

    completionKeyRef.current = null
    setSelectedLevelId(levelId)
    if (mode === 'campaign') {
      setCampaignProgress((currentProgress) =>
        setCurrentCampaignLevel(currentProgress, campaign, levelId),
      )
    }
    setAssistUsage({
      hintUsed: 0,
      undoUsed: 0,
    })
    setCompletionDurationMs(null)
    setPassiveHintTileId(null)
    setGameMenuOpen(false)
    setSessionMode(mode)
    setStartedAt(Date.now())
    setView('game')
    dispatch({ type: 'start-level', level: nextLevelDefinition })
  }

  function retryCurrentLevel() {
    completionKeyRef.current = null
    setAssistUsage({
      hintUsed: 0,
      undoUsed: 0,
    })
    setCompletionDurationMs(null)
    setPassiveHintTileId(null)
    setGameMenuOpen(false)
    setStartedAt(Date.now())
    dispatch({ type: 'restart' })
  }

  function returnToCampaign() {
    completionKeyRef.current = null
    setPassiveHintTileId(null)
    setGameMenuOpen(false)
    setSessionMode('campaign')
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
    setPassiveHintTileId(null)
    playSound('hint')
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
    setPassiveHintTileId(null)
    playSound('undo')
    dispatch({ type: 'use-undo' })
  }

  function handleResetProgress() {
    if (!window.confirm('要清空战役进度和星级记录吗？')) {
      return
    }

    const nextProgress = resetCampaignProgress(campaign)

    completionKeyRef.current = null
    setCompletionDurationMs(null)
    setPassiveHintTileId(null)
    setCampaignProgress(nextProgress)
    setSelectedLevelId(nextProgress.currentLevelId)
    setSessionMode('campaign')
    setView('campaign')
  }

  function handlePickTile(tileId: string) {
    playSound('pick')
    setPassiveHintTileId(null)
    dispatch({ type: 'pick', tileId })
  }

  const currentStars =
    state.status === 'won' ? calculateLevelStars(currentLevel, state.selectedCount) : 0

  return (
    <main className="app-shell">
      <section className={`phone-frame${view === 'game' ? ' phone-frame--game' : ''}`}>
        <header className="topbar">
          <div className="topbar__branding">
            <p className="eyebrow">麻将桌布风格 · 5章20关</p>
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
              温和音效 {soundEnabled ? '开' : '关'}
            </button>
            <button type="button" className="secondary-button" onClick={handleResetProgress}>
              重置进度
            </button>
          </div>
        </header>

        {view === 'campaign' ? (
          <section className="intro-card" data-testid="campaign-screen">
            <section className="lobby-hero" style={getChapterThemeStyle(selectedChapterTheme)}>
              <div className="lobby-hero__copy">
                <span className="intro-badge">首页与单局共用牌桌外层</span>
                <h2 className="lobby-hero__title">{GAME_TITLE}</h2>
                <p className="lobby-hero__subtitle">{WORLD_SUBTITLE}</p>
                <p className="lobby-hero__text">
                  这一版把首页、章节和单局统一成深绿桌布与暖白麻将砖的同一套视觉。每章都会按
                  48 / 60 / 72 / 84 的牌堆密度递进，单局继续保留你现在的二消规则和顶部四格槽。
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

              <div className="lobby-hero__panel">
                <ChapterSeal chapter={selectedChapterSummary?.chapter} emphasis="large" />
                <div className="lobby-hero__panel-copy">
                  <p className="eyebrow">当前主线</p>
                  <strong>{selectedChapterSummary?.chapter.title ?? WORLD_SUBTITLE}</strong>
                  <span>
                    第 {currentLevel.campaign?.order ?? 1} 关 · {currentLevel.name}
                  </span>
                  <span>{getRecommendedGoal(currentLevel)}</span>
                  <span>快速单局会使用：{quickPlayLevel.name}</span>
                </div>
              </div>
            </section>

            <section className="campaign-progress-panel">
              <div className="campaign-progress-panel__header">
                <div>
                  <p className="eyebrow">战役总览</p>
                  <h2>章节桌面进度</h2>
                </div>
                <p>每章第 4 关都会把桌面铺得更满，单局越往后越接近正式麻将堆叠局面。</p>
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
                  const chapterTheme = getChapterTheme(summary.chapter)

                  return (
                    <article
                      key={summary.chapter.id}
                      className={`campaign-preview__card${
                        isActive ? ' campaign-preview__card--active' : ''
                      }`}
                      data-testid={`chapter-card-${summary.chapter.id}`}
                      style={getChapterThemeStyle(chapterTheme)}
                    >
                      <div className="campaign-preview__topline">
                        <ChapterSeal chapter={summary.chapter} emphasis="small" />
                        <p className="campaign-preview__badge">
                          第 {summary.chapter.order} 章
                          {summary.chapter.subtitle ? ` · ${summary.chapter.subtitle}` : ''}
                        </p>
                      </div>
                      <strong>{summary.chapter.title}</strong>
                      <p className="campaign-preview__summary">{summary.chapter.summary}</p>
                      <div className="chapter-density">
                        {CHAPTER_TILE_STEPS.map((step) => (
                          <span key={`${summary.chapter.id}-${step}`} className="chapter-density__chip">
                            {step}
                          </span>
                        ))}
                      </div>
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
                  <ChapterSeal chapter={selectedChapterSummary.chapter} emphasis="large" />
                </div>
                <div className="chapter-focus__meta">
                  <div className="focus-chip">
                    <strong>
                      已解锁 {selectedChapterSummary.unlockedLevels}/{selectedChapterSummary.totalLevels}
                    </strong>
                    <span>当前章节可打关卡</span>
                  </div>
                  <div className="focus-chip">
                    <strong>
                      已完成 {selectedChapterSummary.completedLevels}/{selectedChapterSummary.totalLevels}
                    </strong>
                    <span>章节完成进度</span>
                  </div>
                  <div className="focus-chip">
                    <strong>{selectedChapterSummary.chapter.rewardLabel ?? '继续推进战役'}</strong>
                    <span>{selectedChapterTheme.sealLabel}</span>
                  </div>
                </div>
                <div className="chapter-density chapter-density--focus">
                  {CHAPTER_TILE_STEPS.map((step, index) => (
                    <span key={`focus-${step}`} className="chapter-density__chip">
                      第 {index + 1} 关 · {step} 张
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

              <div className="intro-rules">
              <div className="rule-chip">暖白麻将砖</div>
              <div className="rule-chip">深绿桌布</div>
              <div className="rule-chip">顶部四格槽</div>
              <div className="rule-chip">动态局内分数</div>
            </div>

            <div className="campaign-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => startLevel(campaignProgress.currentLevelId, 'campaign')}
              >
                继续战役
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => startLevel(quickPlayLevel.id, 'quick')}
              >
                快速单局
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled
              >
                每日挑战 即将开放
              </button>
            </div>

            <section className="level-select">
              <div className="level-select__header">
                <div>
                  <p className="eyebrow">关卡选择</p>
                  <h2>{WORLD_SUBTITLE}</h2>
                </div>
                <p>前期少牌型、后期多牌型，章节后段会显著更花，但仍然维持稳定可解。</p>
              </div>

              <div className="level-select__stack">
                {chapterSections.map(({ summary, levels }) => (
                  <section
                    key={summary.chapter.id}
                    className="chapter-section"
                    data-testid={`chapter-section-${summary.chapter.id}`}
                    style={getChapterThemeStyle(getChapterTheme(summary.chapter))}
                  >
                    <div className="chapter-section__header">
                      <div className="chapter-section__title-wrap">
                        <ChapterSeal chapter={summary.chapter} emphasis="small" />
                        <div>
                          <p className="chapter-section__eyebrow">
                            第 {summary.chapter.order} 章
                            {summary.chapter.subtitle ? ` · ${summary.chapter.subtitle}` : ''}
                          </p>
                          <h3 className="chapter-section__title">{summary.chapter.title}</h3>
                        </div>
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
                              <span className="intro-badge">第 {level.campaign?.order} 关</span>
                              <div className="level-card__header-tags">
                                {isCurrent ? <span className="level-card__active-tag">进行中</span> : null}
                                <span className="level-card__difficulty">
                                  {level.difficulty ? DIFFICULTY_LABELS[level.difficulty] : '标准'}
                                </span>
                              </div>
                            </div>
                            <p className="level-card__chapter">{summary.chapter.title}</p>
                            <h3 className="level-card__name">{level.name}</h3>
                            <p className="level-card__summary">{level.campaign?.summary}</p>
                            <p className="level-card__goal">
                              牌堆 {level.tiles.length} 张 · {getRecommendedGoal(level)}
                            </p>
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
                                  startLevel(level.id, 'campaign')
                                }}
                                disabled={!isUnlocked}
                              >
                                {isUnlocked ? '进入这一局' : '等待解锁'}
                              </button>
                              <span className="level-card__status">
                                {isCurrent
                                  ? '当前推进中'
                                  : levelRecord?.bestSelectedCount !== null
                                    ? `最佳 ${levelRecord.bestSelectedCount} 次`
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
            <div className="sr-only">
              <strong data-testid="current-level-id">{currentLevel.id}</strong>
              <strong data-testid="selected-count">{state.selectedCount} 次</strong>
              <strong data-testid="remaining-count">{remainingCount} 块</strong>
            </div>

            <div className="game-hud" style={getChapterThemeStyle(selectedChapterTheme)}>
              <button
                type="button"
                className="game-hud__round-button"
                aria-label="返回首页"
                onClick={returnToCampaign}
              >
                ←
              </button>

              <div className="game-hud__stats">
                <div className="game-hud__stat">
                  <span>关卡</span>
                  <strong>{levelHudValue}</strong>
                </div>
                <div className="game-hud__stat">
                  <span>分数</span>
                  <strong>{currentScore}</strong>
                </div>
                <div className="game-hud__stat">
                  <span>匹配</span>
                  <strong>{matchedPairs}</strong>
                </div>
              </div>

              <div className="game-hud__menu-wrap">
                <button
                  type="button"
                  className="game-hud__round-button"
                  aria-label="单局菜单"
                  onClick={() => setGameMenuOpen((currentValue) => !currentValue)}
                >
                  ☰
                </button>

                {gameMenuOpen ? (
                  <div className="game-menu">
                    <button
                      type="button"
                      className="game-menu__button"
                      aria-label={soundEnabled ? '关闭音效' : '开启音效'}
                      onClick={() => setSoundEnabled((currentValue) => !currentValue)}
                    >
                      {soundEnabled ? '♪' : '♩'}
                    </button>
                    <button
                      type="button"
                      className="game-menu__button"
                      aria-label="重新开始"
                      onClick={retryCurrentLevel}
                    >
                      ↺
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <section className="tray-panel tray-panel--play" aria-label="顶部配对槽">
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
                          style={getTrayStyle(trayTile.type, config)}
                        >
                          <CardFace theme={TILE_THEMES[trayTile.type]} mood="tray" compact />
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
                    <span style={getTrayStyle(burst.type, config)}>
                      <CardFace theme={TILE_THEMES[burst.type]} mood="burst" compact />
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div
              className="board-shell"
              style={
                {
                  '--board-width': `${currentLevel.boardWidth || config.boardWidth}px`,
                  '--board-height': `${currentLevel.boardHeight || config.boardHeight}px`,
                  '--board-scale': config.boardScaleBase,
                  '--tile-width': `${config.tileWidth}px`,
                  '--tile-height': `${config.tileHeight}px`,
                  ...getChapterThemeStyle(selectedChapterTheme),
                } as CSSProperties
              }
            >
              <div className="board-surface">
                {activeBoardTiles.map((tile) => {
                  const theme = TILE_THEMES[tile.type]
                  const blocked = blockedTileIds.has(tile.id)
                  const hinted = displayedHintTileId === tile.id
                  const visualState: TileMood = blocked
                    ? 'board-blocked'
                    : hinted
                      ? 'board-hinted'
                      : 'board-active'

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className={`tile-card${blocked ? ' is-blocked' : ''}${
                        hinted ? ' is-hinted' : ''
                      }${autoHintActive && hinted ? ' is-passive-hinted' : ''}`}
                      style={getTileStyle(tile)}
                      onClick={() => handlePickTile(tile.id)}
                      aria-label={theme.title}
                      data-testid={`tile-${tile.id}`}
                      disabled={blocked || isResolvingMatch || state.status !== 'playing'}
                    >
                      <span className="tile-card__shadow" aria-hidden="true" />
                      <span className="tile-card__face">
                        <span className="tile-card__frame" aria-hidden="true" />
                        <CardFace theme={theme} mood={visualState} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <section className="toolbelt toolbelt--play">
              <div className="toolbelt__actions toolbelt__actions--play">
                <button
                  type="button"
                  className="tool-button tool-button--hint"
                  data-testid="hint-button"
                  aria-label="提示"
                  disabled={!canUseHintButton}
                  onClick={handleUseHint}
                >
                  <span className="tool-button__icon">✦</span>
                  <span className="tool-button__count">{state.assistCharges.hint}</span>
                </button>
                <button
                  type="button"
                  className="tool-button tool-button--undo"
                  data-testid="undo-button"
                  aria-label="撤销"
                  disabled={!canUseUndo(state)}
                  onClick={handleUseUndo}
                >
                  <span className="tool-button__icon">↺</span>
                  <span className="tool-button__count">{state.assistCharges.undo}</span>
                </button>
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
              <div className="result-modal__hero">
                <ChapterSeal chapter={selectedChapterSummary?.chapter} emphasis="large" />
                <div className="result-modal__heading">
                  <p className="eyebrow">{state.status === 'won' ? '通关结算' : '本关失败'}</p>
                  <h2>
                    {state.status === 'won'
                      ? sessionMode === 'quick'
                        ? '快速单局完成'
                        : '本局清空完成'
                      : '顶部配对槽卡住了'}
                  </h2>
                  <p className="result-modal__role">
                    {state.status === 'won'
                      ? sessionMode === 'quick'
                        ? '这局不写入主线，只帮你练节奏和看牌。'
                        : '新的牌面已经被揭露出来，下一关会更复杂一点。'
                      : '这一局没有惩罚，整理一下顺序就能马上再试。'}
                  </p>
                </div>
              </div>

              {state.status === 'won' ? (
                <>
                  {unlockMessage ? (
                    <div className="result-modal__badge">{unlockMessage}</div>
                  ) : null}
                  <div className="result-modal__stars">{getStarText(currentStars)}</div>
                  <div className="result-modal__reward">
                    <span>本局分数 {currentScore}</span>
                    <span>
                      {sessionMode === 'quick'
                        ? '本局不改变战役存档'
                        : `本章累计 ${selectedChapterSummary?.earnedStars ?? 0} 星`}
                    </span>
                    <span>最佳次数 {currentLevelRecord?.bestSelectedCount ?? state.selectedCount}</span>
                  </div>
                  <div className="result-modal__summary">
                    <span>匹配 {matchedPairs} 对</span>
                    <span>点击 {state.selectedCount} 次</span>
                    <span>用时 {formatDuration(completionDurationMs)}</span>
                    <span>提示 {assistUsage.hintUsed} 次</span>
                    <span>撤销 {assistUsage.undoUsed} 次</span>
                  </div>
                  {nextLevel && sessionMode === 'campaign' ? (
                    <div className="result-modal__next">
                      下一站：{nextLevel.campaign?.chapter ?? '下一章节'} · {nextLevel.name}
                    </div>
                  ) : null}
                </>
              ) : (
                <p>
                  你还剩 {state.assistCharges.undo} 次撤销、{state.assistCharges.hint} 次提示，
                  可以继续重试，也可以回到首页换一关。
                </p>
              )}

              <div className="result-modal__actions">
                {state.status === 'won' && sessionMode === 'campaign' && nextLevelId && nextLevelUnlocked ? (
                  <button
                    type="button"
                    className="primary-button primary-button--next"
                    data-testid="next-level-button"
                    onClick={() => startLevel(nextLevelId, 'campaign')}
                  >
                    前往下一关
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
                  返回首页
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
