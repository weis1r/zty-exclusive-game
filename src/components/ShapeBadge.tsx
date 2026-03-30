import type { CSSProperties } from 'react'
import { getShapeTheme } from '../game/shapeThemes'

interface ShapeBadgeProps {
  shapeId?: string | null
  shapeLabel?: string | null
  className?: string
  showLabel?: boolean
}

export function ShapeBadge({
  shapeId,
  shapeLabel,
  className = '',
  showLabel = true,
}: ShapeBadgeProps) {
  const shapeTheme = getShapeTheme(shapeId)
  const label = shapeLabel ?? shapeTheme.label

  return (
    <span
      className={`shape-badge${className ? ` ${className}` : ''}`}
      style={
        {
          '--shape-accent': shapeTheme.accent,
          '--shape-ink': shapeTheme.ink,
          '--shape-glow': shapeTheme.glow,
        } as CSSProperties
      }
    >
      <span className="shape-badge__glyph" aria-hidden="true">
        {shapeTheme.badge}
      </span>
      {showLabel ? <span className="shape-badge__label">{label}</span> : null}
    </span>
  )
}
