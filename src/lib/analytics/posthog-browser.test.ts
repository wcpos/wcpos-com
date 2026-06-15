import { describe, it, expect, vi, beforeEach } from 'vitest'

const initMock = vi.fn()
vi.mock('posthog-js', () => ({ default: { init: initMock, __loaded: false } }))
vi.mock('./consent', () => ({ readAnalyticsConsent: vi.fn() }))

describe('initPostHogBrowser', () => {
  beforeEach(() => { vi.resetModules(); initMock.mockReset() })

  it('does not init without granted consent', async () => {
    const { readAnalyticsConsent } = await import('./consent')
    ;(readAnalyticsConsent as ReturnType<typeof vi.fn>).mockReturnValue('denied')
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).not.toHaveBeenCalled()
  })

  it('inits once when consent is granted', async () => {
    const { readAnalyticsConsent } = await import('./consent')
    ;(readAnalyticsConsent as ReturnType<typeof vi.fn>).mockReturnValue('granted')
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledTimes(1)
  })
})
