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
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).not.toHaveBeenCalled()
  })

  it('inits once when consent is granted', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledTimes(1)
  })

  it('captures pageviews on history changes so Web Analytics populates', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledWith(
      'phc_x',
      expect.objectContaining({ capture_pageview: 'history_change' })
    )
  })

  it('disables session replay (self-hosted /s/ ingest is not provisioned)', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
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
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledWith(
      'phc_x',
      expect.objectContaining({ bootstrap: { distinctID: 'shared_abc' } })
    )
  })

  it('mints and persists the shared cookie when absent, then bootstraps with it', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })

    // A shared id is minted rather than left to posthog's own anon id, so the
    // first SPA session and the server-side checkout_completed are one person.
    const bootstrap = initMock.mock.calls[0][1].bootstrap
    expect(bootstrap?.distinctID).toEqual(expect.any(String))
    expect(bootstrap.distinctID).not.toHaveLength(0)

    // The same id is written to the shared cookie so the server adopts it.
    const cookieMatch = document.cookie
      .split('; ')
      .find((c) => c.startsWith('wcpos-distinct-id='))
    expect(cookieMatch).toBe(`wcpos-distinct-id=${bootstrap.distinctID}`)
  })

  it('fails closed and mints a fresh id when the shared cookie is malformed', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    // An invalid % escape makes decodeURIComponent throw; reading it must fail
    // closed (mint fresh) rather than throw and leave window.posthog unset.
    document.cookie = 'wcpos-distinct-id=%E0%A4%A; path=/'
    const { initPostHogBrowser } = await import('./posthog-browser')
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })

    const bootstrap = initMock.mock.calls[0][1].bootstrap
    expect(bootstrap?.distinctID).toEqual(expect.any(String))
    expect(bootstrap.distinctID).not.toHaveLength(0)
    // The malformed cookie value is never adopted as the distinct id.
    expect(bootstrap.distinctID).not.toBe('%E0%A4%A')
  })

  it('contains an SDK init failure instead of rejecting (callers use void)', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    initMock.mockImplementation(() => {
      throw new Error('chunk blocked')
    })
    const { initPostHogBrowser } = await import('./posthog-browser')
    // Must resolve (not reject): both call sites fire-and-forget with `void`,
    // so a rejection here would surface as an unhandled promise rejection.
    await expect(
      initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    ).resolves.toBeUndefined()
    // A later attempt (e.g. consent banner after a transient failure) retries
    // rather than finding the module permanently marked as started.
    initMock.mockReset()
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledTimes(1)
  })

  it('enables exception autocapture ($exception posts via /e/, safe on self-hosted)', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser } = await import('./posthog-browser')
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(initMock).toHaveBeenCalledWith(
      'phc_x',
      expect.objectContaining({ capture_exceptions: true })
    )
  })
})
