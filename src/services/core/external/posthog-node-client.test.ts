import { describe, it, expect, vi, beforeEach } from 'vitest'

const captureMock = vi.fn()
const shutdownMock = vi.fn()
type CtorOptions = {
  waitUntil?: (promise: Promise<unknown>) => void
  requestTimeout?: number
  fetchRetryCount?: number
  fetchRetryDelay?: number
}
const posthogCtorMock = vi.fn<
  (key: string, options: CtorOptions) => Record<string, unknown>
>(function () {
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
    // waitUntil extends billed lifetime, so the request budget must be capped
    // — including the inter-retry sleep, which defaults to 3s of pure idle.
    expect(options?.requestTimeout).toBe(3000)
    expect(options?.fetchRetryCount).toBe(1)
    expect(options?.fetchRetryDelay).toBe(250)
  })

  // The waitUntil option is marked @experimental ("subject to change in a
  // minor release") and our range is ^5.38.1 — a silent re-semantic would
  // revert production to dropped captures with every mocked test green. This
  // pins the real SDK's behavior: registration happens at enqueue time and
  // the registered promise spans the capture POST.
  it('the installed posthog-node honors waitUntil: registers at enqueue, spans the POST', async () => {
    const { PostHog: RealPostHog } =
      await vi.importActual<typeof import('posthog-node')>('posthog-node')
    const waitUntil = vi.fn()
    const fetchMock = vi.fn(async () => ({
      status: 200,
      text: async () => 'ok',
      json: async () => ({ status: 'ok' }),
    }))

    const client = new RealPostHog('phc_test', {
      host: 'https://analytics.example.test',
      flushAt: 1,
      flushInterval: 0,
      waitUntil,
      waitUntilDebounceMs: 0,
      // Minimal PostHogFetchResponse shape; the SDK's fetch type is stricter.
      fetch: fetchMock as never,
    })

    client.capture({ distinctId: 'anon_1', event: 'sdk_contract_check' })

    // Registration must happen while the request is still current — poll
    // rather than assert synchronously to stay off the SDK's internals.
    await vi.waitFor(() => expect(waitUntil).toHaveBeenCalled())
    await Promise.all(waitUntil.mock.calls.map((call) => call[0]))
    expect(fetchMock).toHaveBeenCalled()

    await client.shutdown()
  })
})
