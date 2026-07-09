import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockEnv, mockDeps, mockSummary } = vi.hoisted(() => ({
  mockEnv: { CRON_SECRET: undefined as string | undefined },
  mockDeps: { marker: 'deps' },
  mockSummary: { processed: 1, updated: 1, removed: 0 },
}))

const mockCreateDependencies = vi.fn(() => mockDeps)
const mockReconcile = vi.fn(async (deps: unknown) => {
  void deps
  return mockSummary
})

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))

vi.mock('@/lib/discord/default-sync', () => ({
  createDiscordReconcileDependencies: () => mockCreateDependencies(),
  reconcileDiscordDirectory: vi.fn(async () => null),
}))

vi.mock('@/lib/discord/sync', () => ({
  reconcileDiscordProRoles: (deps: unknown) => mockReconcile(deps),
}))

vi.mock('@/lib/logger', () => ({
  infraLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

import { GET, POST } from './route'

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/discord/reconcile', {
    headers,
  })
}

describe('/api/discord/reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.CRON_SECRET = 'cron-secret'
    mockReconcile.mockResolvedValue(mockSummary)
  })

  it('returns a stable unauthorized code when no cron secret is configured', async () => {
    mockEnv.CRON_SECRET = undefined

    const response = await GET(makeRequest({ authorization: 'Bearer cron-secret' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ errorCode: 'unauthorized' })
    expect(mockReconcile).not.toHaveBeenCalled()
  })

  it('returns a stable unauthorized code when authorization does not match', async () => {
    const response = await POST(makeRequest({ authorization: 'Bearer wrong' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ errorCode: 'unauthorized' })
    expect(mockReconcile).not.toHaveBeenCalled()
  })

  it('reconciles roles when the bearer token matches', async () => {
    const response = await GET(makeRequest({ authorization: 'Bearer cron-secret' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, summary: mockSummary, directory: null })
    expect(mockCreateDependencies).toHaveBeenCalledTimes(1)
    expect(mockReconcile).toHaveBeenCalledWith(mockDeps)
  })

  it('reconciles roles when the cron header matches', async () => {
    const response = await POST(makeRequest({ 'x-cron-secret': 'cron-secret' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, summary: mockSummary, directory: null })
  })

  it('returns a stable failure code when reconciliation throws', async () => {
    mockReconcile.mockRejectedValueOnce(new Error('discord down'))

    const response = await POST(makeRequest({ 'x-cron-secret': 'cron-secret' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ errorCode: 'reconciliation_failed' })
  })
})
