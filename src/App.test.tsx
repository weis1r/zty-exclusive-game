import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameApp } from './App'
import { GAME_CONFIG } from './game/config'
import type { CampaignDefinition, LevelDefinition } from './game/types'

function createLevel(
  id: string,
  name: string,
  order: number,
  tiles: LevelDefinition['tiles'],
  overrides?: Partial<Omit<LevelDefinition, 'campaign'>> & {
    campaign?: Partial<NonNullable<LevelDefinition['campaign']>>
  },
): LevelDefinition {
  const campaignOverride = overrides?.campaign ?? {}
  const levelOverrides = overrides ?? {}

  return {
    id,
    name,
    boardWidth: GAME_CONFIG.boardWidth,
    boardHeight: GAME_CONFIG.boardHeight,
    difficulty: 'easy',
    ...levelOverrides,
    campaign: {
      order: campaignOverride.order ?? order,
      chapterId: campaignOverride.chapterId ?? 'test-chapter',
      chapter: campaignOverride.chapter ?? '测试章节',
      summary: campaignOverride.summary ?? `${name} 说明`,
      shapeId: campaignOverride.shapeId ?? 'ring',
      shapeLabel: campaignOverride.shapeLabel ?? '圆环',
      unlocksLevelId: campaignOverride.unlocksLevelId,
      recommendedSelectionCount: campaignOverride.recommendedSelectionCount,
      starSelectionThresholds: campaignOverride.starSelectionThresholds,
      startingAssists: campaignOverride.startingAssists ?? { hint: 1, undo: 1 },
    },
    tiles,
  }
}

function createCampaign(id: string, levels: LevelDefinition[]): CampaignDefinition {
  return {
    id,
    name: '测试战役',
    levels,
  }
}

function renderGame(campaign: CampaignDefinition) {
  render(<GameApp campaign={campaign} />)
}

function startFromHome() {
  fireEvent.click(screen.getByTestId('home-start-button'))
}

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('GameApp three-screen flow', () => {
  it('renders the home screen as the initial state', () => {
    const campaign = createCampaign('app-home-initial', [
      createLevel('level-1', '起步关', 1, [
        { id: 'l1-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'l1-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
    ])

    renderGame(campaign)

    expect(screen.getByTestId('home-screen')).toBeInTheDocument()
    expect(screen.getByTestId('home-start-button')).toBeEnabled()
    expect(screen.getByTestId('home-start-button')).toHaveTextContent('关卡 1')
    expect(screen.queryByTestId('game-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('result-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('campaign-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('chapter-focus')).not.toBeInTheDocument()
    expect(screen.queryByText('叶 x0')).not.toBeInTheDocument()
  })

  it('starts the current level from the home screen', () => {
    const campaign = createCampaign('app-home-start', [
      createLevel('level-1', '起步关', 1, [
        { id: 'l1-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'l1-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
      createLevel('level-2', '后续关', 2, [
        { id: 'l2-leaf-1', type: 'leaf', x: 40, y: 40, layer: 0 },
        { id: 'l2-leaf-2', type: 'leaf', x: 140, y: 40, layer: 0 },
      ]),
    ])

    renderGame(campaign)
    startFromHome()

    expect(screen.getByTestId('game-screen')).toBeInTheDocument()
    expect(screen.getByTestId('tile-l1-ember-1')).toBeInTheDocument()
    expect(screen.getByTestId('tile-l1-ember-2')).toBeInTheDocument()
    expect(screen.queryByTestId('home-screen')).not.toBeInTheDocument()
  })

  it('renders the current level shape theme on the home, game, and result screens', async () => {
    const campaign = createCampaign('app-shape-theme', [
      createLevel(
        'shape-level-1',
        '图形关',
        1,
        [
          { id: 'shape-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
          { id: 'shape-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
        ],
        {
          campaign: {
            shapeId: 'ring',
            shapeLabel: '圆环',
          },
        },
      ),
      createLevel(
        'shape-level-2',
        '后续图形关',
        2,
        [
          { id: 'shape-leaf-1', type: 'leaf', x: 40, y: 40, layer: 0 },
          { id: 'shape-leaf-2', type: 'leaf', x: 140, y: 40, layer: 0 },
        ],
        {
          campaign: {
            shapeId: 'tripod',
            shapeLabel: '三角架',
          },
        },
      ),
    ])

    renderGame(campaign)

    expect(screen.getAllByText('圆环').length).toBeGreaterThan(0)
    expect(screen.queryByText('三角架')).not.toBeInTheDocument()

    startFromHome()

    expect(screen.getAllByText('圆环').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByTestId('tile-shape-ember-1'))
    fireEvent.click(screen.getByTestId('tile-shape-ember-2'))

    await waitFor(() => {
      expect(screen.getByTestId('result-screen')).toBeInTheDocument()
    })

    expect(screen.getAllByText('圆环').length).toBeGreaterThan(0)
    expect(screen.queryByText('三角架')).not.toBeInTheDocument()
  })

  it('supports hint and undo inside the game screen', () => {
    const campaign = createCampaign('app-game-tools', [
      createLevel('tools-level', '工具关', 1, [
        { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
        { id: 'ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
        { id: 'leaf-1', type: 'leaf', x: 160, y: 0, layer: 0 },
        { id: 'leaf-2', type: 'leaf', x: 240, y: 0, layer: 0 },
      ]),
    ])

    renderGame(campaign)
    startFromHome()

    expect(screen.getByTestId('undo-button')).toBeDisabled()

    fireEvent.click(screen.getByTestId('tile-ember-1'))

    expect(screen.getByTestId('selected-count')).toHaveTextContent('1 次')
    expect(screen.getByTestId('undo-button')).toBeEnabled()

    fireEvent.click(screen.getByTestId('hint-button'))

    expect(screen.getByTestId('hint-button')).toHaveTextContent('0')

    fireEvent.click(screen.getByTestId('undo-button'))

    expect(screen.getByTestId('selected-count')).toHaveTextContent('0 次')
    expect(screen.getByTestId('remaining-count')).toHaveTextContent('4 块')
    expect(screen.queryByTestId('tray-slot-0')).not.toBeInTheDocument()
  })

  it('keeps the tray locked to four slots while a pair burst is animating', () => {
    const campaign = createCampaign('app-tray-burst', [
      createLevel('tray-level', '托盘关', 1, [
        { id: 'burst-ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
        { id: 'burst-ember-2', type: 'ember', x: 80, y: 0, layer: 0 },
        { id: 'burst-leaf-1', type: 'leaf', x: 160, y: 0, layer: 0 },
      ]),
    ])

    renderGame(campaign)
    startFromHome()

    fireEvent.click(screen.getByTestId('tile-burst-ember-1'))
    fireEvent.click(screen.getByTestId('tile-burst-ember-2'))

    const trayGrid = screen.getByTestId('tray-grid')
    const burstNodes = trayGrid.querySelectorAll('.tray-rack__burst')

    expect(trayGrid.childElementCount).toBe(GAME_CONFIG.trayCapacity)
    expect(Array.from(trayGrid.children).every((node) => node.classList.contains('tray-rack__slot'))).toBe(
      true,
    )
    expect(burstNodes).toHaveLength(2)
    expect(
      Array.from(burstNodes).every((node) => node.parentElement?.classList.contains('tray-rack__slot')),
    ).toBe(true)
  })

  it('shows the result screen after victory and can continue to the next level', async () => {
    const campaign = createCampaign('app-win-next', [
      createLevel('level-1', '通关关', 1, [
        { id: 'l1-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'l1-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
      createLevel('level-2', '后续关', 2, [
        { id: 'l2-leaf-1', type: 'leaf', x: 40, y: 40, layer: 0 },
        { id: 'l2-leaf-2', type: 'leaf', x: 140, y: 40, layer: 0 },
      ]),
    ])

    renderGame(campaign)
    startFromHome()

    fireEvent.click(screen.getByTestId('tile-l1-ember-1'))
    fireEvent.click(screen.getByTestId('tile-l1-ember-2'))

    await waitFor(() => {
      expect(screen.getByTestId('result-screen')).toBeInTheDocument()
      expect(screen.getByTestId('result-primary-button')).toBeInTheDocument()
      expect(screen.getByTestId('result-secondary-button')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('game-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('result-modal')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('result-primary-button'))

    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument()
      expect(screen.getByTestId('tile-l2-leaf-1')).toBeInTheDocument()
      expect(screen.getByTestId('tile-l2-leaf-2')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('result-screen')).not.toBeInTheDocument()
  })

  it('uses replay as the primary action on the final result screen', async () => {
    const campaign = createCampaign('app-win-final-level', [
      createLevel('level-1', '终章关', 1, [
        { id: 'l1-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'l1-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
    ])

    renderGame(campaign)
    startFromHome()

    fireEvent.click(screen.getByTestId('tile-l1-ember-1'))
    fireEvent.click(screen.getByTestId('tile-l1-ember-2'))

    await waitFor(() => {
      expect(screen.getByTestId('result-screen')).toBeInTheDocument()
      expect(screen.getByTestId('result-primary-button')).toHaveTextContent('再来一次')
      expect(screen.getByTestId('result-secondary-button')).toHaveTextContent('返回首页')
    })
  })

  it('shows the result screen after failure and can retry the same level', async () => {
    const campaign = createCampaign('app-lose-retry', [
      createLevel('lose-level', '卡槽关', 1, [
        { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
        { id: 'leaf-1', type: 'leaf', x: 80, y: 0, layer: 0 },
        { id: 'bloom-1', type: 'bloom', x: 160, y: 0, layer: 0 },
        { id: 'bell-1', type: 'bell', x: 240, y: 0, layer: 0 },
        { id: 'cloud-1', type: 'cloud', x: 0, y: 100, layer: 0 },
      ]),
    ])

    renderGame(campaign)
    startFromHome()

    ;['ember-1', 'leaf-1', 'bloom-1', 'bell-1'].forEach((tileId) => {
      fireEvent.click(screen.getByTestId(`tile-${tileId}`))
    })

    await waitFor(() => {
      expect(screen.getByTestId('result-screen')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('game-screen')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('result-primary-button'))

    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument()
      expect(screen.queryByTestId('result-screen')).not.toBeInTheDocument()
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0 次')
      expect(screen.getByTestId('remaining-count')).toHaveTextContent('5 块')
    })
  })

  it('returns to the home screen from the result screen and the home button starts the latest current level', async () => {
    const campaign = createCampaign('app-home-latest-level', [
      createLevel('level-1', '通关关', 1, [
        { id: 'l1-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'l1-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
      createLevel('level-2', '后续关', 2, [
        { id: 'l2-leaf-1', type: 'leaf', x: 40, y: 40, layer: 0 },
        { id: 'l2-leaf-2', type: 'leaf', x: 140, y: 40, layer: 0 },
      ]),
    ])

    renderGame(campaign)
    startFromHome()

    fireEvent.click(screen.getByTestId('tile-l1-ember-1'))
    fireEvent.click(screen.getByTestId('tile-l1-ember-2'))

    await waitFor(() => {
      expect(screen.getByTestId('result-screen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('result-secondary-button'))

    await waitFor(() => {
      expect(screen.getByTestId('home-screen')).toBeInTheDocument()
      expect(screen.queryByTestId('result-screen')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('home-start-button'))

    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument()
      expect(screen.getByTestId('tile-l2-leaf-1')).toBeInTheDocument()
      expect(screen.getByTestId('tile-l2-leaf-2')).toBeInTheDocument()
    })
  })

  it('confirms before exiting mid-game and returns to the home screen', async () => {
    const campaign = createCampaign('app-exit-confirm', [
      createLevel('level-1', '退出关', 1, [
        { id: 'exit-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'exit-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
    ])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderGame(campaign)
    startFromHome()

    fireEvent.click(screen.getByTestId('tile-exit-ember-1'))

    fireEvent.click(
      screen.getByRole('button', {
        name: /返回首页|退出本局|退出并返回首页/,
      }),
    )

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
      expect(screen.getByTestId('home-screen')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('game-screen')).not.toBeInTheDocument()
  })

  it('stays on the game screen when exit confirmation is cancelled', async () => {
    const campaign = createCampaign('app-exit-cancel', [
      createLevel('level-1', '取消退出关', 1, [
        { id: 'cancel-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'cancel-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
    ])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderGame(campaign)
    startFromHome()

    fireEvent.click(screen.getByTestId('tile-cancel-ember-1'))

    fireEvent.click(screen.getByTestId('game-back-button'))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
      expect(screen.getByTestId('game-screen')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('home-screen')).not.toBeInTheDocument()
  })
})
