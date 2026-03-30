import type { RoundSummary } from './screen-types'
import { ShapeBadge } from '../components/ShapeBadge'

interface ResultScreenProps {
  summary: RoundSummary
  onPrimary: () => void
  onSecondary: () => void
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return '--:--'
  }

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function ResultScreen({ summary, onPrimary, onSecondary }: ResultScreenProps) {
  const isWon = summary.outcome === 'won'
  const primaryLabel = isWon
    ? summary.nextLevelOrder
      ? `关卡 ${summary.nextLevelOrder}`
      : '再来一次'
    : '重试当前关卡'

  return (
    <section
      className={`result-screen${isWon ? ' result-screen--win' : ' result-screen--loss'}`}
      data-testid="result-screen"
    >
      <div className="result-screen__glow" aria-hidden="true" />

      <article className="result-card">
        <ShapeBadge
          shapeId={summary.shapeId}
          shapeLabel={summary.shapeLabel}
          className="result-card__shape"
        />
        <p className="result-card__eyebrow">{isWon ? '关卡完成' : '本关失败'}</p>
        <h2 className="result-card__title">{isWon ? '本局通关' : '再试一次'}</h2>
        <p className="result-card__subtitle">关卡 {summary.levelOrder}</p>
        <p className="result-card__meta">
          <span data-testid="result-rule-label">{summary.chapterRuleLabel ?? '基础堆叠'}</span>
          <span>{summary.tileCount ?? 0} 块</span>
        </p>

        <div className="result-card__stats">
          <div className="result-stat">
            <span>时间</span>
            <strong>{formatDuration(summary.durationMs)}</strong>
          </div>
          <div className="result-stat">
            <span>点击</span>
            <strong>{summary.selectedCount}</strong>
          </div>
          <div className="result-stat">
            <span>提示</span>
            <strong>{summary.hintUsed}</strong>
          </div>
          <div className="result-stat">
            <span>撤销</span>
            <strong>{summary.undoUsed}</strong>
          </div>
        </div>

        {isWon ? (
          <p className="result-card__message">
            {summary.nextLevelOrder
              ? `下一关已解锁，继续前往关卡 ${summary.nextLevelOrder}。`
              : '最后一关已完成，还可以再挑战一次。'}
          </p>
        ) : (
          <p className="result-card__message">
            顶部四槽已经卡住，整理顺序后再来一局。
          </p>
        )}

        <div className="result-card__actions">
          <button
            type="button"
            className="primary-button"
            data-testid="result-primary-button"
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="secondary-button"
            data-testid="result-secondary-button"
            onClick={onSecondary}
          >
            返回首页
          </button>
        </div>
      </article>
    </section>
  )
}
