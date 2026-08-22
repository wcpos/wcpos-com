import { beforeEach, describe, expect, it, vi } from 'vitest'

const { confirmEmailChangeMock, consumeMock, FakeRejected } = vi.hoisted(() => ({
  confirmEmailChangeMock: vi.fn(),
  consumeMock: vi.fn(),
  FakeRejected: class FakeRejected extends Error {
    constructor(
      readonly errorCode: string,
      readonly status: number
    ) {
      super(errorCode)
    }
  },
}))

vi.mock('@/lib/medusa-auth', () => ({
  confirmEmailChange: confirmEmailChangeMock,
  EmailChangeRejected: FakeRejected,
}))
vi.mock('@/lib/logger', () => ({
  authLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume: consumeMock }),
  clientIp: () => '203.0.113.9',
}))
vi.mock('@/lib/api/same-origin', () => ({ isSameOriginRequest: () => true }))

import { POST } from './route'

function post(body: Record<string, unknown>) {
  return POST(
    new Request('https://wcpos.com/api/account/email/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  consumeMock.mockResolvedValue({ status: 'allowed' })
  confirmEmailChangeMock.mockResolvedValue('new@example.com')
})

describe('POST /api/account/email/confirm', () => {
  it('requires a token', async () => {
    const response = await post({})
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      errorCode: 'token_required',
    })
  })

  it('confirms without any session', async () => {
    // The link is routinely opened on a different device from the one that
    // started the change; requiring a session here would strand the customer
    // whose old address is dead.
    const response = await post({ token: 'v1.a.b' })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      email: 'new@example.com',
    })
  })

  it('distinguishes an expired token from an invalid one', async () => {
    confirmEmailChangeMock.mockRejectedValue(
      new FakeRejected('expired_token', 400)
    )

    const response = await post({ token: 'stale' })

    await expect(response.json()).resolves.toEqual({
      errorCode: 'expired_token',
    })
  })

  it('treats an unknown backend code as an invalid token', async () => {
    confirmEmailChangeMock.mockRejectedValue(new FakeRejected('weird', 400))

    const response = await post({ token: 'x' })

    await expect(response.json()).resolves.toEqual({
      errorCode: 'invalid_token',
    })
  })

  it('surfaces a conflict as its own status', async () => {
    confirmEmailChangeMock.mockRejectedValue(
      new FakeRejected('change_failed', 409)
    )

    const response = await post({ token: 'x' })

    expect(response.status).toBe(409)
  })

  it('rate limits', async () => {
    consumeMock.mockResolvedValue({ status: 'limited' })

    const response = await post({ token: 'x' })

    expect(response.status).toBe(429)
    expect(confirmEmailChangeMock).not.toHaveBeenCalled()
  })
})
