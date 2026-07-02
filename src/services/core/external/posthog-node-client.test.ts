import { describe, it, expect, vi, beforeEach } from 'vitest'

const captureMock = vi.fn()
const shutdownMock = vi.fn()
type CtorOptions = {
  waitUntil?: (promise: Promise<unknown>) => void
  requestTimeout?: number
  fetchRetryCount?: number
}
const posthogCtorMock = vi.fn(function (_key: string, _options: CtorOptions) {
  return { capture: captureMock, shutdown: shutdownMock }
})
vi.mock('posthog-node', () => ({
  PostHog: posthogCtorMock,
}))

describe('getPostHogServerClient', () => {
  beforeEach(() => {
    vi.resetModules()
    captureMock.mockReset()
    posthogCtorMock.mockClear()
  })

  it('returns null when no server/public key is configured', async () => {
    const { getPostHogServerClient } = await import('./posthog-node-client')
    expect(getPostHogServerClient({})).toBeNull()
  })

  it('constructs a single client and reuses it', async () => {
    const { getPostHogServerClient } = await import('./posthog-node-client')
    const env = { POSTHOG_API_KEY: 'phc_x', NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com' }
    const a = getPostHogServerClient(env)
    const b = getPostHogServerClient(env)
    expect(a).not.toBeNull()
    expect(a).toBe(b)
  })

  it('wires the SDK to Vercel waitUntil (deliver) with a bounded request budget', async () => {
    const { getPostHogServerClient } = await import('./posthog-node-client')
    const { deliver } = await import('@/lib/sinks/deliver')
    getPostHogServerClient({
      POSTHOG_API_KEY: 'phc_x',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    })

    expect(posthogCtorMock).toHaveBeenCalledTimes(1)
    const options = posthogCtorMock.mock.calls[0]?.[1]
    // Without waitUntil, Vercel freezes the function after the response and
    // the SDK's internal capture POST is dropped mid-flight.
    expect(options?.waitUntil).toBe(deliver)
    // waitUntil extends billed lifetime, so the request budget must be capped.
    expect(options?.requestTimeout).toBe(3000)
    expect(options?.fetchRetryCount).toBe(1)
  })
})
