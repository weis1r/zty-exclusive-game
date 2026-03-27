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
  areLevelGoalsComplete,
  canUseUndo,
  canUseMomentumSkill,
  clearHint,
  clearResolvedMatches,
  createInitialGameState,
  getClearedSpecialCount,
  getEffectiveTrayCapacity,
  getHintSuggestion,
  getRemainingBoardTiles,
  getRemovedTypeCount,
  isTileBlocked,
  pickTile,
  restartGame,
  startGame,
  useHint,
  useMomentumSkill,
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
  TileSpecialKind,
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
  | { type: 'use-momentum-skill' }

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

interface LevelGoalProgressView {
  id: string
  label: string
  current: number
  target: number
  completed: boolean
  accent: string
  icon: string
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
  'chapter-sunset-orchard': {
    avatar: avatarBloomScout,
    ribbon: sparkRibbon,
    sticker: gardenStickerPack,
    accent: '#ff9c62',
    accentSoft: '#ffe7c2',
    roleName: '晚照小园丁',
    roleTag: '果园热身领路员',
  },
  'chapter-verdant-lab': {
    avatar: avatarMirrorGuide,
    ribbon: sparkRibbon,
    sticker: gardenStickerPack,
    accent: '#53c79c',
    accentSoft: '#d6fff1',
    roleName: '藤影研究员',
    roleTag: '翠影工房调色师',
  },
  'chapter-starlit-canopy': {
    avatar: avatarMirrorGuide,
    ribbon: sparkRibbon,
    sticker: gardenStickerPack,
    accent: '#8f92ff',
    accentSoft: '#f0dcff',
    roleName: '星幕指挥官',
    roleTag: '秘苑终章向导',
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
  'chapter-sunset-orchard': {
    skin: '#ffe0c8',
    hair: '#ff9b57',
    accent: '#ffd35d',
    outfit: '#ff8d5f',
    ring: '#ffe5bf',
    blush: '#ffc19a',
  },
  'chapter-verdant-lab': {
    skin: '#f6decf',
    hair: '#2fa878',
    accent: '#9ee6b9',
    outfit: '#36be8f',
    ring: '#d5fff2',
    blush: '#f2bcb2',
  },
  'chapter-starlit-canopy': {
    skin: '#ffe3d8',
    hair: '#7f8fff',
    accent: '#ffb6ed',
    outfit: '#676fdd',
    ring: '#e5e4ff',
    blush: '#ffc1d8',
  },
}

const DEFAULT_CHAPTER_GAME_AVATAR_SPEC = CHAPTER_GAME_AVATAR_SPECS['chapter-bloom-path']

interface TileMascotSpec {
  skin: string
  fringe: string
  accent: string
  accentSoft: string
  blush: string
  outfit: string
  eyes: 'bright' | 'smile' | 'sleepy' | 'wink' | 'gentle'
  mouth: 'open' | 'smile' | 'cat' | 'tiny'
  brows: 'bold' | 'cheer' | 'sleepy' | 'spark' | 'soft'
}

const TILE_MASCOT_SPECS: Record<TileType, TileMascotSpec> = {
  ember: {
    skin: '#ffe6c7',
    fringe: '#ff7d29',
    accent: '#ff5d42',
    accentSoft: '#ffd39f',
    blush: '#ffb49f',
    outfit: '#ff8e43',
    eyes: 'bright',
    mouth: 'open',
    brows: 'bold',
  },
  leaf: {
    skin: '#fff0dc',
    fringe: '#53c736',
    accent: '#b9f97c',
    accentSoft: '#e6ffb8',
    blush: '#f4c6a4',
    outfit: '#68c843',
    eyes: 'smile',
    mouth: 'smile',
    brows: 'cheer',
  },
  bloom: {
    skin: '#fff0e2',
    fringe: '#ff5fa8',
    accent: '#ffb6de',
    accentSoft: '#ffd6ea',
    blush: '#ffbfd3',
    outfit: '#ff78ad',
    eyes: 'bright',
    mouth: 'smile',
    brows: 'spark',
  },
  bell: {
    skin: '#fff0c9',
    fringe: '#ffc730',
    accent: '#fff09a',
    accentSoft: '#fff5b8',
    blush: '#f9c18f',
    outfit: '#f8ca42',
    eyes: 'gentle',
    mouth: 'open',
    brows: 'soft',
  },
  cloud: {
    skin: '#f8f5ff',
    fringe: '#6a91ff',
    accent: '#d9e5ff',
    accentSoft: '#eef3ff',
    blush: '#ced4ff',
    outfit: '#6f86ff',
    eyes: 'sleepy',
    mouth: 'tiny',
    brows: 'sleepy',
  },
  shell: {
    skin: '#fff4e7',
    fringe: '#2fc9af',
    accent: '#b2f7e8',
    accentSoft: '#dbfff6',
    blush: '#f4c6bf',
    outfit: '#40cdb6',
    eyes: 'gentle',
    mouth: 'cat',
    brows: 'soft',
  },
  berry: {
    skin: '#fff0f6',
    fringe: '#9559ff',
    accent: '#edbcff',
    accentSoft: '#f3dbff',
    blush: '#ffc0dc',
    outfit: '#a26aff',
    eyes: 'wink',
    mouth: 'smile',
    brows: 'spark',
  },
  pine: {
    skin: '#eef8e8',
    fringe: '#16925d',
    accent: '#9de0ac',
    accentSoft: '#d8f2c7',
    blush: '#b7d29d',
    outfit: '#239765',
    eyes: 'smile',
    mouth: 'cat',
    brows: 'cheer',
  },
  wave: {
    skin: '#eefcff',
    fringe: '#17d3ff',
    accent: '#97f5ff',
    accentSoft: '#d0fbff',
    blush: '#b5e8f0',
    outfit: '#25cdea',
    eyes: 'gentle',
    mouth: 'smile',
    brows: 'soft',
  },
}

const TILE_MASCOT_INK = '#6a4b4b'
const TILE_MASCOT_LINE_SOFT = 'rgba(106, 75, 75, 0.4)'
const TILE_MASCOT_SKIN_SHADOW = 'rgba(118, 84, 78, 0.12)'

function getChapterGameAvatarSpec(chapterId?: string | null) {
  if (!chapterId) {
    return DEFAULT_CHAPTER_GAME_AVATAR_SPEC
  }

  return CHAPTER_GAME_AVATAR_SPECS[chapterId] ?? DEFAULT_CHAPTER_GAME_AVATAR_SPEC
}

function renderPortraitSpark(cx: number, cy: number, stroke: string) {
  return (
    <g fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${cx} ${cy - 5}v10`} strokeWidth="1.7" />
      <path d={`M${cx - 5} ${cy}h10`} strokeWidth="1.7" />
      <path d={`M${cx - 3.5} ${cy - 3.5}l7 7`} strokeWidth="1.1" />
      <path d={`M${cx + 3.5} ${cy - 3.5}l-7 7`} strokeWidth="1.1" />
    </g>
  )
}

function renderTileMascotAccessory(tileType: TileType, spec: TileMascotSpec) {
  switch (tileType) {
    case 'ember':
      return (
        <g
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path
            d="M42 7c5.1 3.8 10.4 11.1 10.4 18.5 4.3 2.8 8.5 8.2 8.5 13.8-5.4-3.8-11.4-5.5-18.9-5.5-7.8 0-13.8 1.9-19.4 6 0-6 4-11.5 8.7-14.5 0-7.1 5.2-14.4 10.7-18.3Z"
            fill={spec.accent}
          />
          <path
            d="M42 13c3.4 3.2 6.6 7.3 6.6 11.9 0 2.7-.8 5-2.5 7.4-1.7-.4-3.3-.6-4.9-.6-1.8 0-3.5.2-5.3.7-1.6-2.3-2.3-4.7-2.3-7.4 0-4.7 3.1-8.6 8.4-12Z"
            fill={spec.fringe}
          />
        </g>
      )
    case 'leaf':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2.1" strokeLinecap="round">
          <ellipse
            cx="27"
            cy="27"
            rx="9"
            ry="15"
            transform="rotate(-34 27 27)"
            fill={spec.accent}
          />
          <ellipse
            cx="57"
            cy="27"
            rx="9"
            ry="15"
            transform="rotate(34 57 27)"
            fill={spec.fringe}
          />
          <path
            d="M42 10c3.6 2.1 5.8 5.5 5.8 9.1-3.4-.4-5.4.8-5.8 4.1-1-3.5-3.1-4.7-6.7-4.2.1-3.4 2.8-6.8 6.7-9Z"
            fill={spec.accentSoft}
          />
          <path
            d="M42 17v11"
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
          <circle cx="42" cy="14" r="7.2" fill={spec.accent} />
          <circle cx="28" cy="21" r="6.8" fill={spec.accent} />
          <circle cx="56" cy="21" r="6.8" fill={spec.accent} />
          <circle cx="33" cy="33" r="6.6" fill={spec.accent} />
          <circle cx="51" cy="33" r="6.6" fill={spec.accent} />
          <circle cx="42" cy="24" r="5.8" fill={spec.fringe} />
        </g>
      )
    case 'bell':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 24c0-10.2 8.1-17.1 18-17.1S60 13.8 60 24v11H24Z" fill={spec.fringe} />
          <path
            d="M21 32c0-8.2 41.8-8.2 41.8 0 0 6.9-9 11.8-20.9 11.8S21 38.9 21 32Z"
            fill={spec.accent}
          />
          <circle cx="42" cy="40" r="3.4" fill="#f5a23d" />
        </g>
      )
    case 'cloud':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="27" r="8.6" fill={spec.accent} />
          <circle cx="37" cy="18" r="10.8" fill={spec.accentSoft} />
          <circle cx="50" cy="18" r="11.2" fill={spec.accent} />
          <circle cx="61" cy="28" r="8.1" fill={spec.accentSoft} />
          <ellipse cx="43" cy="31" rx="24" ry="10.5" fill={spec.fringe} />
        </g>
      )
    case 'shell':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M22 33c0-14.7 9.1-22.7 20-22.7S62 18.3 62 33H22Z"
            fill={spec.fringe}
          />
          <path
            d="M27 33V19M35 33V15M42 33V13M49 33V15M57 33V19"
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
          <circle cx="30" cy="21" r="8.8" fill={spec.fringe} />
          <circle cx="54" cy="21" r="8.8" fill={spec.fringe} />
          <path
            d="M42 14c-5.2-8.4-13-8-13-8 3.2 4.7 4.6 8.8 4.6 8.8M42 14c5.2-8.4 13-8 13-8-3.2 4.7-4.6 8.8-4.6 8.8"
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
          <path d="M42 6 31 22h22Z" fill={spec.accent} />
          <path d="M42 12 26 33h32Z" fill={spec.fringe} />
          <path d="M42 31v8" fill="none" stroke="#5b876c" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )
    case 'wave':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M20 30c7.8-15.2 24.4-18.4 37.8-10.1-8.5.6-13.9 4.5-13.9 10 0 4.3 3.6 8 9.3 9.5-10.9 5.5-24.1 4.3-33-2.4-4.4-3.3-4.2-4.7-.2-7Z"
            fill={spec.fringe}
          />
          <circle cx="58" cy="19" r="5.8" fill={spec.accentSoft} />
        </g>
      )
  }
}

function renderTileMascotHeadBase(tileType: TileType, spec: TileMascotSpec) {
  const sharedProps = {
    fill: spec.skin,
    stroke: TILE_MASCOT_INK,
    strokeWidth: 2.4,
    strokeLinejoin: 'round' as const,
  }

  switch (tileType) {
    case 'ember':
      return (
        <path
          d="M22.5 41.5c0-13.8 8.7-23.7 19.5-23.7s19.5 9.9 19.5 23.7c0 12.8-8.3 21.8-19.5 21.8s-19.5-9-19.5-21.8Z"
          {...sharedProps}
        />
      )
    case 'leaf':
      return (
        <path
          d="M24 39.5c0-13 7.9-22.3 18.2-22.3 11.4 0 19.2 10 19.2 23.6 0 12.9-8.1 22.1-19.4 22.1-10.4 0-18-9.6-18-23.4Z"
          {...sharedProps}
        />
      )
    case 'bloom':
      return <ellipse cx="42" cy="42.5" rx="20.5" ry="21.7" {...sharedProps} />
    case 'bell':
      return (
        <path
          d="M23 41.2c0-13.4 8.8-22.8 19-22.8 10.8 0 19 9.8 19 22.8 0 12.1-8.4 20.6-19 20.6-10.4 0-19-8.5-19-20.6Z"
          {...sharedProps}
        />
      )
    case 'cloud':
      return (
        <path
          d="M24 48c-1.3-10.6 4.6-18.9 12.8-21.4 3-5.2 8-8.4 13.8-8.4 10.1 0 17.8 9.1 17.8 20.9 0 13.7-10.6 24-23.4 24-10.5 0-19.2-6.4-21-15.1Z"
          {...sharedProps}
        />
      )
    case 'shell':
      return (
        <path
          d="M20.8 43.2c0-13 9.4-22 21.2-22s21.2 9 21.2 22c0 11.7-8.7 20.4-21.2 20.4s-21.2-8.7-21.2-20.4Z"
          {...sharedProps}
        />
      )
    case 'berry':
      return <ellipse cx="42" cy="43.2" rx="19.8" ry="21.3" {...sharedProps} />
    case 'pine':
      return <ellipse cx="42" cy="43.4" rx="18.2" ry="22.8" {...sharedProps} />
    case 'wave':
      return (
        <path
          d="M22 43c0-13.4 8.8-22 20.4-22 11.8 0 20.6 8.6 20.6 22 0 12.5-8.8 21.6-20.6 21.6-11.6 0-20.4-9.1-20.4-21.6Z"
          {...sharedProps}
        />
      )
  }
}

function renderTileMascotFringe(tileType: TileType, spec: TileMascotSpec) {
  switch (tileType) {
    case 'ember':
      return (
        <path
          d="M22 38.5c3.3-13.5 12.1-21.2 20-21.2 8.4 0 16.2 4.7 20.8 16.6-5.4-2.2-11.1-3.5-18-3.5-8.9 0-15.4 2.5-22.8 8.1Z"
          fill={spec.fringe}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      )
    case 'leaf':
      return (
        <path
          d="M24.5 35.8c4.7-9.8 11.1-15.3 18.3-15.3 7.2 0 13.7 4.8 18.1 14.2-5.8-3.6-11.8-5-18.2-5-6.8 0-12.6 1.7-18.2 6.1Z"
          fill={spec.fringe}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      )
    case 'bloom':
      return (
        <path
          d="M22 37.5c4.3-11.5 11.8-17.4 20-17.4 7.9 0 15.8 5.3 20.7 15.5-7.8-4.7-13.4-5.8-20.5-5.8-7.4 0-13.1 1.7-20.2 7.7Z"
          fill={spec.fringe}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )
    case 'bell':
      return (
        <path
          d="M23 35.4c3.8-10.9 10.5-16.8 19-16.8 8.5 0 15.1 5.8 19 16.8-7.2-4.3-12.7-5.5-19-5.5-6.2 0-11.7 1.2-19 5.5Z"
          fill={spec.accentSoft}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )
    case 'cloud':
      return (
        <path
          d="M22 40c2.9-10.7 11-17.1 20.8-17.1 8.7 0 16.4 5.1 20.6 13.9-8.1-3.5-12.9-4.3-19.9-4.3-7.5 0-13.1 1.4-21.5 7.5Z"
          fill={spec.fringe}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )
    case 'shell':
      return (
        <path
          d="M20.8 39.2c3-10.8 12-16.9 21.2-16.9 9.1 0 18.2 6.1 21.2 16.9-7.2-4-13.5-5.3-21.2-5.3-7.8 0-14 1.3-21.2 5.3Z"
          fill={spec.accentSoft}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      )
    case 'berry':
      return (
        <path
          d="M22.5 38.8c3.8-11.2 11.5-17.7 19.5-17.7 7.8 0 15.6 5.6 19.6 16-6.1-3.1-11.6-4.1-18.4-4.1-7.9 0-12.9 1.5-20.7 5.8Z"
          fill={spec.fringe}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      )
    case 'pine':
      return (
        <path
          d="M24 38.6c3.1-10.3 10.3-15.9 18-15.9 8.5 0 15.4 5.7 18.7 17.1-6.6-3.6-11.5-4.6-18.4-4.6-7 0-11.9 1.1-18.3 3.4Z"
          fill={spec.fringe}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      )
    case 'wave':
      return (
        <path
          d="M20.8 39.2c6.1-11.4 12.5-17.2 21.2-17.2 7 0 14.3 4.1 20.2 12.3-6.8-2.3-11.7-3-18.4-3-8 0-14.1 1.5-23 7.9Z"
          fill={spec.fringe}
          stroke={TILE_MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      )
  }
}

function renderTileMascotBodyTrim(tileType: TileType, spec: TileMascotSpec) {
  switch (tileType) {
    case 'ember':
      return (
        <path
          d="M42 68c2 1.7 3.8 4.1 3.8 6.5 0 2-1.2 3.7-3.8 4.9-2.6-1.2-3.8-2.9-3.8-4.9 0-2.4 1.8-4.8 3.8-6.5Z"
          fill={spec.accentSoft}
          stroke={TILE_MASCOT_INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )
    case 'leaf':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="37" cy="74" rx="3.8" ry="6" transform="rotate(-28 37 74)" fill={spec.accentSoft} />
          <ellipse cx="47" cy="74" rx="3.8" ry="6" transform="rotate(28 47 74)" fill={spec.accent} />
        </g>
      )
    case 'bloom':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="1.6" strokeLinejoin="round">
          <circle cx="42" cy="74" r="3" fill={spec.fringe} />
          <circle cx="37.3" cy="74" r="2.1" fill={spec.accentSoft} />
          <circle cx="46.7" cy="74" r="2.1" fill={spec.accentSoft} />
          <circle cx="42" cy="69.4" r="2.1" fill={spec.accentSoft} />
          <circle cx="42" cy="78.6" r="2.1" fill={spec.accentSoft} />
        </g>
      )
    case 'bell':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M37 72c0-3.4 10-3.4 10 0v4H37Z" fill={spec.accentSoft} />
          <path d="M35 76c0-3.9 14-3.9 14 0 0 2.7-3.2 4.5-7 4.5S35 78.7 35 76Z" fill={spec.accent} />
        </g>
      )
    case 'cloud':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="1.6" strokeLinejoin="round">
          <circle cx="37" cy="75" r="3" fill={spec.accentSoft} />
          <circle cx="42" cy="72.4" r="4" fill={spec.accent} />
          <circle cx="47.2" cy="75" r="3.2" fill={spec.accentSoft} />
          <ellipse cx="42" cy="76.6" rx="8" ry="3.4" fill={spec.fringe} />
        </g>
      )
    case 'shell':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M35 79c0-5.3 3.2-8.4 7-8.4s7 3.1 7 8.4H35Z" fill={spec.accentSoft} />
          <path d="M38 79v-4.8M42 79v-6.2M46 79v-4.8" fill="none" stroke={spec.fringe} />
        </g>
      )
    case 'berry':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="38" cy="74" r="3.8" fill={spec.fringe} />
          <circle cx="46" cy="74" r="3.8" fill={spec.fringe} />
          <path d="M42 72c-2.1-4-5.7-4.4-5.7-4.4M42 72c2.1-4 5.7-4.4 5.7-4.4" fill="none" stroke={spec.accent} />
        </g>
      )
    case 'pine':
      return (
        <g stroke={TILE_MASCOT_INK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M42 68 37 75h10Z" fill={spec.accentSoft} />
          <path d="M42 71 34 80h16Z" fill={spec.accent} />
        </g>
      )
    case 'wave':
      return (
        <path
          d="M34 76c3.3-5.6 8.8-7.4 14.4-4.1-2.8.4-4.5 2-4.5 4.1 0 2.3 1.9 4.1 5.2 4.5-4.1 3.1-10 2.8-14.2-.1-2.6-1.8-3.3-3-.9-4.4Z"
          fill={spec.accentSoft}
          stroke={TILE_MASCOT_INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
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
          {renderPortraitSpark(21, 30, theme.accent)}
          {renderPortraitSpark(67, 28, '#fff3b0')}
        </>
      )
    default:
      return null
  }
}

function renderPortraitComplexion(mood: TileMascotMood) {
  const cheekOpacity =
    mood === 'burst' ? 0.18 : mood === 'board-hinted' ? 0.14 : mood === 'tray' ? 0.1 : 0.12

  return (
    <>
      <path
        d="M26.6 45.2c1.8 7.6 7 12.6 15 15-8.8 0-15.6-5.2-17.5-13-.5-2.3-.4-4.3.5-6Z"
        fill={TILE_MASCOT_SKIN_SHADOW}
      />
      <path
        d="M54.4 30.2c5.5 3.1 8.8 8.8 8.8 16.2 0 9.7-6 15.9-17.8 18.9 7.9-.2 14-3.7 17.4-10.3 3.1-6 3.3-12.4.5-18.8-1.4-2.9-3.4-5-6.3-6Z"
        fill="rgba(255,255,255,0.18)"
      />
      <ellipse cx="31.2" cy="47.9" rx="3.2" ry="2.1" fill={`rgba(208, 128, 120, ${cheekOpacity})`} />
      <ellipse
        cx="53.4"
        cy="47.5"
        rx="3.4"
        ry="2"
        fill={`rgba(208, 128, 120, ${(cheekOpacity * 0.82).toFixed(2)})`}
      />
      <path
        d="M33.4 35.2c2.1-1.7 4.6-2.4 7.4-2.1"
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </>
  )
}

function renderPortraitEye(
  cx: number,
  cy: number,
  variant: 'almond' | 'wide' | 'smile' | 'sleepy' | 'wink',
  pupilShiftX = 0,
) {
  switch (variant) {
    case 'smile':
      return (
        <>
          <path
            d={`M${cx - 4.1} ${cy + 0.5}c1.8-1.7 5.9-1.7 7.8 0`}
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.55"
            strokeLinecap="round"
          />
          <path
            d={`M${cx - 2.8} ${cy + 1.1}c1.2.5 3.2.5 4.5 0`}
            fill="none"
            stroke={TILE_MASCOT_LINE_SOFT}
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </>
      )
    case 'sleepy':
      return (
        <>
          <path
            d={`M${cx - 4.3} ${cy + 0.3}c1.9-1.9 6.5-1.9 8.6 0`}
            fill="#fffdfa"
            stroke="rgba(106,75,75,0.32)"
            strokeWidth="0.95"
            strokeLinejoin="round"
          />
          <path
            d={`M${cx - 4.2} ${cy + 0.1}c2.1-1.4 6.2-1.4 8.4 0`}
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.15"
            strokeLinecap="round"
          />
          <ellipse cx={cx + pupilShiftX} cy={cy + 0.8} rx="1.1" ry="1.35" fill="#46323c" />
        </>
      )
    case 'wink':
      return (
        <>
          <path
            d={`M${cx - 3.9} ${cy + 0.4}c1.8-1.3 5.7-1.3 7.4 0`}
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.45"
            strokeLinecap="round"
          />
          <path
            d={`M${cx - 2.3} ${cy + 1}c.9.4 2.4.4 3.3 0`}
            fill="none"
            stroke={TILE_MASCOT_LINE_SOFT}
            strokeWidth="0.85"
            strokeLinecap="round"
          />
        </>
      )
    case 'wide':
    case 'almond':
    default: {
      const isWide = variant === 'wide'
      const rx = isWide ? 4.15 : 3.9
      const ry = isWide ? 2.35 : 2.05
      const upperArch = isWide ? 2.65 : 2.2

      return (
        <>
          <ellipse
            cx={cx}
            cy={cy + 0.55}
            rx={rx}
            ry={ry}
            fill="#fffdfa"
            stroke="rgba(106,75,75,0.32)"
            strokeWidth="0.95"
          />
          <path
            d={`M${cx - rx} ${cy + 0.15}c1.9-${upperArch} 6.2-${upperArch} ${rx * 2} 0`}
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth={isWide ? '1.25' : '1.18'}
            strokeLinecap="round"
          />
          <ellipse
            cx={cx + pupilShiftX}
            cy={cy + 0.75}
            rx={isWide ? 1.4 : 1.2}
            ry={isWide ? 1.65 : 1.45}
            fill="#48333a"
          />
          <circle
            cx={cx + pupilShiftX + 0.42}
            cy={cy + 0.2}
            r="0.42"
            fill="rgba(255,255,255,0.88)"
          />
        </>
      )
    }
  }
}

function renderActivePortraitBrows(style: TileMascotSpec['brows']) {
  switch (style) {
    case 'bold':
      return (
        <>
          <path d="M29.3 33.1c2.2-1.6 5-2.1 7.9-1.4" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.55" strokeLinecap="round" />
          <path d="M47 31.7c2.4-1 5-.7 7.4.9" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.55" strokeLinecap="round" />
        </>
      )
    case 'cheer':
      return (
        <>
          <path d="M29.9 33.5c2.1-1 4.7-1.1 7.2-.2" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M46.7 33c2.2-1 4.8-.9 7.2.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.4" strokeLinecap="round" />
        </>
      )
    case 'sleepy':
      return (
        <>
          <path d="M30.1 34c2.3-.5 4.8-.4 7 .2" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.25" strokeLinecap="round" />
          <path d="M46.8 33.9c2.1-.5 4.5-.4 6.9.3" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.25" strokeLinecap="round" />
        </>
      )
    case 'spark':
      return (
        <>
          <path d="M29.5 32.5c2.2-1.7 4.9-2.1 7.6-1" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.45" strokeLinecap="round" />
          <path d="M46.9 32c2.4-1.2 5-.9 7.2.8" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.45" strokeLinecap="round" />
        </>
      )
    case 'soft':
    default:
      return (
        <>
          <path d="M29.9 33.6c2-.9 4.6-1 7-.2" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.35" strokeLinecap="round" />
          <path d="M46.8 33.4c2-.8 4.5-.7 6.9.4" fill="none" stroke={TILE_MASCOT_INK} strokeWidth="1.35" strokeLinecap="round" />
        </>
      )
  }
}

function renderActivePortraitEyes(style: TileMascotSpec['eyes']) {
  switch (style) {
    case 'smile':
      return (
        <>
          {renderPortraitEye(33.6, 39.5, 'smile')}
          {renderPortraitEye(50.6, 39.5, 'smile')}
        </>
      )
    case 'sleepy':
      return (
        <>
          {renderPortraitEye(33.6, 39.8, 'sleepy', -0.3)}
          {renderPortraitEye(50.6, 39.8, 'sleepy', 0.2)}
        </>
      )
    case 'wink':
      return (
        <>
          {renderPortraitEye(33.6, 39.4, 'wink')}
          {renderPortraitEye(50.6, 39.4, 'almond', 0.2)}
        </>
      )
    case 'gentle':
      return (
        <>
          {renderPortraitEye(33.6, 39.5, 'almond', -0.2)}
          {renderPortraitEye(50.6, 39.5, 'almond', 0.1)}
        </>
      )
    case 'bright':
    default:
      return (
        <>
          {renderPortraitEye(33.6, 39.3, 'wide')}
          {renderPortraitEye(50.6, 39.3, 'wide')}
        </>
      )
  }
}

function renderPortraitNose() {
  return (
    <>
      <path
        d="M42.1 42.1c-.9 2-.8 4.2.5 6.3"
        fill="none"
        stroke="#b07f76"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M40.9 48.6c.8.9 1.9 1.2 3.4.8"
        fill="none"
        stroke="#b07f76"
        strokeWidth="0.95"
        strokeLinecap="round"
      />
      <path
        d="M42.8 47.9c.5.3 1 .5 1.5.4"
        fill="none"
        stroke={TILE_MASCOT_LINE_SOFT}
        strokeWidth="0.85"
        strokeLinecap="round"
      />
    </>
  )
}

function renderActivePortraitMouth(style: TileMascotSpec['mouth']) {
  switch (style) {
    case 'open':
      return (
        <>
          <path
            d="M37.8 53c1.4-1.2 2.8-1.8 4.4-1.8 1.6 0 3.1.6 4.6 1.8"
            fill="rgba(166,88,92,0.22)"
            stroke="#8b6064"
            strokeWidth="1.05"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M38.7 53.7c1.1 1 2.2 1.5 3.5 1.5 1.4 0 2.8-.5 4.1-1.5"
            fill="none"
            stroke="#c98b88"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </>
      )
    case 'cat':
      return (
        <>
          <path
            d="M37.9 52.9c1.3-.9 2.6-1.4 3.8-1.4 1.3 0 2.6.5 4 1.4"
            fill="none"
            stroke="#8d6266"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M40.4 53.5c.7.8 1.5 1.2 2.2 1.2.9 0 1.7-.4 2.4-1.2"
            fill="none"
            stroke="#bc827e"
            strokeWidth="0.95"
            strokeLinecap="round"
          />
        </>
      )
    case 'tiny':
      return (
        <path
          d="M39 53.3c1.8-.5 3.7-.6 5.6-.1"
          fill="none"
          stroke="#8d6266"
          strokeWidth="1.05"
          strokeLinecap="round"
        />
      )
    case 'smile':
    default:
      return (
        <>
          <path
            d="M36.8 52.3c1.8 1.5 3.6 2.2 5.5 2.2 2.1 0 4.1-.8 6-2.3"
            fill="none"
            stroke="#8d6266"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M37.9 53.1c1.5.9 3 1.3 4.4 1.3 1.6 0 3.2-.5 4.8-1.4"
            fill="none"
            stroke="#c48987"
            strokeWidth="0.92"
            strokeLinecap="round"
          />
        </>
      )
  }
}

function renderTileMascotActiveFace(spec: TileMascotSpec) {
  return (
    <>
      {renderActivePortraitBrows(spec.brows)}
      {renderActivePortraitEyes(spec.eyes)}
      {renderPortraitNose()}
      {renderActivePortraitMouth(spec.mouth)}
    </>
  )
}

function renderTileMascotFace(spec: TileMascotSpec, mood: TileMascotMood) {
  switch (mood) {
    case 'board-blocked':
      return (
        <>
          <path
            d="M29.9 33.8c2.2-1.2 4.9-1.3 7.5-.4"
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            d="M46.8 33.3c2.1-.9 4.8-.8 7.2.4"
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          {renderPortraitEye(33.6, 40.4, 'sleepy', -0.8)}
          {renderPortraitEye(50.6, 40.4, 'sleepy', 0.8)}
          {renderPortraitNose()}
          <path
            d="M37 54.2c1.7-1 3.4-1.5 5-1.5 1.7 0 3.4.5 5.1 1.5"
            fill="none"
            stroke="#8d6266"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </>
      )
    case 'board-hinted':
      return (
        <>
          <path
            d="M29 31.4c2.4-2.2 5.7-2.8 8.9-1.5"
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.45"
            strokeLinecap="round"
          />
          <path
            d="M46.3 30.9c2.6-1.9 5.8-2.1 8.7-.4"
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.45"
            strokeLinecap="round"
          />
          {renderPortraitEye(33.6, 40.1, 'wide')}
          {renderPortraitEye(50.6, 40.1, 'wide')}
          {renderPortraitNose()}
          <path
            d="M37.9 52.9c1.3-1.3 2.7-1.9 4.2-1.9 1.6 0 3 .6 4.4 1.9"
            fill="rgba(172,94,96,0.2)"
            stroke="#8d6266"
            strokeWidth="1.05"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
    case 'tray':
      return (
        <>
          <path
            d="M29.9 34.2c2.1.8 4.6.7 6.8-.3"
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M47 34c1.9.9 4.3.8 6.7 0"
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {renderPortraitEye(33.6, 40.3, 'sleepy', 0.2)}
          {renderPortraitEye(50.6, 40.3, 'sleepy', -0.2)}
          {renderPortraitNose()}
          <path
            d="M38 53.8c1.4-.7 2.7-1 4-1 1.4 0 2.8.3 4.1 1"
            fill="none"
            stroke="#8d6266"
            strokeWidth="1.05"
            strokeLinecap="round"
          />
        </>
      )
    case 'burst':
      return (
        <>
          <path
            d="M29.6 32.7c2.1-1.3 4.9-1.5 7.4-.5"
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M46.8 32.4c2.2-1.2 4.9-1.1 7.3.4"
            fill="none"
            stroke={TILE_MASCOT_INK}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {renderPortraitEye(33.6, 39.8, 'smile')}
          {renderPortraitEye(50.6, 39.8, 'smile')}
          {renderPortraitNose()}
          <path
            d="M36 52c1.9 2 3.9 3 6 3 2.2 0 4.4-1 6.5-3.1"
            fill="none"
            stroke="#8d6266"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M37.8 53.5c1.5.9 2.9 1.3 4.2 1.3 1.4 0 2.9-.4 4.6-1.4"
            fill="none"
            stroke="#cf8d8a"
            strokeWidth="0.92"
            strokeLinecap="round"
          />
        </>
      )
    case 'board-active':
    default:
      return renderTileMascotActiveFace(spec)
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
      ? 'translate(0 2.6) scale(1 0.97)'
      : mood === 'burst'
        ? 'translate(0 -0.6)'
        : undefined
  const portraitFrameTransform = 'translate(1.7 0.9) scale(0.96)'

  return (
    <span
      className={`tile-mascot tile-mascot--${tileType} tile-mascot--${mood}${
        compact ? ' tile-mascot--compact' : ''
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 84 84" className="tile-mascot__svg" focusable="false">
        <ellipse cx="42" cy="76" rx="16" ry="4.6" fill="rgba(80, 48, 75, 0.1)" />
        <g transform="translate(5 4.8) scale(0.88)" opacity="0.92">
          {renderTileMascotAccessory(tileType, spec)}
        </g>
        <path
          d="M23 79c2.8-11 9.9-17.5 19-17.5s16.3 6.5 19 17.5v2H23v-2Z"
          fill={spec.outfit}
          stroke={TILE_MASCOT_INK}
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M29.2 72.6c3.4-4.5 7.7-6.8 12.8-6.8 5.2 0 9.4 2.3 12.8 6.8"
          fill="none"
          stroke={spec.accentSoft}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M37.4 63.1c.3 2.7 2 4.8 4.6 6.1 2.7-1.3 4.3-3.4 4.6-6.1"
          fill={spec.skin}
          stroke="rgba(106,75,75,0.26)"
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <path
          d="M36.8 63.7c1.5 3.1 3.2 4.7 5.1 4.7s3.6-1.6 5.3-4.7"
          fill="none"
          stroke="#fff6ef"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {renderTileMascotBodyTrim(tileType, spec)}
        <g transform={portraitFrameTransform}>
          <g transform={faceTransform}>
            {renderTileMascotHeadBase(tileType, spec)}
            {renderPortraitComplexion(mood)}
            {renderTileMascotFringe(tileType, spec)}
            {renderTileMascotFace(spec, mood)}
            <path
              d="M49.8 31.4c2.2.8 4.3 2.2 6.3 4.4"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </g>
        </g>
        {renderTileMascotMoodDecor(mood, theme)}
      </svg>
    </span>
  )
}

function TileThemeBadge({
  badge,
  className,
}: {
  badge: string
  className: string
}) {
  return (
    <span className={className} aria-hidden="true">
      {badge}
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
        return useHint(state, config, level)
      case 'use-undo':
        return useUndo(state)
      case 'use-momentum-skill':
        return useMomentumSkill(state, config)
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

function getSpecialBadge(kind: TileSpecialKind) {
  switch (kind) {
    case 'crate':
      return '✦'
    case 'companion':
      return '♥'
    case 'wild':
      return '∞'
  }
}

function getSpecialLabel(kind: TileSpecialKind) {
  switch (kind) {
    case 'crate':
      return '礼盒砖'
    case 'companion':
      return '伙伴砖'
    case 'wild':
      return '万能砖'
  }
}

function getLevelGoalProgress(level: LevelDefinition, state: GameState): LevelGoalProgressView[] {
  if (!level.goals || level.goals.length === 0) {
    const remainingCount = getRemainingBoardTiles(state).length
    const clearedCount = level.tiles.length - remainingCount

    return [
      {
        id: 'clear-board',
        label: '清空整个棋盘',
        current: clearedCount,
        target: level.tiles.length,
        completed: remainingCount === 0,
        accent: '#ff9d58',
        icon: '◎',
      },
    ]
  }

  return level.goals.map((goal) => {
    if (goal.kind === 'collect-type') {
      const current = getRemovedTypeCount(state, goal.tileType)

      return {
        id: goal.id,
        label: goal.label,
        current,
        target: goal.target,
        completed: current >= goal.target,
        accent: TILE_THEMES[goal.tileType].main,
        icon: TILE_THEMES[goal.tileType].badge,
      }
    }

    const current = getClearedSpecialCount(state, goal.specialKind)

    return {
      id: goal.id,
      label: goal.label,
      current,
      target: goal.target,
      completed: current >= goal.target,
      accent:
        goal.specialKind === 'crate'
          ? '#ffb158'
          : goal.specialKind === 'companion'
            ? '#ff6fa7'
            : '#7c8cff',
      icon: getSpecialBadge(goal.specialKind),
    }
  })
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
  const levelGoalProgress = getLevelGoalProgress(currentLevel, state)
  const completedGoalCount = levelGoalProgress.filter((goal) => goal.completed).length
  const effectiveTrayCapacity = getEffectiveTrayCapacity(state, config)
  const canUseMomentumButton = canUseMomentumSkill(state, config)

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
        momentumCharge: state.momentumCharge,
        momentumTarget: config.momentumChargeTarget,
        effectiveTrayCapacity,
        lastHintTileId: state.lastHintTileId,
        remainingCount: getRemainingBoardTiles(state).length,
        goals: levelGoalProgress.map((goal) => ({
          id: goal.id,
          label: goal.label,
          current: goal.current,
          target: goal.target,
          completed: goal.completed,
        })),
        exposedTiles: getRemainingBoardTiles(state)
          .filter((tile) => !isTileBlocked(tile.id, state, config))
          .map((tile) => ({
            id: tile.id,
            type: tile.type,
            x: tile.x,
            y: tile.y,
            layer: tile.layer,
            special: tile.special?.kind ?? null,
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
    effectiveTrayCapacity,
    levelGoalProgress,
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
  const hintSuggestion = getHintSuggestion(state, config, currentLevel)
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

  function handleUseMomentumSkill() {
    if (!canUseMomentumButton) {
      return
    }

    dispatch({ type: 'use-momentum-skill' })
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
              <div className="rule-chip">{campaignLevels.length}关 {chapterCount}章节</div>
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

            <section className="goal-panel" data-testid="level-goals">
              <div className="goal-panel__header">
                <div>
                  <p className="eyebrow">本关目标</p>
                  <h2>先完成任务，再决定要不要清全盘</h2>
                </div>
                <p className="goal-panel__tip">
                  {areLevelGoalsComplete(state, currentLevel)
                    ? '目标已经全部完成，随时都能收下这一关。'
                    : '这一章开始，每关都有更明确的任务目标。'}
                </p>
              </div>
              <div className="goal-panel__grid">
                {levelGoalProgress.map((goal) => (
                  <article
                    key={goal.id}
                    className={`goal-card${goal.completed ? ' goal-card--done' : ''}`}
                    style={{ '--goal-accent': goal.accent } as CSSProperties}
                  >
                    <span className="goal-card__icon" aria-hidden="true">
                      {goal.icon}
                    </span>
                    <div>
                      <strong>{goal.label}</strong>
                      <span>
                        {Math.min(goal.current, goal.target)}/{goal.target}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

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
              <div className="status-chip">
                <span className="status-label">目标</span>
                <strong>
                  {completedGoalCount}/{levelGoalProgress.length}
                </strong>
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
                  <h2>先做目标，再用节奏换扩槽</h2>
                </div>
                <div className="toolbelt__meta">
                  <p className="toolbelt__tip">
                    {state.lastHintTileId
                      ? '提示已标记一张更接近目标的推荐砖块。'
                      : '提示会优先指向目标砖或关键特殊砖。'}
                  </p>
                  <div className="charge-meter" data-testid="momentum-meter">
                    <span className="charge-meter__label">充能</span>
                    <div className="charge-meter__pips" aria-hidden="true">
                      {Array.from({ length: config.momentumChargeTarget }, (_, index) => (
                        <span
                          key={`charge-${index}`}
                          className={`charge-meter__pip${
                            index < state.momentumCharge ? ' charge-meter__pip--filled' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
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
                <button
                  type="button"
                  className="tool-button tool-button--charge"
                  data-testid="momentum-button"
                  disabled={!canUseMomentumButton}
                  onClick={handleUseMomentumSkill}
                >
                  <span className="tool-button__icon">槽</span>
                  <span className="tool-button__label">扩槽</span>
                  <span className="tool-button__count">+{state.bonusTrayCapacity}</span>
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
                      aria-label={
                        tile.special
                          ? `${theme.title} · ${getSpecialLabel(tile.special.kind)}`
                          : theme.title
                      }
                      data-testid={`tile-${tile.id}`}
                      disabled={blocked || isResolvingMatch || state.status !== 'playing'}
                    >
                      <span className="tile-card__shadow" aria-hidden="true" />
                      <span className="tile-card__face">
                        <span className="tile-card__shine" aria-hidden="true" />
                        <TileThemeBadge badge={theme.badge} className="tile-card__badge" />
                        <TileMascot
                          tileType={tile.type}
                          theme={theme}
                          mood={blocked ? 'board-blocked' : hinted ? 'board-hinted' : 'board-active'}
                        />
                        {tile.special ? (
                          <span
                            className={`tile-card__special tile-card__special--${tile.special.kind}`}
                            aria-hidden="true"
                            title={getSpecialLabel(tile.special.kind)}
                          >
                            {getSpecialBadge(tile.special.kind)}
                          </span>
                        ) : null}
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
                    {state.trayTiles.length}/{effectiveTrayCapacity}
                  </h2>
                </div>
                <p className="tray-tip">
                  {isResolvingMatch
                    ? '正在结算三消...'
                    : state.bonusTrayCapacity > 0
                      ? `本局已解锁 +${state.bonusTrayCapacity} 个额外槽位`
                      : '同类砖块会自动相邻整理'}
                </p>
              </div>

              <div
                className="tray-grid"
                data-testid="tray-grid"
                style={{
                  gridTemplateColumns: `repeat(${effectiveTrayCapacity}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: effectiveTrayCapacity }, (_, slotIndex) => {
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
                          <TileThemeBadge
                            badge={TILE_THEMES[trayTile.type].badge}
                            className="tray-tile__badge"
                          />
                          {trayTile.specialKind ? (
                            <span
                              className={`tray-tile__special tray-tile__special--${trayTile.specialKind}`}
                              aria-hidden="true"
                            >
                              {getSpecialBadge(trayTile.specialKind)}
                            </span>
                          ) : null}
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
                      <TileThemeBadge
                        badge={TILE_THEMES[burst.type].badge}
                        className="match-burst__badge"
                      />
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
                    <span>
                      目标完成 {completedGoalCount}/{levelGoalProgress.length}
                    </span>
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
