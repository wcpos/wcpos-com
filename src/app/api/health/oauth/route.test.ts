import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { OAuthHealthReport } from '@/lib/oauth-health'

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { CRON_SECRET: undefined as string | undefined },
}))

const mockCheck = vi.fn<() => Promise<OAuthHealthReport>>()
const mockFatal = vi.fn()

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))

vi.mock('@/lib/oauth-health', () => ({
  checkOAuthProviders: (...args: unknown[]) => mockCheck(...(args as [])),
}))

vi.mock('@/lib/logger', () => ({
  authLogger: {
    info: vi.fn(),
    error: vi.fn(),
    fatal: (...args: unknown[]) => mockFatal(...args),
  },
}))

import { GET } from './route'

const HEALTHY: OAuthHealthReport = {
  healthy: true,
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
  results: [
    {
      provider: 'google',
      status: 'provider_rejected',
      detail: 'Google rejected redirect_uri',
      registrationVerified: true,
    },
  ],
}

function makeRequest(url = 'http://localhost:3000/api/health/oauth', secret?: string) {
  return new NextRequest(url, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
}

describe('GET /api/health/oauth', () => {
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
    const response = await GET(makeRequest(undefined, 'wrong'))
    expect(response.status).toBe(401)
  })

  it('probes the canonical apex host by default and returns 200 when healthy', async () => {
    const response = await GET(makeRequest(undefined, 'cron-secret'))
    expect(response.status).toBe(200)
    expect(mockCheck).toHaveBeenCalledWith('https://wcpos.com')
    expect(mockFatal).not.toHaveBeenCalled()
    const json = await response.json()
    expect(json.ok).toBe(true)
  })

  it('returns 500 and fires a fatal alert per broken provider', async () => {
    mockCheck.mockResolvedValue(BROKEN)
    const response = await GET(makeRequest(undefined, 'cron-secret'))
    expect(response.status).toBe(500)
    expect(mockFatal).toHaveBeenCalledTimes(1)
  })

  it('accepts a wcpos-owned base override', async () => {
    const response = await GET(
      makeRequest(
        'http://localhost:3000/api/health/oauth?base=https://beta.wcpos.com',
        'cron-secret'
      )
    )
    expect(response.status).toBe(200)
    expect(mockCheck).toHaveBeenCalledWith('https://beta.wcpos.com')
  })

  it('rejects a non-wcpos base override', async () => {
    const response = await GET(
      makeRequest(
        'http://localhost:3000/api/health/oauth?base=https://evil.example.com',
        'cron-secret'
      )
    )
    expect(response.status).toBe(400)
    expect(mockCheck).not.toHaveBeenCalled()
  })
})
