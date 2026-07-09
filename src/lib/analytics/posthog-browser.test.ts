import { describe, it, expect, vi, beforeEach } from 'vitest'

const initMock = vi.fn()
const captureMock = vi.fn()
vi.mock('posthog-js', () => ({
  default: { init: initMock, capture: captureMock, __loaded: false },
}))
vi.mock('./consent', () => ({ isAnalyticsGranted: vi.fn() }))

type WindowWithPostHog = Window & { posthog?: unknown }

describe('initPostHogBrowser', () => {
  beforeEach(() => {
    vi.resetModules()
    initMock.mockReset()
    captureMock.mockReset()
    delete (window as WindowWithPostHog).posthog
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

describe('capturePostHogBrowser', () => {
  beforeEach(() => {
    vi.resetModules()
    initMock.mockReset()
    captureMock.mockReset()
    delete (window as WindowWithPostHog).posthog
  })

  it('replays captures fired while the SDK import is still in flight', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser, capturePostHogBrowser } = await import(
      './posthog-browser'
    )

    // Do not await: this is the window in which a visitor clicks a tracked CTA
    // (download, checkout, support feedback) before posthog-js has landed.
    const initializing = initPostHogBrowser({
      key: 'phc_x',
      host: 'https://eu.i.posthog.com',
    })
    capturePostHogBrowser('download_clicked', { platform: 'mac' })
    expect(captureMock).not.toHaveBeenCalled()

    await initializing
    expect(captureMock).toHaveBeenCalledWith('download_clicked', {
      platform: 'mac',
    })
  })

  it('replays queued captures in the order they were fired', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser, capturePostHogBrowser } = await import(
      './posthog-browser'
    )

    const initializing = initPostHogBrowser({
      key: 'phc_x',
      host: 'https://eu.i.posthog.com',
    })
    capturePostHogBrowser('first')
    capturePostHogBrowser('second')
    await initializing

    expect(captureMock.mock.calls.map((call) => call[0])).toEqual([
      'first',
      'second',
    ])
  })

  it('captures straight through once the SDK is on window', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser, capturePostHogBrowser } = await import(
      './posthog-browser'
    )
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })

    capturePostHogBrowser('checkout_started')
    expect(captureMock).toHaveBeenCalledWith('checkout_started', undefined)
  })

  it('drops captures when no init is in flight (unconsented sessions never queue)', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(false)
    const { initPostHogBrowser, capturePostHogBrowser } = await import(
      './posthog-browser'
    )
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })

    expect(() => capturePostHogBrowser('cta_clicked')).not.toThrow()

    // Consent is later granted: the pre-consent event must NOT be replayed.
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('drops queued captures when the SDK chunk fails to load', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    initMock.mockImplementation(() => {
      throw new Error('chunk blocked')
    })
    const { initPostHogBrowser, capturePostHogBrowser } = await import(
      './posthog-browser'
    )

    const initializing = initPostHogBrowser({
      key: 'phc_x',
      host: 'https://eu.i.posthog.com',
    })
    capturePostHogBrowser('download_clicked')
    await initializing
    expect(captureMock).not.toHaveBeenCalled()

    // The retry starts from an empty queue rather than replaying stale events.
    initMock.mockImplementation(() => {})
    await initPostHogBrowser({ key: 'phc_x', host: 'https://eu.i.posthog.com' })
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('bounds the queue so a burst during init cannot grow without limit', async () => {
    const { isAnalyticsGranted } = await import('./consent')
    ;(isAnalyticsGranted as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const { initPostHogBrowser, capturePostHogBrowser } = await import(
      './posthog-browser'
    )

    const initializing = initPostHogBrowser({
      key: 'phc_x',
      host: 'https://eu.i.posthog.com',
    })
    for (let i = 0; i < 200; i += 1) capturePostHogBrowser(`event_${i}`)
    await initializing

    expect(captureMock).toHaveBeenCalledTimes(50)
    expect(captureMock.mock.calls[0][0]).toBe('event_0')
  })
})
