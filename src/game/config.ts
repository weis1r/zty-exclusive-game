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
    main: '#ff8738',
    accent: '#fff0ad',
    shadow: 'rgba(190, 72, 0, 0.36)',
    badge: '✦',
    outline: 'rgba(234, 99, 17, 0.9)',
    pattern:
      'radial-gradient(circle at 22% 24%, rgba(255,255,255,0.4) 0 10%, transparent 11%), radial-gradient(circle at 78% 22%, rgba(255,180,81,0.34) 0 15%, transparent 16%), linear-gradient(145deg, transparent 48%, rgba(255,111,35,0.18) 49% 60%, transparent 61%)',
  },
  leaf: {
    label: '叶',
    title: '叶砖',
    main: '#63d73d',
    accent: '#efffba',
    shadow: 'rgba(46, 118, 27, 0.3)',
    badge: '❋',
    outline: 'rgba(62, 163, 23, 0.88)',
    pattern:
      'radial-gradient(circle at 26% 70%, rgba(255,255,255,0.38) 0 12%, transparent 13%), linear-gradient(135deg, transparent 32%, rgba(116,232,93,0.28) 33% 49%, transparent 50%), linear-gradient(45deg, transparent 55%, rgba(58,171,29,0.18) 56% 68%, transparent 69%)',
  },
  bloom: {
    label: '花',
    title: '花砖',
    main: '#ff5ca8',
    accent: '#ffd6eb',
    shadow: 'rgba(177, 38, 109, 0.3)',
    badge: '✿',
    outline: 'rgba(226, 52, 134, 0.88)',
    pattern:
      'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.4) 0 12%, transparent 13%), radial-gradient(circle at 24% 62%, rgba(255,184,226,0.28) 0 15%, transparent 16%), radial-gradient(circle at 76% 64%, rgba(255,144,197,0.22) 0 14%, transparent 15%), linear-gradient(180deg, transparent 66%, rgba(255,85,168,0.14) 67% 100%)',
  },
  bell: {
    label: '铃',
    title: '铃砖',
    main: '#ffd44d',
    accent: '#fff4b1',
    shadow: 'rgba(181, 124, 0, 0.32)',
    badge: '✶',
    outline: 'rgba(227, 173, 0, 0.9)',
    pattern:
      'radial-gradient(circle at 70% 24%, rgba(255,255,255,0.44) 0 11%, transparent 12%), linear-gradient(180deg, rgba(255,228,110,0.3) 0 36%, transparent 37%), linear-gradient(45deg, transparent 48%, rgba(255,193,0,0.18) 49% 58%, transparent 59%)',
  },
  cloud: {
    label: '云',
    title: '云砖',
    main: '#6a8fff',
    accent: '#e5ecff',
    shadow: 'rgba(46, 82, 182, 0.32)',
    badge: '☁',
    outline: 'rgba(75, 110, 239, 0.88)',
    pattern:
      'radial-gradient(circle at 32% 32%, rgba(255,255,255,0.46) 0 14%, transparent 15%), radial-gradient(circle at 68% 36%, rgba(198,220,255,0.26) 0 16%, transparent 17%), linear-gradient(135deg, transparent 58%, rgba(94,126,255,0.16) 59% 100%)',
  },
  shell: {
    label: '贝',
    title: '贝砖',
    main: '#35d3b6',
    accent: '#ddfff4',
    shadow: 'rgba(0, 123, 99, 0.28)',
    badge: '◔',
    outline: 'rgba(0, 171, 143, 0.86)',
    pattern:
      'linear-gradient(135deg, transparent 24%, rgba(170,245,231,0.34) 25% 35%, transparent 36%), linear-gradient(45deg, transparent 42%, rgba(255,255,255,0.3) 43% 52%, transparent 53%), radial-gradient(circle at 76% 70%, rgba(49,197,171,0.18) 0 17%, transparent 18%)',
  },
  berry: {
    label: '果',
    title: '果砖',
    main: '#955bff',
    accent: '#eedbff',
    shadow: 'rgba(93, 43, 173, 0.3)',
    badge: '◆',
    outline: 'rgba(114, 47, 232, 0.88)',
    pattern:
      'radial-gradient(circle at 28% 68%, rgba(255,255,255,0.38) 0 13%, transparent 14%), radial-gradient(circle at 70% 36%, rgba(215,170,255,0.28) 0 16%, transparent 17%), linear-gradient(180deg, transparent 62%, rgba(129,73,255,0.18) 63% 100%)',
  },
  pine: {
    label: '松',
    title: '松砖',
    main: '#199564',
    accent: '#daf6d1',
    shadow: 'rgba(18, 93, 61, 0.34)',
    badge: '▲',
    outline: 'rgba(12, 124, 78, 0.88)',
    pattern:
      'linear-gradient(180deg, rgba(255,255,255,0.28) 0 22%, transparent 23%), linear-gradient(135deg, transparent 32%, rgba(118,222,143,0.24) 33% 46%, transparent 47%), linear-gradient(45deg, transparent 56%, rgba(20,122,71,0.18) 57% 68%, transparent 69%)',
  },
  wave: {
    label: '潮',
    title: '潮砖',
    main: '#1bd5ff',
    accent: '#cffbff',
    shadow: 'rgba(0, 132, 166, 0.3)',
    badge: '≈',
    outline: 'rgba(0, 173, 209, 0.86)',
    pattern:
      'linear-gradient(180deg, rgba(255,255,255,0.28) 0 18%, transparent 19%), radial-gradient(circle at 68% 72%, rgba(187,247,255,0.34) 0 16%, transparent 17%), linear-gradient(135deg, transparent 48%, rgba(0,191,224,0.16) 49% 60%, transparent 61%)',
  },
}
