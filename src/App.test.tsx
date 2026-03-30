import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GAME_CONFIG } from './game/config'
import { createInitialGameState } from './game/engine'
import { buildQuickShiftPlan } from './quickPlayRules'
import {
  createDefaultCampaignProgress,
  recordLevelCompletion,
  saveCampaignProgress,
  setCurrentCampaignLevel,
} from './game/storage'
import { GameApp } from './App'
import type {
  CampaignChapterDefinition,
  CampaignDefinition,
  LevelDefinition,
  TileType,
} from './game/types'

function createLevel(
  id: string,
  name: string,
  order: number,
  tiles: LevelDefinition['tiles'],
  overrides?: Partial<LevelDefinition>,
): LevelDefinition {
  return {
    id,
    name,
    boardWidth: GAME_CONFIG.boardWidth,
    boardHeight: GAME_CONFIG.boardHeight,
    difficulty: 'easy',
    campaign: {
      order,
      chapter: '测试章节',
      summary: `${name} 说明`,
      startingAssists: { hint: 1, undo: 1 },
      ...(overrides?.campaign ?? {}),
    },
    tiles,
    ...overrides,
  }
}

function createCampaign(
  id: string,
  levels: LevelDefinition[],
  chapters?: CampaignChapterDefinition[],
): CampaignDefinition {
  return {
    id,
    name: '测试战役',
    chapters,
    levels,
  }
}

function createTileSet(count: number, typePool: TileType[] = ['ember']): LevelDefinition['tiles'] {
  return Array.from({ length: count }, (_, index) => {
    const type = typePool[index % typePool.length]

    return {
      id: `${type}-${index + 1}`,
      type,
      x: (index % 4) * 76,
      y: Math.floor(index / 4) * 44,
      layer: 0,
    }
  })
}

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('GameApp interactions', () => {
  it('renders the campaign screen and starts the first unlocked level', () => {
    const campaign = createCampaign('app-campaign-start', [
      createLevel('level-1', '起步关', 1, [
        { id: 'ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
      createLevel('level-2', '锁定关', 2, [
        { id: 'leaf-1', type: 'leaf', x: 40, y: 40, layer: 0 },
        { id: 'leaf-2', type: 'leaf', x: 140, y: 40, layer: 0 },
      ]),
    ])

    render(<GameApp campaign={campaign} />)

    expect(screen.getByTestId('campaign-screen')).toBeInTheDocument()
    expect(screen.getByTestId('unlocked-count')).toHaveTextContent('已解锁 1/2')
    expect(screen.getByTestId('start-level-btn-level-2')).toBeDisabled()

    fireEvent.click(screen.getByTestId('start-level-btn-level-1'))

    expect(screen.getByTestId('game-screen')).toBeInTheDocument()
    expect(screen.getByTestId('current-level-id')).toHaveTextContent('level-1')
  })

  it('renders chapter summaries for the v2 campaign overview', () => {
    const chapterA: CampaignChapterDefinition = {
      id: 'chapter-a',
      order: 1,
      title: '第一章',
      summary: '第一章摘要',
      levelIds: ['level-1', 'level-2'],
    }
    const chapterB: CampaignChapterDefinition = {
      id: 'chapter-b',
      order: 2,
      title: '第二章',
      summary: '第二章摘要',
      levelIds: ['level-3'],
    }
    const campaign = createCampaign(
      'app-campaign-chapters',
      [
        createLevel(
          'level-1',
          '章节一关卡一',
          1,
          [
            { id: 'ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
            { id: 'ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
          ],
          {
            campaign: { order: 1, chapterId: chapterA.id, chapter: chapterA.title, summary: 'a-1' },
          },
        ),
        createLevel(
          'level-2',
          '章节一关卡二',
          2,
          [
            { id: 'leaf-1', type: 'leaf', x: 40, y: 40, layer: 0 },
            { id: 'leaf-2', type: 'leaf', x: 140, y: 40, layer: 0 },
          ],
          {
            campaign: { order: 2, chapterId: chapterA.id, chapter: chapterA.title, summary: 'a-2' },
          },
        ),
        createLevel(
          'level-3',
          '章节二关卡一',
          3,
          [
            { id: 'bloom-1', type: 'bloom', x: 40, y: 40, layer: 0 },
            { id: 'bloom-2', type: 'bloom', x: 140, y: 40, layer: 0 },
          ],
          {
            campaign: { order: 3, chapterId: chapterB.id, chapter: chapterB.title, summary: 'b-1' },
          },
        ),
      ],
      [chapterA, chapterB],
    )

    render(<GameApp campaign={campaign} />)

    expect(screen.getByTestId('chapter-card-chapter-a')).toBeInTheDocument()
    expect(screen.getByTestId('chapter-card-chapter-b')).toBeInTheDocument()
    expect(screen.getByTestId('chapter-section-chapter-a')).toBeInTheDocument()
    expect(screen.getByTestId('chapter-section-chapter-b')).toBeInTheDocument()
    expect(screen.getByTestId('chapter-focus')).toHaveTextContent('第一章')
    expect(screen.getByTestId('chapter-focus')).toHaveTextContent('已解锁 1/2')
  })

  it('supports hint and undo inside a running level', () => {
    const campaign = createCampaign('app-campaign-tools', [
      createLevel('tools-level', '工具关', 1, [
        { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
        { id: 'ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
        { id: 'leaf-1', type: 'leaf', x: 160, y: 0, layer: 0 },
        { id: 'leaf-2', type: 'leaf', x: 240, y: 0, layer: 0 },
      ]),
    ])

    render(<GameApp campaign={campaign} />)

    fireEvent.click(screen.getByTestId('start-level-btn-tools-level'))

    expect(screen.getByTestId('undo-button')).toBeDisabled()

    fireEvent.click(screen.getByTestId('tile-ember-1'))

    expect(screen.getByTestId('selected-count')).toHaveTextContent('1 次')
    expect(screen.getByTestId('undo-button')).toBeEnabled()

    fireEvent.click(screen.getByTestId('hint-button'))

    expect(screen.getByTestId('hint-button')).toHaveTextContent('0')
    expect(screen.getByTestId('tile-ember-2')).toHaveClass('is-hinted')

    fireEvent.click(screen.getByTestId('undo-button'))

    expect(screen.getByTestId('selected-count')).toHaveTextContent('0 次')
    expect(screen.getByTestId('remaining-count')).toHaveTextContent('4 块')
    expect(screen.queryByTestId('tray-slot-0')).not.toBeInTheDocument()
  })

  it('enters quick play mode with the speed-shift rule enabled', () => {
    const campaign = createCampaign('app-campaign-quick-shift', [
      createLevel('quick-level', '疾速关', 1, [
        { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
        { id: 'ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
        { id: 'leaf-1', type: 'leaf', x: 160, y: 0, layer: 0 },
        { id: 'leaf-2', type: 'leaf', x: 240, y: 0, layer: 0 },
        { id: 'bloom-1', type: 'bloom', x: 0, y: 100, layer: 0 },
        { id: 'bloom-2', type: 'bloom', x: 80, y: 100, layer: 0 },
        { id: 'bell-1', type: 'bell', x: 160, y: 100, layer: 0 },
        { id: 'bell-2', type: 'bell', x: 240, y: 100, layer: 0 },
      ]),
    ])

    render(<GameApp campaign={campaign} />)

    fireEvent.click(screen.getByRole('button', { name: '快速单局' }))

    const nextState = JSON.parse(window.render_game_to_text?.() ?? '{}')

    expect(nextState.view).toBe('game')
    expect(nextState.campaign.sessionMode).toBe('quick')
    expect(nextState.campaign.quickRule).toBe('speed-shift')
    expect(nextState.quickSession.phase).toBe('opening')
    expect(nextState.quickSession.targetPairs).toBe(4)
    expect(screen.getByTestId('quick-status-panel')).toHaveTextContent('开局观察期')
  })

  it('prefers a more comfortable unlocked level for quick play instead of the latest hard table', () => {
    const campaign = createCampaign('app-campaign-quick-choice', [
      createLevel('level-1', '热手局', 1, createTileSet(48, ['ember', 'leaf']), {
        difficulty: 'easy',
      }),
      createLevel('level-2', '稳手局', 2, createTileSet(60, ['ember', 'leaf', 'bloom']), {
        difficulty: 'normal',
      }),
      createLevel('level-3', '硬核局', 3, createTileSet(84, ['ember', 'leaf', 'bloom', 'bell']), {
        difficulty: 'hard',
      }),
    ])
    let progress = createDefaultCampaignProgress(campaign)

    progress = recordLevelCompletion(
      progress,
      campaign,
      { levelId: 'level-1', selectedCount: 48, completionMs: 12000 },
      3,
    )
    progress = recordLevelCompletion(
      progress,
      campaign,
      { levelId: 'level-2', selectedCount: 60, completionMs: 18000 },
      3,
    )
    progress = setCurrentCampaignLevel(progress, campaign, 'level-3')
    saveCampaignProgress(progress)

    render(<GameApp campaign={campaign} />)

    expect(screen.getByText('快速单局默认使用：稳手局')).toBeInTheDocument()
  })

  it('keeps a visible opening window before quick mode starts shifting', async () => {
    vi.useFakeTimers()

    const campaign = createCampaign('app-campaign-quick-window', [
      createLevel('quick-level', '节奏关', 1, [
        { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
        { id: 'ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
        { id: 'leaf-1', type: 'leaf', x: 160, y: 0, layer: 0 },
        { id: 'leaf-2', type: 'leaf', x: 240, y: 0, layer: 0 },
        { id: 'bloom-1', type: 'bloom', x: 0, y: 100, layer: 0 },
        { id: 'bloom-2', type: 'bloom', x: 80, y: 100, layer: 0 },
        { id: 'bell-1', type: 'bell', x: 160, y: 100, layer: 0 },
        { id: 'bell-2', type: 'bell', x: 240, y: 100, layer: 0 },
      ]),
    ])

    render(<GameApp campaign={campaign} />)
    fireEvent.click(screen.getByRole('button', { name: '快速单局' }))

    const openingState = JSON.parse(window.render_game_to_text?.() ?? '{}')

    expect(openingState.quickSession.phase).toBe('opening')
    expect(openingState.quickSession.nextShiftInMs).toBeGreaterThanOrEqual(2300)
    expect(screen.getByTestId('quick-shift-count')).toHaveTextContent('0')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2450)
    })
    const cycledState = JSON.parse(window.render_game_to_text?.() ?? '{}')

    expect(cycledState.quickSession.phase).toBe('cycling')
    expect(cycledState.quickSession.shiftCount).toBe(1)
    expect(screen.getByTestId('quick-shift-count')).toHaveTextContent('1')
  })

  it('builds a paired quick-shift plan from exposed tiles', () => {
    const level = createLevel('quick-plan-level', '换牌关', 1, [
      { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 160, y: 0, layer: 0 },
      { id: 'leaf-2', type: 'leaf', x: 240, y: 0, layer: 0 },
      { id: 'bloom-1', type: 'bloom', x: 0, y: 100, layer: 0 },
      { id: 'bloom-2', type: 'bloom', x: 80, y: 100, layer: 0 },
      { id: 'bell-1', type: 'bell', x: 160, y: 100, layer: 0 },
      { id: 'bell-2', type: 'bell', x: 240, y: 100, layer: 0 },
    ])
    const state = createInitialGameState(level, 'playing')
    const plan = buildQuickShiftPlan(state, GAME_CONFIG, 0)

    expect(plan).not.toBeNull()
    expect(plan?.shiftedTileIds).toHaveLength(4)
    expect(plan?.typeMap['ember-1']).toBe('leaf')
    expect(plan?.typeMap['ember-2']).toBe('leaf')
    expect(plan?.typeMap['leaf-1']).toBe('ember')
    expect(plan?.typeMap['leaf-2']).toBe('ember')
  })

  it('unlocks the next level after victory and shows the next-level action', async () => {
    const campaign = createCampaign('app-campaign-win', [
      createLevel('level-1', '通关关', 1, [
        { id: 'ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
      createLevel('level-2', '后续关', 2, [
        { id: 'leaf-1', type: 'leaf', x: 40, y: 40, layer: 0 },
        { id: 'leaf-2', type: 'leaf', x: 140, y: 40, layer: 0 },
      ]),
    ])

    render(<GameApp campaign={campaign} />)

    fireEvent.click(screen.getByTestId('start-level-btn-level-1'))
    fireEvent.click(screen.getByTestId('tile-ember-1'))
    fireEvent.click(screen.getByTestId('tile-ember-2'))

    await waitFor(() => {
      expect(screen.getByTestId('result-modal')).toBeInTheDocument()
      expect(screen.getByTestId('next-level-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('back-to-campaign-button'))

    await waitFor(() => {
      expect(screen.getByTestId('campaign-screen')).toBeInTheDocument()
      expect(screen.getByTestId('unlocked-count')).toHaveTextContent('已解锁 2/2')
      expect(screen.getByTestId('start-level-btn-level-2')).toBeEnabled()
    })
  })

  it('restores the board after losing and retrying the level', async () => {
    const campaign = createCampaign('app-campaign-lose', [
      createLevel('lose-level', '卡槽关', 1, [
        { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
        { id: 'leaf-1', type: 'leaf', x: 80, y: 0, layer: 0 },
        { id: 'bloom-1', type: 'bloom', x: 160, y: 0, layer: 0 },
        { id: 'bell-1', type: 'bell', x: 240, y: 0, layer: 0 },
        { id: 'cloud-1', type: 'cloud', x: 0, y: 100, layer: 0 },
      ]),
    ])

    render(<GameApp campaign={campaign} />)

    fireEvent.click(screen.getByTestId('start-level-btn-lose-level'))

    ;['ember-1', 'leaf-1', 'bloom-1', 'bell-1'].forEach((tileId) => {
      fireEvent.click(screen.getByTestId(`tile-${tileId}`))
    })

    await waitFor(() => {
      expect(screen.getByTestId('result-modal')).toBeInTheDocument()
      expect(screen.getByText('顶部配对槽卡住了')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('retry-level-button'))

    await waitFor(() => {
      expect(screen.queryByTestId('result-modal')).not.toBeInTheDocument()
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0 次')
      expect(screen.getByTestId('remaining-count')).toHaveTextContent('5 块')
    })
  })
})
