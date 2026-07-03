import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { FlipDevice } from './flip-device'

const FAKE_TIMER_CONFIG = {
  toFake: [
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'requestAnimationFrame',
    'cancelAnimationFrame',
  ],
} as const

function stubMatchMedia({ reducedMotion }: { reducedMotion: boolean }) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
}

function renderSlot(props: Partial<React.ComponentProps<typeof FlipDevice>> = {}) {
  return render(
    <FlipDevice offsetMs={0} intervalMs={3000} {...props}>
      <span>model-a</span>
      <span>model-b</span>
      <span>model-c</span>
    </FlipDevice>
  )
}

function visible(text: string) {
  const wrapper = screen.getByText(text).parentElement
  return !wrapper?.classList.contains('invisible')
}

/**
 * out phase + snap rAFs + in phase = one full card flip. Each advance is its
 * own act(): the snap phase only schedules its rAF once React flushes the
 * previous state update.
 */
function completeFlip() {
  act(() => vi.advanceTimersByTime(350)) // out: 0→90°
  act(() => vi.advanceTimersToNextFrame()) // snap commit
  act(() => vi.advanceTimersToNextFrame()) // → in
  act(() => vi.advanceTimersByTime(350)) // in: −90°→0
}

describe('FlipDevice', () => {
  beforeEach(() => {
    vi.useFakeTimers(FAKE_TIMER_CONFIG)
    stubMatchMedia({ reducedMotion: false })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows only the first model at rest', () => {
    renderSlot()

    expect(visible('model-a')).toBe(true)
    expect(visible('model-b')).toBe(false)
    expect(visible('model-c')).toBe(false)
  })

  it('card-flips to the next model on the cycle timer', () => {
    renderSlot()

    act(() => vi.advanceTimersByTime(0)) // offset timer → flip starts
    completeFlip()

    expect(visible('model-a')).toBe(false)
    expect(visible('model-b')).toBe(true)
  })

  it('swaps the model edge-on: index advances at 90°, before the turn-in', () => {
    const { container } = renderSlot()
    const card = container.querySelector('[data-flip-phase]')!

    act(() => vi.advanceTimersByTime(0))
    expect(card.getAttribute('data-flip-phase')).toBe('out')
    expect(visible('model-a')).toBe(true)

    act(() => vi.advanceTimersByTime(350))
    expect(card.getAttribute('data-flip-phase')).toBe('snap')
    expect(visible('model-b')).toBe(true)
    expect(visible('model-a')).toBe(false)
  })

  it('wraps around to the first model', () => {
    renderSlot()

    act(() => vi.advanceTimersByTime(0))
    completeFlip()
    act(() => vi.advanceTimersByTime(3000 - 700))
    completeFlip()
    act(() => vi.advanceTimersByTime(3000 - 700))
    completeFlip()

    expect(visible('model-a')).toBe(true)
  })

  it('does not flip while the act is off stage', () => {
    renderSlot({ active: false })

    act(() => vi.advanceTimersByTime(30000))

    expect(visible('model-a')).toBe(true)
    expect(visible('model-b')).toBe(false)
  })

  it('does not flip under prefers-reduced-motion', () => {
    stubMatchMedia({ reducedMotion: true })
    renderSlot()

    act(() => vi.advanceTimersByTime(30000))

    expect(visible('model-a')).toBe(true)
  })

  it('skips flips while the tab is hidden', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    renderSlot()

    act(() => vi.advanceTimersByTime(0))
    completeFlip()

    expect(visible('model-a')).toBe(true)
    hidden.mockRestore()
  })

  it('honours the slot stagger offset', () => {
    renderSlot({ offsetMs: 1200 })

    act(() => vi.advanceTimersByTime(1100))
    expect(visible('model-a')).toBe(true)

    act(() => vi.advanceTimersByTime(100))
    completeFlip()
    expect(visible('model-b')).toBe(true)
  })
})
