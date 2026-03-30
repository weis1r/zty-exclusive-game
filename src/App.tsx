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
type TileMascotMood = 'board-active' | 'board-blocked' | 'board-hinted' | 'tray' | 'burst'
type ChapterGameAvatarMood = 'bar' | 'win' | 'loss'

interface ChapterGameAvatarSpec {
  skin: string
  hair: string
  accent: string
  outfit: string
  ring: string
  blush: string
}

const CHAPTER_GAME_AVATAR_SPECS: Record<string, ChapterGameAvatarSpec> = {
  'chapter-bloom-path': {
    skin: '#ffd9b8',
    hair: '#ffb34a',
    accent: '#6dd56f',
    outfit: '#5fc777',
    ring: '#ffe08d',
    blush: '#ffb5a0',
  },
  'chapter-mirror-court': {
    skin: '#ffe1d4',
    hair: '#7cb7ff',
    accent: '#ff95cb',
    outfit: '#7b88ff',
    ring: '#d6ebff',
    blush: '#ffbfd7',
  },
}

const DEFAULT_CHAPTER_GAME_AVATAR_SPEC = CHAPTER_GAME_AVATAR_SPECS['chapter-bloom-path']

interface TileMascotSpec {
  skin: string
  fringe: string
  accent: string
  blush: string
  eyes: 'bright' | 'smile' | 'sleepy' | 'wink' | 'gentle'
  mouth: 'open' | 'smile' | 'cat' | 'tiny'
  brows: 'bold' | 'cheer' | 'sleepy' | 'spark' | 'soft'
}

const TILE_MASCOT_SPECS: Record<TileType, TileMascotSpec> = {
  ember: {
    skin: '#ffe6c7',
    fringe: '#ff994d',
    accent: '#ff6b4d',
    blush: '#ffb49f',
    eyes: 'bright',
    mouth: 'open',
    brows: 'bold',
  },
  leaf: {
    skin: '#fff0dc',
    fringe: '#6dcf7c',
    accent: '#98ec9e',
    blush: '#f4c6a4',
    eyes: 'smile',
    mouth: 'smile',
    brows: 'cheer',
  },
  bloom: {
    skin: '#fff0e2',
    fringe: '#ff8fba',
    accent: '#ffc1de',
    blush: '#ffbfd3',
    eyes: 'bright',
    mouth: 'smile',
    brows: 'spark',
  },
  bell: {
    skin: '#fff0c9',
    fringe: '#ffcb56',
    accent: '#ffe69f',
    blush: '#f9c18f',
    eyes: 'gentle',
    mouth: 'open',
    brows: 'soft',
  },
  cloud: {
    skin: '#f8f5ff',
    fringe: '#8fc7ff',
    accent: '#dff2ff',
    blush: '#d9caf7',
    eyes: 'sleepy',
    mouth: 'tiny',
    brows: 'sleepy',
  },
  shell: {
    skin: '#fff4e7',
    fringe: '#7fd7ca',
    accent: '#b4f1e7',
    blush: '#f4c6bf',
    eyes: 'gentle',
    mouth: 'cat',
    brows: 'soft',
  },
  berry: {
    skin: '#fff0f6',
    fringe: '#c57bff',
    accent: '#efc9ff',
    blush: '#ffc0dc',
    eyes: 'wink',
    mouth: 'smile',
    brows: 'spark',
  },
  pine: {
    skin: '#eef8e8',
    fringe: '#59bf8b',
    accent: '#a2e7be',
    blush: '#cadbaf',
    eyes: 'smile',
    mouth: 'cat',
    brows: 'cheer',
  },
  wave: {
    skin: '#eefcff',
    fringe: '#47c7e8',
    accent: '#9ceffc',
    blush: '#beddf0',
    eyes: 'gentle',
    mouth: 'smile',
    brows: 'soft',
  },
}

const TILE_MASCOT_INK = '#5d403d'

function getChapterGameAvatarSpec(chapterId?: string | null) {
  if (!chapterId) {
    return DEFAULT_CHAPTER_GAME_AVATAR_SPEC
  }

  return CHAPTER_GAME_AVATAR_SPECS[chapterId] ?? DEFAULT_CHAPTER_GAME_AVATAR_SPEC
}

function renderStarEye(cx: number, cy: number, fill = '#fff067') {
  const points = [
    [cx, cy - 4.8],
    [cx + 1.5, cy - 1.7],
    [cx + 5, cy - 1.1],
    [cx + 2.2, cy + 1.1],
    [cx + 3.1, cy + 4.7],
    [cx, cy + 2.7],
    [cx - 3.1, cy + 4.7],
    [cx - 2.2, cy + 1.1],
    [cx - 5, cy - 1.1],
    [cx - 1.5, cy - 1.7],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ')

  return <polygon points={points} fill={fill} stroke={TILE_MASCOT_INK} strokeWidth="1.8" />
}

function renderTileMascotAccessory(tileType: TileType, spec: TileMascotSpec) {
  switch (tileType) {
    case 'ember':
      return (
        <g
          fill={spec.accent}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.1"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path
            d="M42 6c6 5 12 11 12 19 0 7-4.9 12.1-12 14.4-7.1-2.3-12-7.4-12-14.4 0-8 6-14 12-19Z"
          />
          <path
            d="M42 16c3.7 3.6 7 7.1 7 11.8 0 4.3-2.8 7.5-7 9.2-4.2-1.7-7-4.9-7-9.2 0-4.7 3.3-8.2 7-11.8Z"
            fill={spec.fringe}
          />
        </g>
      )
    case 'leaf':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round">
          <ellipse
            cx="31"
            cy="18"
            rx="7.8"
            ry="13"
            transform="rotate(-28 31 18)"
            fill={spec.accent}
          />
          <ellipse
            cx="53"
            cy="18"
            rx="7.8"
            ry="13"
            transform="rotate(28 53 18)"
            fill={spec.fringe}
          />
          <path
            d="M42 18v12"
            fill="none"
            stroke="#5f955f"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
      )
    case 'bloom':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="42" cy="14" r="6.2" fill={spec.accent} />
          <circle cx="30" cy="18" r="5.8" fill={spec.accent} />
          <circle cx="54" cy="18" r="5.8" fill={spec.accent} />
          <circle cx="34" cy="28" r="5.8" fill={spec.accent} />
          <circle cx="50" cy="28" r="5.8" fill={spec.accent} />
          <circle cx="42" cy="21" r="5.2" fill={spec.fringe} />
        </g>
      )
    case 'bell':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M31 14c0-6.2 22-6.2 22 0v9H31Z" fill={spec.fringe} />
          <path
            d="M28 24c0-7.1 28-7.1 28 0 0 5.8-6.2 9.4-14 9.4S28 29.8 28 24Z"
            fill={spec.accent}
          />
          <circle cx="42" cy="31" r="3.1" fill="#f5a23d" />
        </g>
      )
    case 'cloud':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="30" cy="22" r="8.5" fill={spec.accent} />
          <circle cx="42" cy="16" r="10.5" fill={spec.accent} />
          <circle cx="54" cy="22" r="8.5" fill={spec.accent} />
          <ellipse cx="42" cy="25" rx="20" ry="8.5" fill={spec.fringe} />
        </g>
      )
    case 'shell':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M24 28c0-13 8.1-20 18-20s18 7 18 20H24Z"
            fill={spec.fringe}
          />
          <path
            d="M29 28V17M36 28V13M42 28V11M48 28V13M55 28V17"
            fill="none"
            stroke={spec.accent}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      )
    case 'berry':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="33" cy="18" r="7" fill={spec.fringe} />
          <circle cx="51" cy="18" r="7" fill={spec.fringe} />
          <path
            d="M42 16c-5-8-12-7-12-7 3 4 4.5 8.2 4.5 8.2M42 16c5-8 12-7 12-7-3 4-4.5 8.2-4.5 8.2"
            fill="none"
            stroke={spec.accent}
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )
    case 'pine':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M42 8 32 22h20Z" fill={spec.accent} />
          <path d="M42 14 28 31h28Z" fill={spec.fringe} />
          <path d="M42 30v8" fill="none" stroke="#5b876c" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )
    case 'wave':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M25 22c7-11 20-14 31-8-5 .7-8.3 3.8-8.3 8.1 0 4.5 4.1 7.9 10.3 8.6-8.3 6.8-20.7 6.5-29.4 1.1-6.5-4.1-8.2-7.2-3.6-9.8Z"
            fill={spec.fringe}
          />
          <circle cx="56" cy="18" r="5.7" fill={spec.accent} />
        </g>
      )
  }
}

function renderTileMascotMoodDecor(mood: TileMascotMood, theme: TileTheme) {
  switch (mood) {
    case 'board-hinted':
      return (
        <>
          <path
            d="M23 22c2.6-4.2 5.9-6.6 10.4-7.8"
            fill="none"
            stroke="#fff6a6"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M61 13c1.8 4 2.1 7.4.7 11.2"
            fill="none"
            stroke="#fff6a6"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M66 31c4.5-1.9 7.3-2.2 11.2-.9"
            fill="none"
            stroke="#fff6a6"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )
    case 'tray':
      return (
        <path
          d="M58 23c3.1 1.4 4.4 4.8 3 7.7-1 2.1-3.3 3.1-5.7 2.8.5-3.9 1.2-7.4 2.7-10.5Z"
          fill="#8fd8ff"
          stroke={TILE_MASCOT_INK}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      )
    case 'burst':
      return (
        <>
          <path
            d="M18 21 23 26 30 24 27 31 31 38 24 36 19 42 18 34 11 31 18 28 18 21Z"
            fill={theme.accent}
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M66 18 70 24 77 23 73 29 77 35 70 34 66 40 65 32 58 29 65 26 66 18Z"
            fill="#fff4a8"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </>
      )
    default:
      return null
  }
}

function renderTileMascotActiveFace(tileType: TileType) {
  switch (tileType) {
    case 'ember':
      return (
        <>
          <path d="M27 31c4.2-2.9 8-3.5 11.7-2" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.8" strokeLinecap="round" />
          <path d="M47 30c3.8-.7 7 .1 10 2.8" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.8" strokeLinecap="round" />
          <ellipse cx="33.4" cy="39.5" rx="2.7" ry="3.3" fill="#4f2f4d" />
          <path d="M47 39c2.2-2.6 5.5-2.8 7.6-.3" fill="none" stroke="#4f2f4d" strokeWidth="2.7" strokeLinecap="round" />
          <path d="M35 51c4.4-3.2 10.1-2.7 14 1" fill="none" stroke="#8f4c61" strokeWidth="3" strokeLinecap="round" />
          <path d="M45 51.5c1.2 2.8 3.5 4 6 3.1" fill="none" stroke="#8f4c61" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M49 54c.2 2.1-.6 3.8-2.1 5" fill="none" stroke="#ff8c79" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )
    case 'leaf':
      return (
        <>
          <path d="M29 30.5c2.7-1.4 5.9-1 8.5 1" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M46 30c2.9-1.8 6.5-1.7 9.5.4" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M29 40c2.1-2.7 5.2-2.7 7.3 0" fill="none" stroke="#4f2f4d" strokeWidth="2.7" strokeLinecap="round" />
          <path d="M47 40c2.1-2.7 5.2-2.7 7.3 0" fill="none" stroke="#4f2f4d" strokeWidth="2.7" strokeLinecap="round" />
          <path d="M35 49.5c2.3 2.3 4.4 3.4 7 4.1 2.6-.7 4.7-1.8 7-4.1" fill="none" stroke="#8f4c61" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )
    case 'bloom':
      return (
        <>
          <path d="M28 30.5c3.5-3 7.2-3.2 10.8-.6" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M47 30.5c3.1-2.2 6.3-2.1 9.6.2" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.4" strokeLinecap="round" />
          <ellipse cx="34" cy="39.4" rx="2.7" ry="2.4" fill="#4f2f4d" />
          <ellipse cx="51.4" cy="39.4" rx="2.7" ry="2.4" fill="#4f2f4d" />
          <path d="M35 51c3-1.6 5.5-2.2 7.8-2.2 2.8 0 5.2.8 7.1 2.7" fill="none" stroke="#8f4c61" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="54.8" cy="44.2" r="1.1" fill="#4f2f4d" />
        </>
      )
    case 'bell':
      return (
        <>
          <path d="M29 31c3-1.8 6.6-1.9 9.6-.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M46 31c3-1.8 6.6-1.9 9.6-.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="33.2" cy="39.5" rx="3.1" ry="3.5" fill="#4f2f4d" />
          <ellipse cx="50.8" cy="39.5" rx="3.1" ry="3.5" fill="#4f2f4d" />
          <path d="M35 50c2 4.2 12 4.2 14 0" fill="#fff4ef" stroke="#8f4c61" strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )
    case 'cloud':
      return (
        <>
          <path d="M29 31.8c2.5-1 5.3-.9 8.2 0" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M46 31.2c2.8-1.2 5.8-.8 8.6.7" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M29.5 40.4c2.1-1.5 4.7-1.5 6.8 0" fill="none" stroke="#4f2f4d" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="50.8" cy="39.8" rx="2.6" ry="2.2" fill="#4f2f4d" />
          <path d="M38 50.4c2.8-.9 5.3-.7 7.6 1" fill="none" stroke="#8f4c61" strokeWidth="2.7" strokeLinecap="round" />
        </>
      )
    case 'shell':
      return (
        <>
          <path d="M28 31.2c3-1.6 6.2-1.2 9 .7" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M47 29.8c3.7-2 6.8-1.6 9.4 1" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="33.2" cy="39.5" rx="2.7" ry="2.2" fill="#4f2f4d" />
          <path d="M47 40c2.2-2.1 5-2.1 7.2 0" fill="none" stroke="#4f2f4d" strokeWidth="2.7" strokeLinecap="round" />
          <path d="M35 49.8c2.2 2 4 2.9 7 3.6 2.1-.6 4.2-1.6 7-3.6" fill="none" stroke="#8f4c61" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )
    case 'berry':
      return (
        <>
          <path d="M28 30.2c3.7-2.8 7.2-3.1 10.4-.8" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M47 31.3c2.9-1.8 6.2-1.5 9.1.8" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="33" cy="39.3" r="2.7" fill="#4f2f4d" />
          <path d="M47.2 39.5c2.1-2.6 5.2-2.6 7.1-.2" fill="none" stroke="#4f2f4d" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M36 49.8c3.8 1.9 7.4 1.8 11.1-.3" fill="none" stroke="#8f4c61" strokeWidth="2.7" strokeLinecap="round" />
          <path d="M48 50.6c1.9 1.4 2.3 3.5 1.4 5.6" fill="none" stroke="#ff7c97" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
    case 'pine':
      return (
        <>
          <path d="M28.5 31.2c2.6-1.7 5.8-1.4 8.6.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M47 30.5c2.6-2 5.8-2 8.7-.1" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="33.2" cy="39.5" r="2.5" fill="#4f2f4d" />
          <circle cx="50.8" cy="40.6" r="2.1" fill="#4f2f4d" />
          <path d="M34.4 50.2c2 3.8 13.2 3.8 15.2 0v2.6c0 2.1-3 4.4-7.6 4.4-4.6 0-7.6-2.3-7.6-4.4v-2.6Z" fill="#fff6ee" stroke="#8f4c61" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M39.7 50.2v5.1M44.3 50.2v5.1" fill="none" stroke="#8f4c61" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )
    case 'wave':
      return (
        <>
          <path d="M28.5 31.7c2.6-1.3 5.3-1.4 8.2-.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M46.5 31c3-1.8 6.1-1.5 8.8.8" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="33.2" cy="39.7" rx="2.8" ry="2.3" fill="#4f2f4d" />
          <ellipse cx="50.8" cy="39.7" rx="2.8" ry="2.3" fill="#4f2f4d" />
          <path d="M35.2 50.8c4.2-2.6 8.8-2.3 12.8.9" fill="none" stroke="#8f4c61" strokeWidth="2.8" strokeLinecap="round" />
        </>
      )
  }
}

function renderTileMascotFace(tileType: TileType, mood: TileMascotMood) {
  switch (mood) {
    case 'board-blocked':
      return (
        <>
          <path d="M28 32.4c2.7-2 5.8-2.4 9.2-1.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.1" strokeLinecap="round" />
          <path d="M46.8 31.6c3.2-1.7 6.4-1.6 9.4.5" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.1" strokeLinecap="round" />
          <ellipse cx="33.4" cy="40.1" rx="4.8" ry="5.2" fill="#fffdf7" stroke={TILE_MASCOT_INK} strokeWidth="1.8" />
          <ellipse cx="50.6" cy="40.1" rx="4.8" ry="5.2" fill="#fffdf7" stroke={TILE_MASCOT_INK} strokeWidth="1.8" />
          <circle cx="36.8" cy="40.4" r="2.2" fill="#4f2f4d" />
          <circle cx="47.2" cy="40.4" r="2.2" fill="#4f2f4d" />
          <path d="M35 52c2.5-1.3 4.8-1.8 7-1.8 2.2 0 4.5.5 7 1.8" fill="none" stroke="#8f4c61" strokeWidth="2.6" strokeLinecap="round" />
        </>
      )
    case 'board-hinted':
      return (
        <>
          <path d="M28 28.8c3.7-4.1 7.8-4.5 11.8-1.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M45 28.8c3.7-4.1 7.8-4.5 11.8-1.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="33.2" cy="40.2" rx="4.8" ry="6.2" fill="#fffdf7" stroke={TILE_MASCOT_INK} strokeWidth="1.8" />
          <ellipse cx="50.8" cy="40.2" rx="4.8" ry="6.2" fill="#fffdf7" stroke={TILE_MASCOT_INK} strokeWidth="1.8" />
          <circle cx="33.2" cy="41.2" r="2.1" fill="#4f2f4d" />
          <circle cx="50.8" cy="41.2" r="2.1" fill="#4f2f4d" />
          <ellipse cx="42" cy="52.3" rx="5.1" ry="6" fill="#fff6ee" stroke="#8f4c61" strokeWidth="2.4" />
        </>
      )
    case 'tray':
      return (
        <>
          <path d="M28.6 33c2.8 1.5 5.8 1.4 8.6-.4" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.1" strokeLinecap="round" />
          <path d="M46.8 32.8c2.7 1.7 5.7 1.8 8.6.4" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.1" strokeLinecap="round" />
          <ellipse cx="33.4" cy="40.6" rx="3.3" ry="3.9" fill="#fffdf7" stroke={TILE_MASCOT_INK} strokeWidth="1.4" />
          <ellipse cx="50.6" cy="40.6" rx="3.3" ry="3.9" fill="#fffdf7" stroke={TILE_MASCOT_INK} strokeWidth="1.4" />
          <circle cx="33.4" cy="41.7" r="1.6" fill="#4f2f4d" />
          <circle cx="50.6" cy="41.7" r="1.6" fill="#4f2f4d" />
          <path d="M35 52.2c2.3-1.7 4.6-2.4 7-2.4 2.4 0 4.7.7 7 2.4" fill="none" stroke="#8f4c61" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
    case 'burst':
      return (
        <>
          <path d="M28 31.4c3.1-2.2 6.7-2.4 10-.6" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M46 31.4c3.1-2.2 6.7-2.4 10-.6" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="3.2" strokeLinecap="round" />
          {renderStarEye(33, 39.5)}
          {renderStarEye(51, 39.5)}
          <path d="M33 49.5c2.5 6 15.5 6 18 0v3c0 3.1-4.2 7-9 7-4.8 0-9-3.9-9-7v-3Z" fill="#7f2233" stroke="#8f4c61" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M38 56.3c2.5 2.2 5.5 2.2 8 0" fill="none" stroke="#ff9ba5" strokeWidth="2.8" strokeLinecap="round" />
        </>
      )
    case 'board-active':
    default:
      return renderTileMascotActiveFace(tileType)
  }
}

function TileMascot({
  tileType,
  theme,
  mood,
  compact = false,
}: {
  tileType: TileType
  theme: TileTheme
  mood: TileMascotMood
  compact?: boolean
}) {
  const spec = TILE_MASCOT_SPECS[tileType]
  const faceTransform =
    mood === 'board-blocked'
      ? 'translate(0 4) scale(1 0.94)'
      : mood === 'burst'
        ? 'translate(0 -1)'
        : undefined

  return (
    <span
      className={`tile-mascot tile-mascot--${mood}${compact ? ' tile-mascot--compact' : ''}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 84 84" className="tile-mascot__svg" focusable="false">
        <ellipse cx="42" cy="75" rx="17" ry="5" fill="rgba(80, 48, 75, 0.12)" />
        {renderTileMascotAccessory(tileType, spec)}
        <path
          d="M26 70c3.5-8.6 10.5-13.5 16-13.5s12.5 4.9 16 13.5V78H26Z"
          fill={theme.main}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 68c2.6-4.6 6-7.2 10-7.2s7.4 2.6 10 7.2"
          fill="none"
          stroke={theme.accent}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <g transform={faceTransform}>
          <path
            d="M21 42c0-13.6 9.5-24.2 21-24.2s21 10.6 21 24.2S53.5 62.4 42 62.4 21 55.6 21 42Z"
            fill={spec.skin}
            stroke={TILE_MASCOT_INK}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M20 37c2.8-14.5 11.9-22.5 22-22.5 9.7 0 18.6 5.9 22 18.5-7.2-4.6-14-6.2-22-6.2-8.7 0-15.6 2.7-22 10.2Z"
            fill={spec.fringe}
            stroke={TILE_MASCOT_INK}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <circle cx="31" cy="47" r="4.1" fill={spec.blush} fillOpacity={mood === 'burst' ? 0.84 : 0.66} />
          <circle cx="53" cy="47" r="4.1" fill={spec.blush} fillOpacity={mood === 'burst' ? 0.84 : 0.66} />
          <path
            d="M39 46.8c1.2 1.1 2.4 1.3 3.5 0"
            fill="none"
            stroke="#b98074"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          {renderTileMascotFace(tileType, mood)}
          <circle cx="35" cy="33" r="2.7" fill="rgba(255,255,255,0.28)" />
        </g>
        {renderTileMascotMoodDecor(mood, theme)}
      </svg>
    </span>
  )
}

function renderChapterGameAvatarFace(mood: ChapterGameAvatarMood) {
  switch (mood) {
    case 'win':
      return (
        <>
          <path d="M39 46c3-3.7 7.4-3.7 10.4 0" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="4.4" strokeLinecap="round" />
          <path d="M67 46c3-3.7 7.4-3.7 10.4 0" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="4.4" strokeLinecap="round" />
          <path d="M39 66c4 9 20 9 24 0v4c0 5-5.6 10.2-12 10.2S39 75 39 70v-4Z" fill="#7d2233" stroke="#8f4c61" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M46 73c3 2.2 7 2.2 10 0" fill="none" stroke="#ff9ca6" strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'loss':
      return (
        <>
          <path d="M40 41c4-2.2 7.8-2.2 11.4 0" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M63 42c3.4-2.7 7.4-2.8 10.7-.2" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="45" cy="54" rx="4.4" ry="5.4" fill="#fffdf7" stroke={TILE_MASCOT_INK} strokeWidth="2" />
          <ellipse cx="69" cy="54" rx="4.4" ry="5.4" fill="#fffdf7" stroke={TILE_MASCOT_INK} strokeWidth="2" />
          <circle cx="47.8" cy="55" r="2.2" fill="#4f2f4d" />
          <circle cx="66.2" cy="55" r="2.2" fill="#4f2f4d" />
          <path d="M47 72c3.2-2.5 6.6-3.5 10-3.5 3.4 0 6.8 1 10 3.5" fill="none" stroke="#8f4c61" strokeWidth="3.4" strokeLinecap="round" />
        </>
      )
    case 'bar':
    default:
      return (
        <>
          <path d="M39 42c4.4-3.2 8.5-3.6 12.5-1.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="4.2" strokeLinecap="round" />
          <path d="M64 41c3.8-2 7.5-1.8 10.7.8" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="4.2" strokeLinecap="round" />
          <circle cx="45" cy="54" r="3.6" fill="#4f2f4d" />
          <path d="M65 54c2.8-3.4 7-3.4 9.4 0" fill="none" stroke="#4f2f4d" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M44 71c5-3.3 11.2-3 16.4.9" fill="none" stroke="#8f4c61" strokeWidth="3.6" strokeLinecap="round" />
        </>
      )
  }
}

function renderChapterGameAvatarDecor(mood: ChapterGameAvatarMood, spec: ChapterGameAvatarSpec) {
  switch (mood) {
    case 'win':
      return (
        <>
          <path d="M20 30 26 37 35 34 31 43 37 51 28 49 22 57 21 47 12 43 21 39 20 30Z" fill={spec.accent} stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M89 22 95 29 104 26 100 35 106 43 97 41 91 49 90 39 81 35 90 31 89 22Z" fill="#fff4a6" stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinejoin="round" />
        </>
      )
    case 'loss':
      return (
        <path
          d="M82 31c4.7 2.1 6.7 7.3 4.5 11.7-1.4 3.1-4.9 4.7-8.6 4.1.8-5.9 1.9-11 4.1-15.8Z"
          fill="#8fd8ff"
          stroke={TILE_MASCOT_INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )
    default:
      return (
        <path d="M86 22 89 31 98 34 89 37 86 46 83 37 74 34 83 31 86 22Z" fill="#fff4a6" stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinejoin="round" />
      )
  }
}

function ChapterGameAvatar({
  chapterId,
  mood,
  label,
}: {
  chapterId?: string | null
  mood: ChapterGameAvatarMood
  label: string
}) {
  const spec = getChapterGameAvatarSpec(chapterId)

  return (
    <span className={`chapter-game-avatar chapter-game-avatar--${mood}`} role="img" aria-label={label}>
      <svg viewBox="0 0 120 120" className="chapter-game-avatar__svg" focusable="false" aria-hidden="true">
        <circle cx="60" cy="60" r="50" fill={spec.ring} stroke={TILE_MASCOT_INK} strokeWidth="4.6" />
        <circle cx="60" cy="60" r="43" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.9)" strokeWidth="2.8" />
        <path d="M35 103c4-18 15.5-28 25-28s21 10 25 28v8H35v-8Z" fill={spec.outfit} stroke={TILE_MASCOT_INK} strokeWidth="4.4" strokeLinejoin="round" />
        <path d="M44 85c4.3 4.5 8.9 6.6 13 6.6S65.7 89.5 70 85" fill="none" stroke="#f4fff4" strokeWidth="4.8" strokeLinecap="round" />
        <path d="M30 54c0-19 12-34 27-34s27 15 27 34-12 33-27 33-27-14-27-33Z" fill={spec.skin} stroke={TILE_MASCOT_INK} strokeWidth="4.4" />
        <path d="M30 49c3-21 16-32 30-32 13 0 25.6 7.8 30 26-8-5.5-16.7-7.7-30-7.7-12.1 0-20.8 4.2-30 13.7Z" fill={spec.hair} stroke={TILE_MASCOT_INK} strokeWidth="4.2" strokeLinejoin="round" />
        <path d="M60 21c7.8-8.2 17.3-8.9 26.6-3.6-1.8 9.8-9.4 15.1-19.8 16.8L60 21Z" fill={spec.accent} stroke={TILE_MASCOT_INK} strokeWidth="3.8" strokeLinejoin="round" />
        <path d="M52 19c-6.4-6.1-13.9-6.3-21-.8 1.1 7.8 7 12.3 14.7 13.9L52 19Z" fill="#fff0a8" stroke={TILE_MASCOT_INK} strokeWidth="3.4" strokeLinejoin="round" />
        <circle cx="43" cy="64" r="6.6" fill={spec.blush} fillOpacity="0.68" />
        <circle cx="77" cy="64" r="6.6" fill={spec.blush} fillOpacity="0.68" />
        <path d="M57 60c1.4 1.2 2.8 1.3 4 0" fill="none" stroke="#c28674" strokeWidth="2.2" strokeLinecap="round" />
        {renderChapterGameAvatarFace(mood)}
        {renderChapterGameAvatarDecor(mood, spec)}
      </svg>
    </span>
  )
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

  return `推荐 ${level.campaign.recommendedSelectionCount} 次内`
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
        matchCount: config.matchCount,
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
                  这是一份为朱天宇打造的专属闯关版本，已经切成 Vita Mahjong 风格的二消玩法，当前包含{' '}
                  {campaignLevels.length} 关与 {chapterCount} 个章节。沿着角色章节推进、收集星级，并在顶部四格配对槽里稳住节奏。
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
              <div className="rule-chip">Vita 风格二消</div>
              <div className="rule-chip">顺序入槽，相邻才消</div>
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
                进入当前关卡
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
            <div className="campaign-bar" style={getChapterThemeStyle(selectedChapterTheme)}>
              <div className="campaign-bar__chapter">
                <div className="campaign-bar__avatar">
                  <ChapterGameAvatar
                    chapterId={currentLevel.campaign?.chapterId}
                    mood="bar"
                    label={`${selectedChapterTheme.roleName}搞笑头像`}
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
                <span className="status-label">已点</span>
                <strong data-testid="selected-count">{state.selectedCount} 次</strong>
              </div>
              <div className="status-chip status-chip--warning">
                <span className="status-label">剩余</span>
                <strong data-testid="remaining-count">{remainingCount} 块</strong>
              </div>
            </div>

            <section className="tray-panel tray-panel--top">
              <div className="tray-panel__heading">
                <div>
                  <p className="eyebrow">顶部配对槽</p>
                  <h2>
                    {state.trayTiles.length}/{config.trayCapacity}
                  </h2>
                </div>
                <p className="tray-tip">
                  {isResolvingMatch
                    ? '正在结算二消...'
                    : `只有相邻连在一起的两张头像才会消，最多只留 ${config.trayCapacity} 张`}
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
                          <TileMascot
                            tileType={trayTile.type}
                            theme={TILE_THEMES[trayTile.type]}
                            mood="tray"
                            compact
                          />
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
                      <TileMascot
                        tileType={burst.type}
                        theme={TILE_THEMES[burst.type]}
                        mood="burst"
                        compact
                      />
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
                        <span className="tile-card__shine" aria-hidden="true" />
                        <TileMascot
                          tileType={tile.type}
                          theme={theme}
                          mood={blocked ? 'board-blocked' : hinted ? 'board-hinted' : 'board-active'}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <section className="toolbelt">
              <div className="toolbelt__header">
                <div>
                  <p className="eyebrow">局内辅助</p>
                  <h2>四槽节奏</h2>
                </div>
                <p className="toolbelt__tip">
                  {state.lastHintTileId
                    ? '提示已圈出一张更适合现在凑对的头像。'
                    : '提示只会高亮推荐头像，不会替你自动点击。'}
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
                  <ChapterGameAvatar
                    chapterId={currentLevel.campaign?.chapterId}
                    mood={state.status === 'won' ? 'win' : 'loss'}
                    label={`${selectedChapterTheme.roleName}${state.status === 'won' ? '庆祝头像' : '崩溃头像'}`}
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
                  <h2>{state.status === 'won' ? '本局二消完成' : '顶部配对槽卡住了'}</h2>
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
                      最佳次数 {currentLevelRecord?.bestSelectedCount ?? state.selectedCount}
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
                  可以继续重试，也可以回到地图换一关。
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
