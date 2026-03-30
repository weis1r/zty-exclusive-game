export const SHAPE_THEMES = {
  ring: {
    label: '圆环',
    badge: '◎',
    accent: '#f0d57a',
    ink: '#6d4c0a',
    glow: 'rgba(240, 213, 122, 0.34)',
  },
  tripod: {
    label: '三角架',
    badge: '△',
    accent: '#ffbc6b',
    ink: '#7a360f',
    glow: 'rgba(255, 188, 107, 0.34)',
  },
  boxFrame: {
    label: '方匣框',
    badge: '□',
    accent: '#f7da93',
    ink: '#6f4f17',
    glow: 'rgba(247, 218, 147, 0.3)',
  },
  rhombus: {
    label: '菱镜',
    badge: '◇',
    accent: '#f9b1c8',
    ink: '#8a3155',
    glow: 'rgba(249, 177, 200, 0.34)',
  },
  ripple: {
    label: '波纹',
    badge: '≈',
    accent: '#6fe3d5',
    ink: '#0c6d61',
    glow: 'rgba(111, 227, 213, 0.32)',
  },
  spiral: {
    label: '螺旋',
    badge: '↺',
    accent: '#94d3ff',
    ink: '#0d5a88',
    glow: 'rgba(148, 211, 255, 0.32)',
  },
  parabola: {
    label: '抛物拱',
    badge: '∩',
    accent: '#ffc982',
    ink: '#7c4911',
    glow: 'rgba(255, 201, 130, 0.34)',
  },
  hourglass: {
    label: '沙漏',
    badge: '⌛',
    accent: '#f1c0a4',
    ink: '#874023',
    glow: 'rgba(241, 192, 164, 0.32)',
  },
  sineBridge: {
    label: '正弦桥',
    badge: '∿',
    accent: '#8ed8ff',
    ink: '#225f90',
    glow: 'rgba(142, 216, 255, 0.32)',
  },
  orbit: {
    label: '轨道环',
    badge: '⊙',
    accent: '#b9b0ff',
    ink: '#46369a',
    glow: 'rgba(185, 176, 255, 0.34)',
  },
  lever: {
    label: '杠杆',
    badge: '⊢',
    accent: '#f0cb74',
    ink: '#6d5410',
    glow: 'rgba(240, 203, 116, 0.34)',
  },
  pulley: {
    label: '滑轮',
    badge: '⚙',
    accent: '#a7d9ff',
    ink: '#275a7f',
    glow: 'rgba(167, 217, 255, 0.32)',
  },
  pendulum: {
    label: '单摆',
    badge: '◔',
    accent: '#ffb7a6',
    ink: '#84351c',
    glow: 'rgba(255, 183, 166, 0.32)',
  },
  spring: {
    label: '弹簧',
    badge: '∿∿',
    accent: '#90f0a9',
    ink: '#1c7436',
    glow: 'rgba(144, 240, 169, 0.3)',
  },
  incline: {
    label: '斜面',
    badge: '◢',
    accent: '#ffd98d',
    ink: '#7a4d11',
    glow: 'rgba(255, 217, 141, 0.34)',
  },
  lens: {
    label: '透镜',
    badge: '◍',
    accent: '#95f0ed',
    ink: '#126a66',
    glow: 'rgba(149, 240, 237, 0.32)',
  },
  prism: {
    label: '棱镜',
    badge: '△',
    accent: '#d9b3ff',
    ink: '#6f32a0',
    glow: 'rgba(217, 179, 255, 0.34)',
  },
  magnetism: {
    label: '磁场',
    badge: '⇋',
    accent: '#ff9a9a',
    ink: '#8a2626',
    glow: 'rgba(255, 154, 154, 0.32)',
  },
  tuningFork: {
    label: '音叉',
    badge: 'Ψ',
    accent: '#a2b7ff',
    ink: '#394f96',
    glow: 'rgba(162, 183, 255, 0.32)',
  },
  atom: {
    label: '原子轨道',
    badge: '⚛',
    accent: '#afe6ff',
    ink: '#14577f',
    glow: 'rgba(175, 230, 255, 0.34)',
  },
} as const

export type ShapeId = keyof typeof SHAPE_THEMES

const FALLBACK_SHAPE = SHAPE_THEMES.ring

export function getShapeTheme(shapeId: string | null | undefined) {
  if (!shapeId) {
    return FALLBACK_SHAPE
  }

  return SHAPE_THEMES[shapeId as ShapeId] ?? FALLBACK_SHAPE
}
