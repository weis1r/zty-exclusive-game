import type { GameConfig, TileTheme, TileType } from './types'

export const GAME_CONFIG: GameConfig = {
  matchCount: 3,
  trayCapacity: 7,
  momentumChargeTarget: 3,
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
    main: '#ff7a24',
    accent: '#ffe28e',
    shadow: 'rgba(186, 70, 0, 0.34)',
    badge: '✦',
    outline: 'rgba(221, 77, 0, 0.92)',
    pattern:
      'radial-gradient(circle at 22% 24%, rgba(255,255,255,0.42) 0 10%, transparent 11%), radial-gradient(circle at 78% 22%, rgba(255,190,82,0.36) 0 15%, transparent 16%), linear-gradient(145deg, transparent 48%, rgba(255,111,35,0.22) 49% 60%, transparent 61%)',
  },
  leaf: {
    label: '叶',
    title: '叶砖',
    main: '#56c92b',
    accent: '#ebff9f',
    shadow: 'rgba(37, 117, 20, 0.32)',
    badge: '❋',
    outline: 'rgba(45, 149, 15, 0.9)',
    pattern:
      'radial-gradient(circle at 26% 70%, rgba(255,255,255,0.4) 0 12%, transparent 13%), linear-gradient(135deg, transparent 32%, rgba(131,238,92,0.32) 33% 49%, transparent 50%), linear-gradient(45deg, transparent 55%, rgba(39,154,25,0.22) 57% 68%, transparent 69%)',
  },
  bloom: {
    label: '花',
    title: '花砖',
    main: '#ff4e97',
    accent: '#ffe0ef',
    shadow: 'rgba(175, 33, 101, 0.32)',
    badge: '✿',
    outline: 'rgba(223, 44, 125, 0.9)',
    pattern:
      'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.44) 0 12%, transparent 13%), radial-gradient(circle at 24% 62%, rgba(255,184,226,0.34) 0 15%, transparent 16%), radial-gradient(circle at 76% 64%, rgba(255,144,197,0.28) 0 14%, transparent 15%), linear-gradient(180deg, transparent 66%, rgba(255,85,168,0.18) 67% 100%)',
  },
  bell: {
    label: '铃',
    title: '铃砖',
    main: '#f6c514',
    accent: '#fff2a3',
    shadow: 'rgba(169, 119, 0, 0.32)',
    badge: '✶',
    outline: 'rgba(214, 155, 0, 0.92)',
    pattern:
      'radial-gradient(circle at 70% 24%, rgba(255,255,255,0.46) 0 11%, transparent 12%), linear-gradient(180deg, rgba(255,228,110,0.34) 0 36%, transparent 37%), linear-gradient(45deg, transparent 48%, rgba(255,193,0,0.22) 49% 58%, transparent 59%)',
  },
  cloud: {
    label: '云',
    title: '云砖',
    main: '#5577ff',
    accent: '#e2e9ff',
    shadow: 'rgba(42, 68, 182, 0.34)',
    badge: '☁',
    outline: 'rgba(65, 96, 234, 0.92)',
    pattern:
      'radial-gradient(circle at 32% 32%, rgba(255,255,255,0.48) 0 14%, transparent 15%), radial-gradient(circle at 68% 36%, rgba(198,220,255,0.32) 0 16%, transparent 17%), linear-gradient(135deg, transparent 58%, rgba(94,126,255,0.22) 59% 100%)',
  },
  shell: {
    label: '贝',
    title: '贝砖',
    main: '#17c4a8',
    accent: '#dcfff6',
    shadow: 'rgba(0, 114, 97, 0.3)',
    badge: '◔',
    outline: 'rgba(0, 166, 140, 0.9)',
    pattern:
      'linear-gradient(135deg, transparent 24%, rgba(170,245,231,0.38) 25% 35%, transparent 36%), linear-gradient(45deg, transparent 42%, rgba(255,255,255,0.32) 43% 52%, transparent 53%), radial-gradient(circle at 76% 70%, rgba(49,197,171,0.22) 0 17%, transparent 18%)',
  },
  berry: {
    label: '果',
    title: '果砖',
    main: '#9b4dff',
    accent: '#f1ddff',
    shadow: 'rgba(88, 36, 176, 0.32)',
    badge: '◆',
    outline: 'rgba(108, 39, 230, 0.9)',
    pattern:
      'radial-gradient(circle at 28% 68%, rgba(255,255,255,0.4) 0 13%, transparent 14%), radial-gradient(circle at 70% 36%, rgba(215,170,255,0.34) 0 16%, transparent 17%), linear-gradient(180deg, transparent 62%, rgba(129,73,255,0.22) 63% 100%)',
  },
  pine: {
    label: '松',
    title: '松砖',
    main: '#0f8a4f',
    accent: '#d4f4cb',
    shadow: 'rgba(12, 84, 55, 0.34)',
    badge: '▲',
    outline: 'rgba(11, 118, 70, 0.9)',
    pattern:
      'linear-gradient(180deg, rgba(255,255,255,0.3) 0 22%, transparent 23%), linear-gradient(135deg, transparent 32%, rgba(118,222,143,0.28) 33% 46%, transparent 47%), linear-gradient(45deg, transparent 56%, rgba(20,122,71,0.22) 57% 68%, transparent 69%)',
  },
  wave: {
    label: '潮',
    title: '潮砖',
    main: '#00cdea',
    accent: '#c6fbff',
    shadow: 'rgba(0, 126, 164, 0.32)',
    badge: '≈',
    outline: 'rgba(0, 164, 205, 0.9)',
    pattern:
      'linear-gradient(180deg, rgba(255,255,255,0.3) 0 18%, transparent 19%), radial-gradient(circle at 68% 72%, rgba(187,247,255,0.38) 0 16%, transparent 17%), linear-gradient(135deg, transparent 48%, rgba(0,191,224,0.22) 49% 60%, transparent 61%)',
  },
}
