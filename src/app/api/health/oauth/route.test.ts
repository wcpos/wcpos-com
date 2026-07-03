import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { OAuthHealthReport } from '@/lib/oauth-health'

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { CRON_SECRET: undefined as string | undefined },
}))

const mockCheck = vi.fn<() => Promise<OAuthHealthReport>>()
const mockFatal = vi.fn()
const mockError = vi.fn()

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))

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
    mockEnv.CRON_SECRET = 'cron-secret'
    mockCheck.mockResolvedValue(HEALTHY)
  })

  it('returns 401 when CRON_SECRET is not configured', async () => {
    mockEnv.CRON_SECRET = undefined
    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    expect(mockCheck).not.toHaveBeenCalled()
  })

  it('returns 401 for a wrong secret', async () => {
    const response = await GET(makeRequest(undefined, { authorization: 'Bearer wrong' }))
    expect(response.status).toBe(401)
  })

  it('accepts the x-cron-secret header as an alternative to the bearer token', async () => {
    const response = await GET(makeRequest(undefined, { 'x-cron-secret': 'cron-secret' }))
    expect(response.status).toBe(200)
  })

  it('handles POST identically (Vercel cron may use either)', async () => {
    const response = await POST(
      makeRequest(undefined, { authorization: 'Bearer cron-secret' })
    )
    expect(response.status).toBe(200)
  })

  it('probes the canonical apex host by default and returns 200 when healthy', async () => {
    const response = await GET(
      makeRequest(undefined, { authorization: 'Bearer cron-secret' })
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
      makeRequest(undefined, { authorization: 'Bearer cron-secret' })
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
      makeRequest(undefined, { authorization: 'Bearer cron-secret' })
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
        authorization: 'Bearer cron-secret',
      })
    )
    expect(response.status).toBe(200)
    expect(mockCheck).toHaveBeenCalledWith('https://beta.wcpos.com')
  })

  it('rejects a non-wcpos base override', async () => {
    const response = await GET(
      makeRequest('http://localhost:3000/api/health/oauth?base=https://evil.example.com', {
        authorization: 'Bearer cron-secret',
      })
    )
    expect(response.status).toBe(400)
    expect(mockCheck).not.toHaveBeenCalled()
  })
})
