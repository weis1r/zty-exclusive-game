import type { GameConfig, TileTheme, TileType } from './types'

export const GAME_CONFIG: GameConfig = {
  matchCount: 3,
  trayCapacity: 7,
  boardWidth: 360,
  boardHeight: 520,
  tileWidth: 76,
  tileHeight: 92,
  blockerOverlapX: 52,
  blockerOverlapY: 56,
  boardScaleBase: 1,
  animationMs: {
    matchClear: 280,
    trayEntry: 220,
    modal: 280,
  },
}

export const TILE_THEMES: Record<TileType, TileTheme> = {
  ember: {
    label: '焰',
    title: '焰砖',
    main: '#f8ab55',
    accent: '#ffe4ba',
    shadow: 'rgba(192, 93, 24, 0.28)',
  },
  leaf: {
    label: '叶',
    title: '叶砖',
    main: '#7fc98a',
    accent: '#e3f7d8',
    shadow: 'rgba(57, 120, 61, 0.24)',
  },
  bloom: {
    label: '花',
    title: '花砖',
    main: '#f099ad',
    accent: '#ffe0ea',
    shadow: 'rgba(180, 70, 104, 0.24)',
  },
  bell: {
    label: '铃',
    title: '铃砖',
    main: '#f1c45f',
    accent: '#fff0bf',
    shadow: 'rgba(187, 132, 29, 0.22)',
  },
  cloud: {
    label: '云',
    title: '云砖',
    main: '#8db6f0',
    accent: '#e7f1ff',
    shadow: 'rgba(57, 106, 178, 0.22)',
  },
  shell: {
    label: '贝',
    title: '贝砖',
    main: '#9bd3c8',
    accent: '#e2fff8',
    shadow: 'rgba(42, 116, 103, 0.24)',
  },
  berry: {
    label: '果',
    title: '果砖',
    main: '#d789d2',
    accent: '#fce3ff',
    shadow: 'rgba(127, 63, 132, 0.26)',
  },
  pine: {
    label: '松',
    title: '松砖',
    main: '#84c1a8',
    accent: '#e4f8eb',
    shadow: 'rgba(55, 110, 86, 0.22)',
  },
  wave: {
    label: '潮',
    title: '潮砖',
    main: '#65c1d6',
    accent: '#daf8ff',
    shadow: 'rgba(33, 110, 130, 0.24)',
  },
}
