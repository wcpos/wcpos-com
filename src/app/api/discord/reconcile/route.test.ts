import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { DirectorySyncSummary } from '@/lib/discord/directory'

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
const mockDirectoryReconcile = vi.fn(async (): Promise<DirectorySyncSummary | null> => null)

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))

vi.mock('@/lib/discord/default-sync', () => ({
  createDiscordReconcileDependencies: () => mockCreateDependencies(),
  reconcileDiscordDirectory: () => mockDirectoryReconcile(),
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
    mockDirectoryReconcile.mockResolvedValue(null)
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
    await expect(response.json()).resolves.toEqual({
      ok: true,
      summary: mockSummary,
      directory: { failed: false, summary: null },
    })
    expect(mockCreateDependencies).toHaveBeenCalledTimes(1)
    expect(mockReconcile).toHaveBeenCalledWith(mockDeps)
  })

  it('reconciles roles when the cron header matches', async () => {
    const response = await POST(makeRequest({ 'x-cron-secret': 'cron-secret' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      summary: mockSummary,
      directory: { failed: false, summary: null },
    })
  })

  it('returns a normalized directory summary when directory reconciliation succeeds', async () => {
    const directorySummary = { members: 1, created: 1, updated: 0, deleted: 0 }
    mockDirectoryReconcile.mockResolvedValueOnce(directorySummary)

    const response = await POST(makeRequest({ 'x-cron-secret': 'cron-secret' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      summary: mockSummary,
      directory: { failed: false, summary: directorySummary },
    })
  })

  it('returns a normalized directory result when directory reconciliation fails', async () => {
    mockDirectoryReconcile.mockRejectedValueOnce(new Error('discord down'))

    const response = await POST(makeRequest({ 'x-cron-secret': 'cron-secret' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      summary: mockSummary,
      directory: { failed: true },
    })
  })

  it('returns a stable failure code when reconciliation throws', async () => {
    mockReconcile.mockRejectedValueOnce(new Error('discord down'))

    const response = await POST(makeRequest({ 'x-cron-secret': 'cron-secret' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ errorCode: 'reconciliation_failed' })
  })

  it('still reconciles the directory when role reconciliation throws', async () => {
    mockReconcile.mockRejectedValueOnce(new Error('medusa down'))

    await POST(makeRequest({ 'x-cron-secret': 'cron-secret' }))

    expect(mockDirectoryReconcile).toHaveBeenCalledOnce()
  })

  it('starts the directory pass before a slow role reconciliation finishes', async () => {
    let resolveRoleReconcile!: (summary: typeof mockSummary) => void
    mockReconcile.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRoleReconcile = resolve
      })
    )

    const responsePromise = POST(makeRequest({ 'x-cron-secret': 'cron-secret' }))
    await Promise.resolve()
    const directoryStarted = mockDirectoryReconcile.mock.calls.length === 1
    resolveRoleReconcile(mockSummary)
    await responsePromise

    expect(directoryStarted).toBe(true)
  })
})
