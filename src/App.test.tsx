import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    typePool: levelOverrides.typePool ?? [...new Set(tiles.map((tile) => tile.type))],
    ...levelOverrides,
    campaign: {
      order: campaignOverride.order ?? order,
      chapterId: campaignOverride.chapterId ?? 'test-chapter',
      chapter: campaignOverride.chapter ?? '测试章节',
      summary: campaignOverride.summary ?? `${name} 说明`,
      shapeId: campaignOverride.shapeId ?? 'ring',
      shapeLabel: campaignOverride.shapeLabel ?? '圆环',
      tileCount: campaignOverride.tileCount ?? tiles.length,
      chapterRuleId: campaignOverride.chapterRuleId ?? 'classic',
      chapterRuleLabel: campaignOverride.chapterRuleLabel ?? '经典四槽',
      unlocksLevelId: campaignOverride.unlocksLevelId,
      recommendedSelectionCount: campaignOverride.recommendedSelectionCount ?? tiles.length,
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

describe('GameApp classic flow', () => {
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
  })

  it('starts the current level from the home screen and shows classic rule metadata', () => {
    const campaign = createCampaign('app-home-start', [
      createLevel('level-1', '起步关', 1, [
        { id: 'l1-ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
        { id: 'l1-ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      ]),
    ])

    renderGame(campaign)
    startFromHome()

    expect(screen.getByTestId('game-screen')).toBeInTheDocument()
    expect(screen.getByTestId('tile-l1-ember-1')).toBeInTheDocument()
    expect(screen.getByTestId('game-rule-chip')).toHaveTextContent('经典四槽')
    expect(screen.getByTestId('game-tile-count')).toHaveTextContent('2')
    expect(screen.getByTestId('countdown-remaining')).toHaveTextContent('04:00')
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
    vi.useFakeTimers()

    expect(screen.getByTestId('undo-button')).toBeDisabled()

    fireEvent.click(screen.getByTestId('tile-ember-1'))

    expect(screen.getByTestId('selected-count')).toHaveTextContent('1 次')
    expect(screen.getByTestId('undo-button')).toBeEnabled()

    fireEvent.click(screen.getByTestId('hint-button'))

    expect(screen.getByTestId('hint-button')).toHaveTextContent('0')
    expect(screen.getByTestId('remaining-count')).toHaveTextContent('2 块')

    act(() => {
      vi.advanceTimersByTime(GAME_CONFIG.animationMs.matchClear + 160)
    })

    fireEvent.click(screen.getByTestId('undo-button'))

    expect(screen.getByTestId('selected-count')).toHaveTextContent('1 次')
    expect(screen.getByTestId('remaining-count')).toHaveTextContent('3 块')
    expect(screen.getByTestId('tray-slot-0')).toBeInTheDocument()
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
    vi.useFakeTimers()

    fireEvent.click(screen.getByTestId('tile-l1-ember-1'))
    fireEvent.click(screen.getByTestId('tile-l1-ember-2'))

    expect(screen.getByTestId('game-win-celebration')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1400)
    })

    await waitFor(() => {
      expect(screen.getByTestId('result-screen')).toBeInTheDocument()
      expect(screen.getByTestId('result-primary-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('result-primary-button'))

    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument()
      expect(screen.getByTestId('tile-l2-leaf-1')).toBeInTheDocument()
    })
  })

  it('keeps dynamic tiles disabled until their selectable window opens', async () => {
    const campaign = createCampaign('app-dynamic-window', [
      createLevel(
        'dynamic-level',
        '变换关',
        1,
        [
          { id: 'dyn-1', type: 'ember', x: 40, y: 40, layer: 0, dynamicGroup: 'shift-a' },
          { id: 'dyn-2', type: 'ember', x: 140, y: 40, layer: 0, dynamicGroup: 'shift-a' },
        ],
        {
          typePool: ['ember', 'leaf'],
        },
      ),
    ])

    renderGame(campaign)
    startFromHome()
    vi.useFakeTimers()

    expect(screen.getByTestId('tile-dyn-1')).toBeDisabled()

    await act(async () => {
      await window.advanceTime?.(2000)
    })

    await waitFor(() => {
      expect(screen.getByTestId('tile-dyn-1')).toBeEnabled()
    })

    fireEvent.click(screen.getByTestId('tile-dyn-1'))
    fireEvent.click(screen.getByTestId('tile-dyn-2'))

    act(() => {
      vi.advanceTimersByTime(1400)
    })

    await waitFor(() => {
      expect(screen.getByTestId('result-screen')).toBeInTheDocument()
    })
  })
})
