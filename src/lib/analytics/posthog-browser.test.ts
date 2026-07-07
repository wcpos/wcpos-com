import { describe, it, expect, vi, beforeEach } from 'vitest'

const initMock = vi.fn()
vi.mock('posthog-js', () => ({ default: { init: initMock, __loaded: false } }))
vi.mock('./consent', () => ({ isAnalyticsGranted: vi.fn() }))

describe('initPostHogBrowser', () => {
  beforeEach(() => {
    vi.resetModules()
    initMock.mockReset()
    // Each test controls the shared-identity cookie explicitly.
    if (typeof document !== 'undefined') {
      document.cookie =
        'wcpos-distinct-id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    }
  })

  it('does not init without granted consent', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(false)
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).not.toHaveBeenCalled()
  })

  it('inits once when consent is granted', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledTimes(1)
  })

  it('captures pageviews on history changes so Web Analytics populates', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledWith(
      'phc_x',
      expect.objectContaining({ capture_pageview: 'history_change' })
    )
  })

  it('disables session replay (self-hosted /s/ ingest is not provisioned)', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledWith(
      'phc_x',
      expect.objectContaining({ disable_session_recording: true })
    )
  })

  it('bootstraps the shared wcpos-distinct-id cookie so client and server are one person', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    document.cookie = 'wcpos-distinct-id=shared_abc; path=/'
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledWith(
      'phc_x',
      expect.objectContaining({ bootstrap: { distinctID: 'shared_abc' } })
    )
  })

  it('omits bootstrap when the shared cookie is absent (lets posthog mint its own id)', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock.mock.calls[0][1]).not.toHaveProperty('bootstrap')
  })

  it('enables exception autocapture ($exception posts via /e/, safe on self-hosted)', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledWith(
      'phc_x',
      expect.objectContaining({ capture_exceptions: true })
    )
  })
})
