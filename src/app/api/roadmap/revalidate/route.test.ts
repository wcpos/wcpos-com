import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { GITHUB_WEBHOOK_SECRET: undefined as string | undefined },
}))

const mockRevalidateTag = vi.fn()

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}))

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

import { POST } from './route'

function makeRequest(secret?: string) {
  return new NextRequest('http://localhost:3000/api/roadmap/revalidate', {
    method: 'POST',
    headers: secret ? { 'x-webhook-secret': secret } : {},
  })
}

describe('POST /api/roadmap/revalidate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.GITHUB_WEBHOOK_SECRET = 'webhook-secret'
  })

  it('returns 401 when no webhook secret is configured', async () => {
    mockEnv.GITHUB_WEBHOOK_SECRET = undefined

    const response = await POST(makeRequest('webhook-secret'))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })

  it('returns 401 when the secret header is missing', async () => {
    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })

  it('returns 401 when the secret header does not match', async () => {
    const response = await POST(makeRequest('wrong-secret'))

    expect(response.status).toBe(401)
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })

  it('revalidates the roadmap tag when the secret matches', async () => {
    const response = await POST(makeRequest('webhook-secret'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ revalidated: true })
    expect(mockRevalidateTag).toHaveBeenCalledWith('roadmap', 'roadmap')
  })

  it('returns 500 when revalidation throws', async () => {
    mockRevalidateTag.mockImplementationOnce(() => {
      throw new Error('boom')
    })

    const response = await POST(makeRequest('webhook-secret'))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Revalidation failed')
  })
})
