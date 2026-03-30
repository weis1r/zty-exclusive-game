import type { GameConfig, TileTheme, TileType } from './types'

export const GAME_CONFIG: GameConfig = {
  matchCount: 2,
  trayCapacity: 4,
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
    main: '#ff9d4d',
    accent: '#ffe0a5',
    shadow: 'rgba(200, 95, 22, 0.34)',
    badge: '✦',
    outline: 'rgba(255, 142, 43, 0.72)',
    pattern:
      'radial-gradient(circle at 20% 22%, rgba(255,255,255,0.45) 0 12%, transparent 13%), radial-gradient(circle at 76% 26%, rgba(255,151,74,0.35) 0 16%, transparent 17%)',
  },
  leaf: {
    label: '叶',
    title: '叶砖',
    main: '#5fd282',
    accent: '#dcffd7',
    shadow: 'rgba(49, 135, 73, 0.28)',
    badge: '❋',
    outline: 'rgba(70, 198, 111, 0.7)',
    pattern:
      'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.4) 0 12%, transparent 13%), linear-gradient(135deg, transparent 35%, rgba(114,212,129,0.26) 36% 52%, transparent 53%)',
  },
  bloom: {
    label: '花',
    title: '花砖',
    main: '#ff8fba',
    accent: '#ffe0f1',
    shadow: 'rgba(196, 72, 130, 0.28)',
    badge: '✿',
    outline: 'rgba(255, 127, 186, 0.72)',
    pattern:
      'radial-gradient(circle at 50% 28%, rgba(255,255,255,0.4) 0 14%, transparent 15%), radial-gradient(circle at 22% 60%, rgba(255,184,214,0.3) 0 16%, transparent 17%), radial-gradient(circle at 78% 64%, rgba(255,184,214,0.28) 0 14%, transparent 15%)',
  },
  bell: {
    label: '铃',
    title: '铃砖',
    main: '#ffcb56',
    accent: '#fff1ba',
    shadow: 'rgba(191, 143, 29, 0.28)',
    badge: '✶',
    outline: 'rgba(255, 200, 76, 0.72)',
    pattern:
      'radial-gradient(circle at 70% 24%, rgba(255,255,255,0.42) 0 11%, transparent 12%), linear-gradient(180deg, rgba(255,222,120,0.26) 0 38%, transparent 39%)',
  },
  cloud: {
    label: '云',
    title: '云砖',
    main: '#73b8ff',
    accent: '#e6f3ff',
    shadow: 'rgba(59, 118, 202, 0.28)',
    badge: '☁',
    outline: 'rgba(95, 185, 255, 0.72)',
    pattern:
      'radial-gradient(circle at 32% 32%, rgba(255,255,255,0.45) 0 14%, transparent 15%), radial-gradient(circle at 66% 34%, rgba(204,232,255,0.3) 0 18%, transparent 19%)',
  },
  shell: {
    label: '贝',
    title: '贝砖',
    main: '#8fddd1',
    accent: '#e6fff7',
    shadow: 'rgba(44, 129, 121, 0.28)',
    badge: '◔',
    outline: 'rgba(106, 224, 206, 0.72)',
    pattern:
      'linear-gradient(135deg, transparent 24%, rgba(170,245,231,0.32) 25% 35%, transparent 36%), linear-gradient(45deg, transparent 42%, rgba(255,255,255,0.32) 43% 53%, transparent 54%)',
  },
  berry: {
    label: '果',
    title: '果砖',
    main: '#d98cff',
    accent: '#f8e0ff',
    shadow: 'rgba(131, 64, 156, 0.28)',
    badge: '◆',
    outline: 'rgba(214, 128, 255, 0.72)',
    pattern:
      'radial-gradient(circle at 28% 68%, rgba(255,255,255,0.38) 0 13%, transparent 14%), radial-gradient(circle at 70% 36%, rgba(230,173,255,0.3) 0 16%, transparent 17%)',
  },
  pine: {
    label: '松',
    title: '松砖',
    main: '#67c49b',
    accent: '#e0fbe9',
    shadow: 'rgba(53, 123, 91, 0.28)',
    badge: '▲',
    outline: 'rgba(81, 209, 152, 0.72)',
    pattern:
      'linear-gradient(180deg, rgba(255,255,255,0.3) 0 24%, transparent 25%), linear-gradient(135deg, transparent 34%, rgba(129,232,171,0.28) 35% 48%, transparent 49%)',
  },
  wave: {
    label: '潮',
    title: '潮砖',
    main: '#4ecce6',
    accent: '#d7faff',
    shadow: 'rgba(34, 128, 150, 0.28)',
    badge: '≈',
    outline: 'rgba(67, 211, 239, 0.72)',
    pattern:
      'linear-gradient(180deg, rgba(255,255,255,0.26) 0 18%, transparent 19%), radial-gradient(circle at 68% 72%, rgba(187,247,255,0.34) 0 16%, transparent 17%)',
  },
}
