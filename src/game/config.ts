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
  title: string
  glyphKind: TileType
  ink: string
  accentInk: string
  detailInk: string
  outline: string
  shadowGlow: string
  facePattern: string
  badgeShape: TileTheme['badgeShape']
  badgeInk: string
}

function createTheme(blueprint: ThemeBlueprint): TileTheme {
  return {
    title: blueprint.title,
    glyphKind: blueprint.glyphKind,
    ink: blueprint.ink,
    accentInk: blueprint.accentInk,
    detailInk: blueprint.detailInk,
    outline: blueprint.outline,
    shadowGlow: blueprint.shadowGlow,
    facePattern: blueprint.facePattern,
    badgeShape: blueprint.badgeShape,
    badgeInk: blueprint.badgeInk,
  }
}

const OUTLINE_DARK = '#35514c'
const OUTLINE_SOFT = '#4b645f'

const GREEN_GLOW = 'rgba(30, 109, 79, 0.22)'
const BLUE_GLOW = 'rgba(43, 96, 122, 0.22)'
const WARM_GLOW = 'rgba(161, 107, 58, 0.22)'
const PLUM_GLOW = 'rgba(94, 73, 122, 0.2)'
const GOLD_GLOW = 'rgba(186, 144, 74, 0.2)'

const ORGANIC_PATTERN =
  'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.36) 0 10%, transparent 11%), radial-gradient(circle at 78% 82%, rgba(53,81,76,0.06) 0 14%, transparent 15%), linear-gradient(180deg, rgba(255,255,255,0.18), transparent 20%)'
const PETAL_PATTERN =
  'radial-gradient(circle at 22% 20%, rgba(255,255,255,0.26) 0 10%, transparent 11%), radial-gradient(circle at 68% 34%, rgba(182,101,114,0.08) 0 14%, transparent 15%), radial-gradient(circle at 38% 78%, rgba(91,121,104,0.08) 0 12%, transparent 13%)'
const CELESTIAL_PATTERN =
  'radial-gradient(circle at 24% 18%, rgba(255,255,255,0.34) 0 9%, transparent 10%), radial-gradient(circle at 78% 28%, rgba(71,104,146,0.08) 0 14%, transparent 15%), radial-gradient(circle at 28% 78%, rgba(71,104,146,0.05) 0 12%, transparent 13%)'
const RELIC_PATTERN =
  'linear-gradient(135deg, transparent 0 22%, rgba(90,72,45,0.06) 23% 30%, transparent 31% 69%, rgba(90,72,45,0.06) 70% 77%, transparent 78%), linear-gradient(180deg, rgba(255,255,255,0.16), transparent 20%)'
const WATER_PATTERN =
  'repeating-linear-gradient(135deg, rgba(62,114,130,0.06) 0 7px, transparent 7px 16px), linear-gradient(180deg, rgba(255,255,255,0.16), transparent 18%)'

export const TILE_THEMES: Record<TileType, TileTheme> = {
  ember: createTheme({
    title: '火焰图砖',
    glyphKind: 'ember',
    ink: '#b45f3f',
    accentInk: '#f0c272',
    detailInk: '#763a2a',
    outline: OUTLINE_DARK,
    shadowGlow: WARM_GLOW,
    facePattern: ORGANIC_PATTERN,
    badgeShape: 'spark',
    badgeInk: '#e8b55a',
  }),
  leaf: createTheme({
    title: '叶片图砖',
    glyphKind: 'leaf',
    ink: '#4c7b5b',
    accentInk: '#bed58e',
    detailInk: '#31533d',
    outline: OUTLINE_DARK,
    shadowGlow: GREEN_GLOW,
    facePattern: ORGANIC_PATTERN,
    badgeShape: 'leaf',
    badgeInk: '#7aa866',
  }),
  bloom: createTheme({
    title: '花朵图砖',
    glyphKind: 'bloom',
    ink: '#b56674',
    accentInk: '#e8c57f',
    detailInk: '#7d4356',
    outline: OUTLINE_SOFT,
    shadowGlow: WARM_GLOW,
    facePattern: PETAL_PATTERN,
    badgeShape: 'petal',
    badgeInk: '#d68797',
  }),
  bell: createTheme({
    title: '铃铛图砖',
    glyphKind: 'bell',
    ink: '#8c7444',
    accentInk: '#e7c36f',
    detailInk: '#584928',
    outline: OUTLINE_DARK,
    shadowGlow: GOLD_GLOW,
    facePattern: RELIC_PATTERN,
    badgeShape: 'crest',
    badgeInk: '#c49a4d',
  }),
  cloud: createTheme({
    title: '云滴图砖',
    glyphKind: 'cloud',
    ink: '#4d7c8d',
    accentInk: '#dce9e6',
    detailInk: '#305361',
    outline: OUTLINE_SOFT,
    shadowGlow: BLUE_GLOW,
    facePattern: WATER_PATTERN,
    badgeShape: 'gem',
    badgeInk: '#8fbfcc',
  }),
  shell: createTheme({
    title: '贝壳图砖',
    glyphKind: 'shell',
    ink: '#8b755b',
    accentInk: '#e5cfab',
    detailInk: '#5d4937',
    outline: OUTLINE_DARK,
    shadowGlow: WARM_GLOW,
    facePattern: RELIC_PATTERN,
    badgeShape: 'crest',
    badgeInk: '#c8ab80',
  }),
  berry: createTheme({
    title: '星莓图砖',
    glyphKind: 'berry',
    ink: '#705e9d',
    accentInk: '#d7beff',
    detailInk: '#493e71',
    outline: OUTLINE_SOFT,
    shadowGlow: PLUM_GLOW,
    facePattern: CELESTIAL_PATTERN,
    badgeShape: 'spark',
    badgeInk: '#aa8de3',
  }),
  pine: createTheme({
    title: '松果图砖',
    glyphKind: 'pine',
    ink: '#557455',
    accentInk: '#d39e58',
    detailInk: '#33523b',
    outline: OUTLINE_DARK,
    shadowGlow: GREEN_GLOW,
    facePattern: ORGANIC_PATTERN,
    badgeShape: 'leaf',
    badgeInk: '#8daa65',
  }),
  wave: createTheme({
    title: '波纹图砖',
    glyphKind: 'wave',
    ink: '#356f88',
    accentInk: '#93d1dc',
    detailInk: '#214a5f',
    outline: OUTLINE_SOFT,
    shadowGlow: BLUE_GLOW,
    facePattern: WATER_PATTERN,
    badgeShape: 'gem',
    badgeInk: '#70b2c0',
  }),
  spire: createTheme({
    title: '水晶图砖',
    glyphKind: 'spire',
    ink: '#6a80b5',
    accentInk: '#d4e6ff',
    detailInk: '#48598f',
    outline: OUTLINE_SOFT,
    shadowGlow: BLUE_GLOW,
    facePattern: CELESTIAL_PATTERN,
    badgeShape: 'gem',
    badgeInk: '#9cb3ea',
  }),
  crown: createTheme({
    title: '皇冠图砖',
    glyphKind: 'crown',
    ink: '#8f7545',
    accentInk: '#ffd678',
    detailInk: '#594526',
    outline: OUTLINE_DARK,
    shadowGlow: GOLD_GLOW,
    facePattern: RELIC_PATTERN,
    badgeShape: 'crest',
    badgeInk: '#d0a652',
  }),
  mask: createTheme({
    title: '面具图砖',
    glyphKind: 'mask',
    ink: '#6c576e',
    accentInk: '#f1c26e',
    detailInk: '#463549',
    outline: OUTLINE_SOFT,
    shadowGlow: PLUM_GLOW,
    facePattern: PETAL_PATTERN,
    badgeShape: 'petal',
    badgeInk: '#ae7ab3',
  }),
  plume: createTheme({
    title: '羽毛图砖',
    glyphKind: 'plume',
    ink: '#62828d',
    accentInk: '#efe2c8',
    detailInk: '#415761',
    outline: OUTLINE_SOFT,
    shadowGlow: BLUE_GLOW,
    facePattern: CELESTIAL_PATTERN,
    badgeShape: 'leaf',
    badgeInk: '#9cc2cb',
  }),
  lantern: createTheme({
    title: '灯笼图砖',
    glyphKind: 'lantern',
    ink: '#bb6145',
    accentInk: '#ffd793',
    detailInk: '#80412f',
    outline: OUTLINE_DARK,
    shadowGlow: WARM_GLOW,
    facePattern: PETAL_PATTERN,
    badgeShape: 'crest',
    badgeInk: '#e69b6c',
  }),
  dagger: createTheme({
    title: '匙刃图砖',
    glyphKind: 'dagger',
    ink: '#4f6b79',
    accentInk: '#c5d7e2',
    detailInk: '#2f4550',
    outline: OUTLINE_SOFT,
    shadowGlow: BLUE_GLOW,
    facePattern: RELIC_PATTERN,
    badgeShape: 'gem',
    badgeInk: '#88a7b8',
  }),
  harp: createTheme({
    title: '竖琴图砖',
    glyphKind: 'harp',
    ink: '#8b6997',
    accentInk: '#ead4a0',
    detailInk: '#60496c',
    outline: OUTLINE_SOFT,
    shadowGlow: PLUM_GLOW,
    facePattern: CELESTIAL_PATTERN,
    badgeShape: 'crest',
    badgeInk: '#b18ac3',
  }),
  rose: createTheme({
    title: '玫瑰图砖',
    glyphKind: 'rose',
    ink: '#af5965',
    accentInk: '#f5c39e',
    detailInk: '#793844',
    outline: OUTLINE_SOFT,
    shadowGlow: WARM_GLOW,
    facePattern: PETAL_PATTERN,
    badgeShape: 'petal',
    badgeInk: '#d5868f',
  }),
  comet: createTheme({
    title: '彗星图砖',
    glyphKind: 'comet',
    ink: '#4c8192',
    accentInk: '#f2c87b',
    detailInk: '#2e5966',
    outline: OUTLINE_SOFT,
    shadowGlow: BLUE_GLOW,
    facePattern: CELESTIAL_PATTERN,
    badgeShape: 'spark',
    badgeInk: '#85c2cc',
  }),
  key: createTheme({
    title: '齿轮图砖',
    glyphKind: 'key',
    ink: '#63725e',
    accentInk: '#cfe0a0',
    detailInk: '#414f42',
    outline: OUTLINE_DARK,
    shadowGlow: GREEN_GLOW,
    facePattern: RELIC_PATTERN,
    badgeShape: 'crest',
    badgeInk: '#9db36f',
  }),
  pearl: createTheme({
    title: '药瓶图砖',
    glyphKind: 'pearl',
    ink: '#6f7189',
    accentInk: '#e2e7f0',
    detailInk: '#4b4f63',
    outline: OUTLINE_SOFT,
    shadowGlow: PLUM_GLOW,
    facePattern: WATER_PATTERN,
    badgeShape: 'gem',
    badgeInk: '#a5adc1',
  }),
}
