import type { GameConfig, TileTheme, TileType } from './types'

export const GAME_CONFIG: GameConfig = {
  matchCount: 2,
  trayCapacity: 4,
  boardWidth: 344,
  boardHeight: 568,
  tileWidth: 70,
  tileHeight: 86,
  blockerOverlapX: 34,
  blockerOverlapY: 40,
  boardScaleBase: 1,
  animationMs: {
    matchClear: 280,
    trayEntry: 220,
    modal: 280,
  },
}

interface ThemeBlueprint {
  label: string
  title: string
  glyphKind: string
  badgeFamily: TileTheme['badgeFamily']
  ink: string
  accentInk: string
  shadowGlow: string
  facePattern: string
}

function createTheme(blueprint: ThemeBlueprint): TileTheme {
  return {
    label: blueprint.label,
    title: blueprint.title,
    glyphKind: blueprint.glyphKind,
    badgeFamily: blueprint.badgeFamily,
    ink: blueprint.ink,
    accentInk: blueprint.accentInk,
    shadowGlow: blueprint.shadowGlow,
    facePattern: blueprint.facePattern,
  }
}

const INK_BLUE = '#1f5579'
const INK_GREEN = '#2b8160'
const INK_RED = '#cb4b41'
const INK_BLACK = '#23201d'
const INK_GOLD = '#b8893d'

const GREEN_GLOW = 'rgba(27, 132, 68, 0.26)'
const BLUE_GLOW = 'rgba(24, 86, 130, 0.22)'
const RED_GLOW = 'rgba(184, 63, 54, 0.22)'
const DARK_GLOW = 'rgba(24, 38, 34, 0.22)'

const ANIMAL_PATTERN =
  'linear-gradient(180deg, rgba(255,255,255,0.52) 0 18%, transparent 19%), radial-gradient(circle at 82% 18%, rgba(31,85,121,0.06) 0 16%, transparent 17%)'
const DOT_PATTERN =
  'radial-gradient(circle at 18% 20%, rgba(43,129,96,0.08) 0 14%, transparent 15%), radial-gradient(circle at 82% 82%, rgba(31,85,121,0.06) 0 15%, transparent 16%)'
const BAMBOO_PATTERN =
  'linear-gradient(90deg, transparent 0 20%, rgba(43,129,96,0.07) 21% 24%, transparent 25% 48%, rgba(43,129,96,0.06) 49% 52%, transparent 53%), linear-gradient(180deg, rgba(255,255,255,0.48) 0 16%, transparent 17%)'
const SYMBOL_PATTERN =
  'linear-gradient(135deg, transparent 0 24%, rgba(203,75,65,0.06) 25% 31%, transparent 32% 68%, rgba(43,129,96,0.06) 69% 75%, transparent 76%), radial-gradient(circle at 50% 16%, rgba(255,255,255,0.42) 0 12%, transparent 13%)'

export const TILE_THEMES: Record<TileType, TileTheme> = {
  ember: createTheme({
    label: '犬',
    title: '犬牌',
    glyphKind: 'dog',
    badgeFamily: 'animal',
    ink: INK_BLUE,
    accentInk: INK_GREEN,
    shadowGlow: BLUE_GLOW,
    facePattern: ANIMAL_PATTERN,
  }),
  leaf: createTheme({
    label: '猫',
    title: '猫牌',
    glyphKind: 'cat',
    badgeFamily: 'animal',
    ink: INK_GREEN,
    accentInk: INK_BLUE,
    shadowGlow: GREEN_GLOW,
    facePattern: ANIMAL_PATTERN,
  }),
  bloom: createTheme({
    label: '鱼',
    title: '鱼牌',
    glyphKind: 'fish',
    badgeFamily: 'animal',
    ink: INK_GREEN,
    accentInk: INK_BLUE,
    shadowGlow: GREEN_GLOW,
    facePattern: ANIMAL_PATTERN,
  }),
  bell: createTheme({
    label: '龙',
    title: '龙牌',
    glyphKind: 'dragon',
    badgeFamily: 'animal',
    ink: INK_BLUE,
    accentInk: INK_BLACK,
    shadowGlow: BLUE_GLOW,
    facePattern: ANIMAL_PATTERN,
  }),
  cloud: createTheme({
    label: '鼠',
    title: '鼠牌',
    glyphKind: 'rat',
    badgeFamily: 'animal',
    ink: INK_BLUE,
    accentInk: INK_BLACK,
    shadowGlow: BLUE_GLOW,
    facePattern: ANIMAL_PATTERN,
  }),
  shell: createTheme({
    label: '猴',
    title: '猴牌',
    glyphKind: 'monkey',
    badgeFamily: 'animal',
    ink: INK_RED,
    accentInk: INK_GOLD,
    shadowGlow: RED_GLOW,
    facePattern: ANIMAL_PATTERN,
  }),
  berry: createTheme({
    label: '双环',
    title: '双环牌',
    glyphKind: 'dots-2',
    badgeFamily: 'dots',
    ink: INK_BLUE,
    accentInk: INK_GREEN,
    shadowGlow: GREEN_GLOW,
    facePattern: DOT_PATTERN,
  }),
  pine: createTheme({
    label: '四环',
    title: '四环牌',
    glyphKind: 'dots-4',
    badgeFamily: 'dots',
    ink: INK_BLUE,
    accentInk: INK_RED,
    shadowGlow: BLUE_GLOW,
    facePattern: DOT_PATTERN,
  }),
  wave: createTheme({
    label: '五环',
    title: '五环牌',
    glyphKind: 'dots-5',
    badgeFamily: 'dots',
    ink: INK_BLUE,
    accentInk: INK_GREEN,
    shadowGlow: BLUE_GLOW,
    facePattern: DOT_PATTERN,
  }),
  spire: createTheme({
    label: '六环',
    title: '六环牌',
    glyphKind: 'dots-6',
    badgeFamily: 'dots',
    ink: INK_BLUE,
    accentInk: INK_RED,
    shadowGlow: BLUE_GLOW,
    facePattern: DOT_PATTERN,
  }),
  crown: createTheme({
    label: '二条',
    title: '二条牌',
    glyphKind: 'bamboo-2',
    badgeFamily: 'bamboo',
    ink: INK_GREEN,
    accentInk: INK_RED,
    shadowGlow: GREEN_GLOW,
    facePattern: BAMBOO_PATTERN,
  }),
  mask: createTheme({
    label: '三条',
    title: '三条牌',
    glyphKind: 'bamboo-3',
    badgeFamily: 'bamboo',
    ink: INK_GREEN,
    accentInk: INK_RED,
    shadowGlow: GREEN_GLOW,
    facePattern: BAMBOO_PATTERN,
  }),
  plume: createTheme({
    label: '四条',
    title: '四条牌',
    glyphKind: 'bamboo-4',
    badgeFamily: 'bamboo',
    ink: INK_GREEN,
    accentInk: INK_RED,
    shadowGlow: GREEN_GLOW,
    facePattern: BAMBOO_PATTERN,
  }),
  lantern: createTheme({
    label: '五条',
    title: '五条牌',
    glyphKind: 'bamboo-5',
    badgeFamily: 'bamboo',
    ink: INK_GREEN,
    accentInk: INK_RED,
    shadowGlow: GREEN_GLOW,
    facePattern: BAMBOO_PATTERN,
  }),
  dagger: createTheme({
    label: '东',
    title: '东牌',
    glyphKind: 'east',
    badgeFamily: 'symbol',
    ink: INK_BLACK,
    accentInk: INK_GREEN,
    shadowGlow: DARK_GLOW,
    facePattern: SYMBOL_PATTERN,
  }),
  harp: createTheme({
    label: '南',
    title: '南牌',
    glyphKind: 'south',
    badgeFamily: 'symbol',
    ink: INK_BLACK,
    accentInk: INK_GREEN,
    shadowGlow: DARK_GLOW,
    facePattern: SYMBOL_PATTERN,
  }),
  rose: createTheme({
    label: '红框',
    title: '红框牌',
    glyphKind: 'frame-red',
    badgeFamily: 'symbol',
    ink: INK_RED,
    accentInk: INK_GREEN,
    shadowGlow: RED_GLOW,
    facePattern: SYMBOL_PATTERN,
  }),
  comet: createTheme({
    label: '绿框',
    title: '绿框牌',
    glyphKind: 'frame-green',
    badgeFamily: 'symbol',
    ink: INK_GREEN,
    accentInk: INK_RED,
    shadowGlow: GREEN_GLOW,
    facePattern: SYMBOL_PATTERN,
  }),
  key: createTheme({
    label: '花',
    title: '花牌',
    glyphKind: 'blossom',
    badgeFamily: 'symbol',
    ink: INK_RED,
    accentInk: INK_GREEN,
    shadowGlow: RED_GLOW,
    facePattern: SYMBOL_PATTERN,
  }),
  pearl: createTheme({
    label: '壶',
    title: '壶牌',
    glyphKind: 'gourd',
    badgeFamily: 'symbol',
    ink: INK_BLACK,
    accentInk: INK_GREEN,
    shadowGlow: DARK_GLOW,
    facePattern: SYMBOL_PATTERN,
  }),
}
