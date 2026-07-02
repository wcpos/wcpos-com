import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { MotionValue } from 'motion/react'
import {
  ACT_HOLDS,
  CATCH_RADIUS,
  nearestHold,
  useActGravity,
} from './act-gravity'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('nearestHold', () => {
  it('pulls toward a hold from inside the catch radius', () => {
    expect(nearestHold(0.4 + CATCH_RADIUS * 0.6)).toBe(0.4)
    expect(nearestHold(0.64 - CATCH_RADIUS * 0.6)).toBe(0.64)
  })

  it('lets transitions rest where they are outside the radius', () => {
    expect(nearestHold(0.2)).toBeNull()
    expect(nearestHold(0.52)).toBeNull()
    expect(nearestHold(0.8)).toBeNull()
  })

  it('does not re-trigger once settled on a plateau (dead zone)', () => {
    for (const hold of ACT_HOLDS) {
      expect(nearestHold(hold)).toBeNull()
      expect(nearestHold(hold + 0.002)).toBeNull()
    }
  })

  it('picks the nearer hold when two are conceivable', () => {
    expect(nearestHold(0.6)).toBe(0.64)
  })
})

function GravityHarness({ progress }: { progress: MotionValue<number> }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  useActGravity(scrollerRef, progress)

  return React.createElement('div', {
    ref: scrollerRef,
    'data-testid': 'gravity-scroller',
  })
}

function removeScrollEndSupport() {
  const windowDescriptor = Object.getOwnPropertyDescriptor(window, 'onscrollend')
  const prototypeDescriptor = Object.getOwnPropertyDescriptor(
    Window.prototype,
    'onscrollend'
  )

  delete (window as unknown as Record<string, unknown>).onscrollend
  delete (Window.prototype as unknown as Record<string, unknown>).onscrollend

  return () => {
    if (windowDescriptor) {
      Object.defineProperty(window, 'onscrollend', windowDescriptor)
    }
    if (prototypeDescriptor) {
      Object.defineProperty(Window.prototype, 'onscrollend', prototypeDescriptor)
    }
  }
}

describe('useActGravity', () => {
  it('cancels a pending fallback debounce when the user starts interacting', () => {
    vi.useFakeTimers()
    const restoreScrollEnd = removeScrollEndSupport()
    const progress = {
      get: vi.fn(() => 0.2),
    } as unknown as MotionValue<number>

    try {
      render(React.createElement(GravityHarness, { progress }))

      act(() => {
        window.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('touchstart'))
        vi.advanceTimersByTime(141)
      })

      expect(progress.get).not.toHaveBeenCalled()
    } finally {
      restoreScrollEnd()
    }
  })
})
