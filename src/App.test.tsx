import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameApp } from './App'
import { GAME_CONFIG } from './game/config'
import type { LevelDefinition } from './game/types'

function createLevel(tiles: LevelDefinition['tiles']): LevelDefinition {
  return {
    id: 'app-test-level',
    name: '互动测试',
    boardWidth: GAME_CONFIG.boardWidth,
    boardHeight: GAME_CONFIG.boardHeight,
    tiles,
  }
}

afterEach(() => {
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('GameApp interactions', () => {
  it('ignores rapid repeated clicks on the same tile', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 140, y: 40, layer: 0 },
    ])

    render(<GameApp level={level} />)

    fireEvent.click(screen.getByRole('button', { name: '开始挑战' }))

    const emberTile = screen.getByRole('button', { name: '焰砖' })

    act(() => {
      fireEvent.click(emberTile)
      fireEvent.click(emberTile)
    })

    expect(screen.getByTestId('selected-count')).toHaveTextContent('1 次')
    expect(screen.getByTestId('remaining-count')).toHaveTextContent('1 块')
    expect(screen.getByTestId('tray-grid')).toHaveTextContent('焰')
  })

  it('prevents new selections while match clear animation is active', () => {
    vi.useFakeTimers()

    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 40, y: 40, layer: 0 },
      { id: 'ember-2', type: 'ember', x: 140, y: 40, layer: 0 },
      { id: 'ember-3', type: 'ember', x: 240, y: 40, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 40, y: 160, layer: 0 },
    ])

    render(<GameApp level={level} />)

    fireEvent.click(screen.getByRole('button', { name: '开始挑战' }))

    const emberTiles = screen.getAllByRole('button', { name: '焰砖' })
    const leafTile = screen.getByRole('button', { name: '叶砖' })

    act(() => {
      emberTiles.forEach((tile) => fireEvent.click(tile))
      fireEvent.click(leafTile)
    })

    expect(screen.getByTestId('selected-count')).toHaveTextContent('3 次')
    expect(screen.getByTestId('remaining-count')).toHaveTextContent('1 块')

    act(() => {
      vi.advanceTimersByTime(GAME_CONFIG.animationMs.matchClear)
    })

    expect(screen.getByTestId('remaining-count')).toHaveTextContent('1 块')
    vi.useRealTimers()
  })

  it('restores the initial board after losing and pressing restart', () => {
    const level = createLevel([
      { id: 'ember-1', type: 'ember', x: 0, y: 0, layer: 0 },
      { id: 'leaf-1', type: 'leaf', x: 80, y: 0, layer: 0 },
      { id: 'bloom-1', type: 'bloom', x: 160, y: 0, layer: 0 },
      { id: 'bell-1', type: 'bell', x: 240, y: 0, layer: 0 },
      { id: 'cloud-1', type: 'cloud', x: 0, y: 100, layer: 0 },
      { id: 'shell-1', type: 'shell', x: 80, y: 100, layer: 0 },
      { id: 'berry-1', type: 'berry', x: 160, y: 100, layer: 0 },
      { id: 'wave-1', type: 'wave', x: 240, y: 100, layer: 0 },
    ])

    render(<GameApp level={level} />)

    fireEvent.click(screen.getByRole('button', { name: '开始挑战' }))

    fireEvent.click(screen.getByRole('button', { name: '焰砖' }))
    fireEvent.click(screen.getByRole('button', { name: '叶砖' }))
    fireEvent.click(screen.getByRole('button', { name: '花砖' }))
    fireEvent.click(screen.getByRole('button', { name: '铃砖' }))
    fireEvent.click(screen.getByRole('button', { name: '云砖' }))
    fireEvent.click(screen.getByRole('button', { name: '贝砖' }))
    fireEvent.click(screen.getByRole('button', { name: '果砖' }))

    expect(screen.getByText('卡住了')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '再来一局' }))

    expect(screen.queryByText('卡住了')).not.toBeInTheDocument()
    expect(screen.getByTestId('selected-count')).toHaveTextContent('0 次')
    expect(screen.getByTestId('remaining-count')).toHaveTextContent('8 块')
  })
})
