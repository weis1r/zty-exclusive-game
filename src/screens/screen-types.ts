export type AppScreen = 'home' | 'game' | 'result'

export interface RoundSummary {
  outcome: 'won' | 'lost'
  levelId: string
  levelOrder: number
  shapeId: string | null
  shapeLabel: string | null
  tileCount: number | null
  chapterRuleId: string | null
  chapterRuleLabel: string | null
  nextLevelId: string | null
  nextLevelOrder: number | null
  selectedCount: number
  durationMs: number | null
  hintUsed: number
  undoUsed: number
}
