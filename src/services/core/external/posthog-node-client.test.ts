import { describe, it, expect, vi, beforeEach } from 'vitest'

const captureMock = vi.fn()
const shutdownMock = vi.fn()
vi.mock('posthog-node', () => ({
  PostHog: vi.fn(function () {
    return { capture: captureMock, shutdown: shutdownMock }
  }),
}))

describe('getPostHogServerClient', () => {
  beforeEach(() => {
    vi.resetModules()
    captureMock.mockReset()
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
})
