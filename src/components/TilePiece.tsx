import type { CSSProperties } from 'react'
import type { TileTheme } from '../game/types'

interface TilePieceProps {
  theme: TileTheme
  compact?: boolean
  burst?: boolean
}

export function TilePiece({ theme, compact = false, burst = false }: TilePieceProps) {
  return (
    <span
      className={`tile-piece${compact ? ' tile-piece--compact' : ''}${
        burst ? ' tile-piece--burst' : ''
      }`}
      style={
        {
          '--piece-accent': theme.accent,
          '--piece-ink': theme.outline,
          '--piece-shadow': theme.shadow,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span className="tile-piece__corner tile-piece__corner--tl">{theme.badge}</span>
      <span className="tile-piece__corner tile-piece__corner--br">{theme.badge}</span>
      <span className="tile-piece__glyph">{theme.label}</span>
      <span className="tile-piece__caption">{theme.title.replace('砖', '')}</span>
    </span>
  )
}
