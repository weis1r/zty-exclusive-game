import type { ShapeId } from './shapeThemes'

interface TileSlot {
  x: number
  y: number
  layer: number
}

export interface LevelLayoutDefinition {
  slots: TileSlot[]
  boardWidth: number
  boardHeight: number
  openingCount: number
}

interface Point {
  x: number
  y: number
}

interface ShapeProfile {
  blend: number
  warp: (point: Point) => Point
}

const BASE_BOARD_WIDTH = 356
const BASE_BOARD_HEIGHT = 450
const SHELL_SIZE = 36
const OPENING_COUNT = 6
const SOURCE_CENTER_X = 180
const SOURCE_CENTER_Y = 209
const SOURCE_HALF_WIDTH = 130
const SOURCE_HALF_HEIGHT = 179
const TARGET_CENTER_X = SOURCE_CENTER_X
const TARGET_CENTER_Y = SOURCE_CENTER_Y
const TARGET_HALF_WIDTH = SOURCE_HALF_WIDTH
const TARGET_HALF_HEIGHT = SOURCE_HALF_HEIGHT
const SHELL_OFFSETS: Point[] = [
  { x: 0, y: 0 },
  { x: 12, y: 16 },
  { x: -10, y: 30 },
]

const BASE_36_SLOTS: TileSlot[] = [
  { x: 134, y: 30, layer: 3 },
  { x: 210, y: 30, layer: 3 },
  { x: 134, y: 124, layer: 3 },
  { x: 210, y: 124, layer: 3 },
  { x: 134, y: 218, layer: 3 },
  { x: 210, y: 218, layer: 3 },
  { x: 106, y: 68, layer: 2 },
  { x: 182, y: 68, layer: 2 },
  { x: 258, y: 68, layer: 2 },
  { x: 106, y: 162, layer: 2 },
  { x: 182, y: 162, layer: 2 },
  { x: 258, y: 162, layer: 2 },
  { x: 106, y: 256, layer: 2 },
  { x: 182, y: 256, layer: 2 },
  { x: 258, y: 256, layer: 2 },
  { x: 78, y: 106, layer: 1 },
  { x: 154, y: 106, layer: 1 },
  { x: 230, y: 106, layer: 1 },
  { x: 78, y: 200, layer: 1 },
  { x: 154, y: 200, layer: 1 },
  { x: 230, y: 200, layer: 1 },
  { x: 78, y: 294, layer: 1 },
  { x: 154, y: 294, layer: 1 },
  { x: 230, y: 294, layer: 1 },
  { x: 50, y: 144, layer: 0 },
  { x: 126, y: 144, layer: 0 },
  { x: 202, y: 144, layer: 0 },
  { x: 278, y: 144, layer: 0 },
  { x: 50, y: 238, layer: 0 },
  { x: 126, y: 238, layer: 0 },
  { x: 202, y: 238, layer: 0 },
  { x: 278, y: 238, layer: 0 },
  { x: 50, y: 332, layer: 0 },
  { x: 126, y: 332, layer: 0 },
  { x: 202, y: 332, layer: 0 },
  { x: 278, y: 332, layer: 0 },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalize(point: Point) {
  return {
    x: (point.x - SOURCE_CENTER_X) / SOURCE_HALF_WIDTH,
    y: (point.y - SOURCE_CENTER_Y) / SOURCE_HALF_HEIGHT,
  }
}

function denormalize(point: Point): Point {
  return {
    x: Math.round(
      clamp(TARGET_CENTER_X + point.x * TARGET_HALF_WIDTH, 28, BASE_BOARD_WIDTH - 28),
    ),
    y: Math.round(
      clamp(TARGET_CENTER_Y + point.y * TARGET_HALF_HEIGHT, 24, BASE_BOARD_HEIGHT - 32),
    ),
  }
}

function rotate(point: Point, radians: number): Point {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}

function toPolar(point: Point) {
  return {
    radius: Math.hypot(point.x, point.y),
    angle: Math.atan2(point.y, point.x),
  }
}

function blendPoint(source: Point, target: Point, amount: number): Point {
  return {
    x: source.x + (target.x - source.x) * amount,
    y: source.y + (target.y - source.y) * amount,
  }
}

const SHAPE_PROFILES: Record<ShapeId, ShapeProfile> = {
  ring: {
    blend: 0.36,
    warp: (point) => ({
      x: point.x * (1.08 + (1 - Math.abs(point.y)) * 0.18),
      y: point.y * (0.92 + (1 - Math.abs(point.x)) * 0.16),
    }),
  },
  tripod: {
    blend: 0.36,
    warp: (point) => {
      const bottomWeight = (point.y + 1) / 2
      const width = 0.22 + bottomWeight * 0.92

      return {
        x: point.x * width * (Math.abs(point.x) < 0.22 ? 0.45 : 1),
        y: point.y * 0.96 + 0.04,
      }
    },
  },
  boxFrame: {
    blend: 0.3,
    warp: (point) => ({
      x: Math.sign(point.x || 1) * Math.pow(Math.abs(point.x), 0.72),
      y: Math.sign(point.y || 1) * Math.pow(Math.abs(point.y), 0.72) * 0.94,
    }),
  },
  rhombus: {
    blend: 0.38,
    warp: (point) => rotate({ x: point.x * 0.9, y: point.y * 0.9 }, Math.PI / 4),
  },
  ripple: {
    blend: 0.28,
    warp: (point) => ({
      x: point.x + Math.sin(point.y * Math.PI * 1.8) * 0.14,
      y: point.y + Math.sin(point.x * Math.PI) * 0.03,
    }),
  },
  spiral: {
    blend: 0.24,
    warp: (point) => {
      const polar = toPolar(point)
      const radius = 0.2 + polar.radius * 0.74
      const angle = polar.angle + (1.08 - polar.radius) * 0.95

      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    },
  },
  parabola: {
    blend: 0.32,
    warp: (point) => ({
      x: point.x * (0.98 - point.y * 0.04),
      y: point.y * 0.9 + point.x * point.x * 0.24 - 0.03,
    }),
  },
  hourglass: {
    blend: 0.36,
    warp: (point) => ({
      x: point.x * (0.26 + Math.abs(point.y) * 0.96),
      y: point.y,
    }),
  },
  sineBridge: {
    blend: 0.34,
    warp: (point) => ({
      x: point.x,
      y: point.y - Math.cos(point.x * Math.PI) * 0.12 - 0.02,
    }),
  },
  orbit: {
    blend: 0.4,
    warp: (point) => rotate({ x: point.x * 1.08, y: point.y * 0.82 }, 0.32),
  },
  lever: {
    blend: 0.36,
    warp: (point) => ({
      x: point.x * 1.02,
      y: point.y - point.x * 0.34 + 0.04,
    }),
  },
  pulley: {
    blend: 0.32,
    warp: (point) => ({
      x:
        point.y < -0.18
          ? point.x * 0.84
          : point.x * (Math.abs(point.x) < 0.22 ? 1.55 : 0.94),
      y: point.y * 0.92 - 0.08,
    }),
  },
  pendulum: {
    blend: 0.36,
    warp: (point) => ({
      x: point.x + Math.max(point.y, -0.12) * 0.28,
      y: point.y * 1.02,
    }),
  },
  spring: {
    blend: 0.44,
    warp: (point) => ({
      x: point.x + Math.sin(point.y * 5.8) * 0.22,
      y: point.y,
    }),
  },
  incline: {
    blend: 0.34,
    warp: (point) => ({
      x: point.x,
      y: point.y - (point.x + 0.92) * 0.28,
    }),
  },
  lens: {
    blend: 0.3,
    warp: (point) => ({
      x: point.x * (1.18 - point.y * point.y * 0.5),
      y: point.y * 0.96,
    }),
  },
  prism: {
    blend: 0.38,
    warp: (point) => ({
      x: point.x + (point.y < -0.08 ? 0.18 : -0.08),
      y: point.y * 0.92,
    }),
  },
  magnetism: {
    blend: 0.4,
    warp: (point) => ({
      x: point.x + Math.sign(point.x || 1) * (0.16 - point.y * point.y * 0.18),
      y: point.y + Math.sin(point.x * Math.PI) * 0.1,
    }),
  },
  tuningFork: {
    blend: 0.28,
    warp: (point) => ({
      x: point.y < -0.12 ? point.x * 1.18 : point.x * 0.46,
      y: point.y,
    }),
  },
  atom: {
    blend: 0.22,
    warp: (point) => ({
      x: point.x + Math.sin(point.y * 4.6) * 0.16,
      y: point.y + Math.sin(point.x * 4.2) * 0.12,
    }),
  },
}

function createBaseLayout(shapeId: ShapeId): TileSlot[] {
  const profile = SHAPE_PROFILES[shapeId]

  return BASE_36_SLOTS.map((slot) => {
    const normalized = normalize(slot)
    const warped = profile.warp(normalized)
    const blended = blendPoint(normalized, warped, profile.blend)
    const mapped = denormalize(blended)

    return {
      x: mapped.x,
      y: mapped.y,
      layer: slot.layer,
    }
  })
}

function getPartialShellSlots(baseSlots: TileSlot[], partialCount: number) {
  return [...baseSlots]
    .sort((leftSlot, rightSlot) => {
      if (leftSlot.layer !== rightSlot.layer) {
        return leftSlot.layer - rightSlot.layer
      }

      if (leftSlot.y !== rightSlot.y) {
        return leftSlot.y - rightSlot.y
      }

      return leftSlot.x - rightSlot.x
    })
    .slice(0, partialCount)
}

function applyShellOffset(slot: TileSlot, shellIndex: number): TileSlot {
  const offset = SHELL_OFFSETS[shellIndex] ?? {
    x: (shellIndex % 2 === 0 ? -1 : 1) * 10,
    y: shellIndex * 14,
  }

  return {
    x: clamp(slot.x + offset.x, 24, BASE_BOARD_WIDTH - 24),
    y: clamp(slot.y + offset.y, 24, BASE_BOARD_HEIGHT - 24),
    layer: slot.layer + shellIndex * 4,
  }
}

function sortSlotsForPlay(slots: TileSlot[]) {
  return [...slots].sort((leftSlot, rightSlot) => {
    if (leftSlot.layer !== rightSlot.layer) {
      return rightSlot.layer - leftSlot.layer
    }

    if (leftSlot.y !== rightSlot.y) {
      return leftSlot.y - rightSlot.y
    }

    return leftSlot.x - rightSlot.x
  })
}

function createBaseShellDefinition(shapeId: ShapeId): LevelLayoutDefinition {
  return {
    slots: createBaseLayout(shapeId),
    boardWidth: BASE_BOARD_WIDTH,
    boardHeight: BASE_BOARD_HEIGHT,
    openingCount: OPENING_COUNT,
  }
}

export const LEVEL_LAYOUTS: Record<ShapeId, LevelLayoutDefinition> = Object.fromEntries(
  (Object.keys(SHAPE_PROFILES) as ShapeId[]).map((shapeId) => [
    shapeId,
    createBaseShellDefinition(shapeId),
  ]),
) as Record<ShapeId, LevelLayoutDefinition>

export function getLevelLayout(shapeId: ShapeId, tileCount: number): LevelLayoutDefinition {
  if (tileCount <= 0 || tileCount % 2 !== 0) {
    throw new Error(`Invalid tile count ${tileCount} for shape ${shapeId}`)
  }

  const baseLayout = LEVEL_LAYOUTS[shapeId]
  const fullShellCount = Math.floor(tileCount / SHELL_SIZE)
  const partialCount = tileCount % SHELL_SIZE
  const slots: TileSlot[] = []

  for (let shellIndex = 0; shellIndex < fullShellCount; shellIndex += 1) {
    baseLayout.slots.forEach((slot) => {
      slots.push(applyShellOffset(slot, shellIndex))
    })
  }

  if (partialCount > 0) {
    getPartialShellSlots(baseLayout.slots, partialCount).forEach((slot) => {
      slots.push(applyShellOffset(slot, fullShellCount))
    })
  }

  return {
    slots: sortSlotsForPlay(slots),
    boardWidth: baseLayout.boardWidth,
    boardHeight: baseLayout.boardHeight,
    openingCount: baseLayout.openingCount,
  }
}
