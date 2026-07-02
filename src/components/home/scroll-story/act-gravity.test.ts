import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { MotionValue } from 'motion/react'

const animateMock = vi.hoisted(() =>
  vi.fn(
    (
      _from: number,
      to: number,
      options?: { onUpdate?: (value: number) => void }
    ) => {
      options?.onUpdate?.(to)
      return { stop: vi.fn() }
    }
  )
)

vi.mock('motion/react', () => ({
  animate: animateMock,
}))

import {
  ACT_HOLDS,
  CATCH_RADIUS,
  DEAD_ZONE,
  nearestHold,
  useActGravity,
} from './act-gravity'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  animateMock.mockClear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
      expect(nearestHold(hold + DEAD_ZONE / 2)).toBeNull()
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

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches })))
}

function stubScrollerGeometry(height: number) {
  const offsetHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight'
  )
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => height,
  })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 0, height)
  )
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000)
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)

  return () => {
    if (offsetHeightDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetHeight',
        offsetHeightDescriptor
      )
      return
    }

    delete (HTMLElement.prototype as unknown as Record<string, unknown>)
      .offsetHeight
  }
}

function createProgress(value: number) {
  return {
    get: vi.fn(() => value),
  } as unknown as MotionValue<number>
}

describe('useActGravity', () => {
  it('settles near a hold after fallback scrolling stops', () => {
    vi.useFakeTimers()
    const restoreScrollEnd = removeScrollEndSupport()
    const restoreGeometry = stubScrollerGeometry(2000)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const progress = createProgress(ACT_HOLDS[0] + CATCH_RADIUS / 2)

    try {
      render(React.createElement(GravityHarness, { progress }))

      act(() => {
        window.dispatchEvent(new Event('scroll'))
        vi.advanceTimersByTime(141)
      })

      const target = ACT_HOLDS[0] * 1000
      expect(animateMock).toHaveBeenCalledWith(
        0,
        target,
        expect.objectContaining({ duration: 0.55 })
      )
      expect(scrollTo).toHaveBeenCalledWith(0, target)
    } finally {
      restoreGeometry()
      restoreScrollEnd()
    }
  })

  it('settles through the scrollend-supported path', () => {
    vi.stubGlobal('onscrollend', null)
    const restoreGeometry = stubScrollerGeometry(2000)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const progress = createProgress(ACT_HOLDS[1] - CATCH_RADIUS / 2)

    try {
      render(React.createElement(GravityHarness, { progress }))

      act(() => {
        window.dispatchEvent(new Event('scrollend'))
      })

      const target = ACT_HOLDS[1] * 1000
      expect(animateMock).toHaveBeenCalledWith(
        0,
        target,
        expect.objectContaining({ duration: 0.55 })
      )
      expect(scrollTo).toHaveBeenCalledWith(0, target)
    } finally {
      restoreGeometry()
    }
  })

  it('returns early when reduced motion is requested', () => {
    vi.useFakeTimers()
    stubReducedMotion(true)
    vi.stubGlobal('onscrollend', null)
    const progress = createProgress(ACT_HOLDS[0] + CATCH_RADIUS / 2)

    render(React.createElement(GravityHarness, { progress }))

    act(() => {
      window.dispatchEvent(new Event('scrollend'))
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(141)
    })

    expect(progress.get).not.toHaveBeenCalled()
    expect(animateMock).not.toHaveBeenCalled()
  })

  it('cancels a pending fallback debounce when the user starts interacting', () => {
    vi.useFakeTimers()
    const restoreScrollEnd = removeScrollEndSupport()
    const progress = createProgress(0.2)

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
