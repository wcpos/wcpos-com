import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPostHogBrowserRecorder } from './posthog-browser-recorder'

type WindowWithPostHog = Window & {
  posthog?: { capture?: (name: string, props?: Record<string, unknown>) => void }
}

describe('createPostHogBrowserRecorder', () => {
  afterEach(() => {
    delete (window as WindowWithPostHog).posthog
  })

  it('forwards name and properties to window.posthog.capture', () => {
    const capture = vi.fn()
    ;(window as WindowWithPostHog).posthog = { capture }

    createPostHogBrowserRecorder().capture({
      name: 'cta_clicked',
      properties: { page: '/' },
    })

    expect(capture).toHaveBeenCalledWith('cta_clicked', { page: '/' })
  })

  it('does not pass distinctId through (posthog-js owns identity)', () => {
    const capture = vi.fn()
    ;(window as WindowWithPostHog).posthog = { capture }

    createPostHogBrowserRecorder().capture({
      name: 'cta_clicked',
      properties: { page: '/' },
      distinctId: 'anon_1',
    })

    expect(capture).toHaveBeenCalledWith('cta_clicked', { page: '/' })
  })

  it('no-ops when posthog has not been initialised', () => {
    expect(() =>
      createPostHogBrowserRecorder().capture({ name: 'cta_clicked' })
    ).not.toThrow()
  })

  it('does not throw when posthog capture throws', () => {
    ;(window as WindowWithPostHog).posthog = {
      capture: vi.fn(() => {
        throw new Error('posthog unavailable')
      }),
    }

    expect(() =>
      createPostHogBrowserRecorder().capture({ name: 'cta_clicked' })
    ).not.toThrow()
  })
})
