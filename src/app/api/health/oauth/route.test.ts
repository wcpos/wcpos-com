import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { OAuthHealthReport } from '@/lib/oauth-health'

const mockCheck = vi.fn<() => Promise<OAuthHealthReport>>()
const mockFatal = vi.fn()
const mockError = vi.fn()

vi.mock('@/lib/oauth-health', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/oauth-health')>()
  return {
    HARD_FAILURE_STATUSES: actual.HARD_FAILURE_STATUSES,
    checkOAuthProviders: (...args: unknown[]) => mockCheck(...(args as [])),
  }
})

vi.mock('@/lib/logger', () => ({
  authLogger: {
    info: vi.fn(),
    error: (...args: unknown[]) => mockError(...args),
    fatal: (...args: unknown[]) => mockFatal(...args),
  },
}))

import { GET, POST } from './route'

// The committed zero-config key from route.ts — no env var involved.
const CRON_KEY = 'wcpos-oauth-health-v4qx8r2n'

const HEALTHY: OAuthHealthReport = {
  healthy: true,
  inconclusive: false,
  results: [
    {
      provider: 'google',
      status: 'ok',
      detail: 'ok',
      registrationVerified: true,
    },
  ],
}

const BROKEN: OAuthHealthReport = {
  healthy: false,
  inconclusive: false,
  results: [
    {
      provider: 'google',
      status: 'provider_rejected',
      detail: 'Google rejected redirect_uri',
      registrationVerified: true,
    },
    {
      provider: 'discord',
      status: 'wrong_redirect_uri',
      detail: 'wrong host',
      registrationVerified: false,
    },
  ],
}

const INCONCLUSIVE: OAuthHealthReport = {
  healthy: true,
  inconclusive: true,
  results: [
    {
      provider: 'google',
      status: 'inconclusive',
      detail: 'Google returned 429',
      registrationVerified: false,
    },
  ],
}

function makeRequest(
  url = 'http://localhost:3000/api/health/oauth',
  headers: Record<string, string> = {}
) {
  return new NextRequest(url, { headers })
}

describe('/api/health/oauth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheck.mockResolvedValue(HEALTHY)
  })

  it('accepts Vercel cron invocations by user-agent with no env var configured', async () => {
    const response = await GET(
      makeRequest(undefined, { 'user-agent': 'vercel-cron/1.0' })
    )
    expect(response.status).toBe(200)
  })

  it('accepts the committed key as a bearer token', async () => {
    const response = await GET(
      makeRequest(undefined, { authorization: `Bearer ${CRON_KEY}` })
    )
    expect(response.status).toBe(200)
  })

  it('accepts the committed key via the x-cron-secret header', async () => {
    const response = await GET(makeRequest(undefined, { 'x-cron-secret': CRON_KEY }))
    expect(response.status).toBe(200)
  })

  it('returns 401 for no credentials', async () => {
    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    expect(mockCheck).not.toHaveBeenCalled()
  })

  it('returns 401 for a wrong key', async () => {
    const response = await GET(makeRequest(undefined, { authorization: 'Bearer wrong' }))
    expect(response.status).toBe(401)
  })

  it('handles POST identically (Vercel cron may use either)', async () => {
    const response = await POST(
      makeRequest(undefined, { 'user-agent': 'vercel-cron/1.0' })
    )
    expect(response.status).toBe(200)
  })

  it('probes the canonical apex host by default and returns 200 when healthy', async () => {
    const response = await GET(
      makeRequest(undefined, { authorization: `Bearer ${CRON_KEY}` })
    )
    expect(response.status).toBe(200)
    expect(mockCheck).toHaveBeenCalledWith('https://wcpos.com')
    expect(mockFatal).not.toHaveBeenCalled()
    expect(mockError).not.toHaveBeenCalled()
    const json = await response.json()
    expect(json.ok).toBe(true)
  })

  it('returns 500 and fires ONE aggregated fatal covering all broken providers', async () => {
    mockCheck.mockResolvedValue(BROKEN)
    const response = await GET(
      makeRequest(undefined, { authorization: `Bearer ${CRON_KEY}` })
    )
    expect(response.status).toBe(500)
    // One fatal, not one per provider: the Discord/email sinks throttle per
    // category and would drop everything after the first.
    expect(mockFatal).toHaveBeenCalledTimes(1)
    const template = mockFatal.mock.calls[0].flat().join(' ')
    const interpolated = mockFatal.mock.calls[0].join(' ')
    expect(`${template} ${interpolated}`).toContain('google')
    expect(`${template} ${interpolated}`).toContain('discord')
  })

  it('logs inconclusive runs at error level (no fatal, still 200)', async () => {
    mockCheck.mockResolvedValue(INCONCLUSIVE)
    const response = await GET(
      makeRequest(undefined, { authorization: `Bearer ${CRON_KEY}` })
    )
    expect(response.status).toBe(200)
    expect(mockFatal).not.toHaveBeenCalled()
    expect(mockError).toHaveBeenCalledTimes(1)
    const json = await response.json()
    expect(json.ok).toBe(true)
    expect(json.inconclusive).toBe(true)
  })

  it('accepts a wcpos-owned base override', async () => {
    const response = await GET(
      makeRequest('http://localhost:3000/api/health/oauth?base=https://beta.wcpos.com', {
        authorization: `Bearer ${CRON_KEY}`,
      })
    )
    expect(response.status).toBe(200)
    expect(mockCheck).toHaveBeenCalledWith('https://beta.wcpos.com')
  })

  it('rejects a non-wcpos base override', async () => {
    const response = await GET(
      makeRequest('http://localhost:3000/api/health/oauth?base=https://evil.example.com', {
        authorization: `Bearer ${CRON_KEY}`,
      })
    )
    expect(response.status).toBe(400)
    expect(mockCheck).not.toHaveBeenCalled()
  })
})
