import type { CSSProperties } from 'react'
import type { TileTheme } from '../game/types'

interface TilePieceProps {
  theme: TileTheme
  compact?: boolean
  burst?: boolean
  faceDown?: boolean
}

export function TilePiece({
  theme,
  compact = false,
  burst = false,
  faceDown = false,
}: TilePieceProps) {
  return (
    <span
      className={`tile-piece${compact ? ' tile-piece--compact' : ''}${
        burst ? ' tile-piece--burst' : ''
      }${faceDown ? ' tile-piece--face-down' : ''}${
        faceDown && compact ? ' tile-piece--face-down-compact' : ''
      }`}
      style={
        {
          '--piece-accent': faceDown ? '#d6c28b' : theme.accent,
          '--piece-ink': faceDown ? '#f4ebc6' : theme.outline,
          '--piece-shadow': faceDown ? 'rgba(6, 12, 18, 0.38)' : theme.shadow,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {faceDown ? (
        <>
          <span className="tile-piece__back-corner tile-piece__back-corner--tl" />
          <span className="tile-piece__back-corner tile-piece__back-corner--br" />
          <span className="tile-piece__back-core">
            <span className="tile-piece__back-orbit" />
            <span className="tile-piece__back-mark">V</span>
          </span>
        </>
      ) : (
        <>
          <span className="tile-piece__corner tile-piece__corner--tl">{theme.badge}</span>
          <span className="tile-piece__corner tile-piece__corner--br">{theme.badge}</span>
          <span className="tile-piece__glyph">{theme.label}</span>
          <span className="tile-piece__caption">{theme.title.replace('砖', '')}</span>
        </>
      )}
    </span>
  )
}
