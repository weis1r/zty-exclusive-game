export type AppScreen = 'home' | 'game' | 'result'

export interface RoundSummary {
  outcome: 'won' | 'lost'
  levelId: string
  levelOrder: number
  nextLevelId: string | null
  nextLevelOrder: number | null
  selectedCount: number
  durationMs: number | null
  hintUsed: number
  undoUsed: number
}
