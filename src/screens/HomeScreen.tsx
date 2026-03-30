import type { LevelDefinition } from '../game/types'
import { ShapeBadge } from '../components/ShapeBadge'

interface HomeScreenProps {
  currentLevel: LevelDefinition
  soundEnabled: boolean
  settingsOpen: boolean
  onToggleSettings: () => void
  onToggleSound: () => void
  onResetProgress: () => void
  onStart: () => void
}

export function HomeScreen({
  currentLevel,
  soundEnabled,
  settingsOpen,
  onToggleSettings,
  onToggleSound,
  onResetProgress,
  onStart,
}: HomeScreenProps) {
  const levelOrder = currentLevel.campaign?.order ?? 1
  const shapeId = currentLevel.campaign?.shapeId
  const shapeLabel = currentLevel.campaign?.shapeLabel
  const tileCount = currentLevel.campaign?.tileCount ?? currentLevel.tiles.length
  const chapterRuleLabel = currentLevel.campaign?.chapterRuleLabel ?? '基础堆叠'

  return (
    <section className="home-screen" data-testid="home-screen">
      <div className="home-screen__lantern home-screen__lantern--left" aria-hidden="true" />
      <div className="home-screen__lantern home-screen__lantern--right" aria-hidden="true" />

      <header className="home-screen__topbar">
        <div className="home-screen__actions">
          <button
            type="button"
            className="icon-button icon-button--wood"
            data-testid="home-settings-button"
            aria-label="打开设置"
            aria-expanded={settingsOpen}
            onClick={onToggleSettings}
          >
            <span className="icon-button__glyph">⚙</span>
          </button>
          {settingsOpen ? (
            <div className="settings-popover">
              <button type="button" className="settings-popover__action" onClick={onToggleSound}>
                音效 {soundEnabled ? '开' : '关'}
              </button>
              <button type="button" className="settings-popover__action" onClick={onResetProgress}>
                重置进度
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="home-screen__logo-block" aria-hidden="true">
        <div className="home-screen__logo">
          <span className="home-screen__logo-vita">Vita</span>
          <span className="home-screen__logo-mahjong">MAHJONG</span>
          <ShapeBadge
            shapeId={shapeId}
            shapeLabel={shapeLabel}
            className="home-screen__logo-tile"
            showLabel={false}
          />
        </div>
      </div>

      <div className="home-screen__current">
        <p className="home-screen__eyebrow">当前可玩</p>
        <ShapeBadge shapeId={shapeId} shapeLabel={shapeLabel} className="home-screen__shape-chip" />
        <h1>关卡 {levelOrder}</h1>
        <p className="home-screen__meta-line">
          <span data-testid="home-rule-label">{chapterRuleLabel}</span>
          <span>{tileCount} 块</span>
        </p>
        <p className="home-screen__current-note">完成本关后自动解锁下一关</p>
      </div>

      <div className="home-screen__cta-wrap">
        <button
          type="button"
          className="home-screen__cta"
          data-testid="home-start-button"
          onClick={onStart}
        >
          关卡 {levelOrder}
        </button>
      </div>
    </section>
  )
}
