import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveTurnstileSiteKey } from '@/lib/support/turnstile-keys'

const mockHost = vi.hoisted(() => ({ value: null as string | null }))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) =>
      name.toLowerCase() === 'host' ? mockHost.value : null,
  }),
}))

import { GET, HEAD } from './route'

beforeEach(() => {
  mockHost.value = null
})

describe('GET /api/health', () => {
  it('returns 200 with the health payload', async () => {
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.status).toBe('healthy')
    expect(typeof json.version).toBe('string')
    expect(json.version.length).toBeGreaterThan(0)
    expect(json.environment).toBe('test')
  })

  it('reports the host-resolved store environment (not the build env)', async () => {
    mockHost.value = 'wcpos.com'
    expect((await (await GET()).json()).storeEnvironment).toBe('live')

    mockHost.value = 'beta.wcpos.com'
    expect((await (await GET()).json()).storeEnvironment).toBe('test')

    mockHost.value = 'localhost:3000'
    expect((await (await GET()).json()).storeEnvironment).toBe('dev')
  })

  it('reports support config as the public site key plus presence booleans', async () => {
    const support = (await (await GET()).json()).support
    expect(support).toEqual({
      turnstileSiteKey: expect.toSatisfy(
        (v: unknown) => v === null || typeof v === 'string'
      ),
      turnstileSecretKey: expect.any(Boolean),
      openclawToken: expect.any(Boolean),
    })
  })

  it('reports the same host-resolved Turnstile site key as the support widget', async () => {
    mockHost.value = 'wcpos.com'

    const support = (await (await GET()).json()).support

    expect(support.turnstileSiteKey).toBe(resolveTurnstileSiteKey('wcpos.com'))
  })

  it('returns a valid ISO timestamp', async () => {
    const before = Date.now()
    const response = await GET()
    const after = Date.now()
    const json = await response.json()

    const timestamp = new Date(json.timestamp).getTime()
    expect(json.timestamp).toBe(new Date(json.timestamp).toISOString())
    expect(timestamp).toBeGreaterThanOrEqual(before - 1000)
    expect(timestamp).toBeLessThanOrEqual(after + 1000)
  })
})

describe('HEAD /api/health', () => {
  it('returns 200 with no body', async () => {
    const response = await HEAD()

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
  })
})
