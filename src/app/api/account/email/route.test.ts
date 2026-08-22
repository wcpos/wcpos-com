import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requestEmailChangeMock,
  assertViewOnlyMock,
  consumeMock,
  verifyEmailDomainMock,
  infoMock,
  errorMock,
  FakeRejected,
} = vi.hoisted(() => ({
  requestEmailChangeMock: vi.fn(),
  assertViewOnlyMock: vi.fn(),
  consumeMock: vi.fn(),
  verifyEmailDomainMock: vi.fn(),
  infoMock: vi.fn(),
  errorMock: vi.fn(),
  // Declared inside the hoisted block: vi.mock factories run before module
  // scope, so a top-level class here is not yet initialized.
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
  requestEmailChange: requestEmailChangeMock,
  EmailChangeRejected: FakeRejected,
}))
vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: assertViewOnlyMock,
  ViewOnlyError: class ViewOnlyError extends Error {},
}))
vi.mock('@/lib/logger', () => ({
  authLogger: { info: infoMock, error: errorMock, warn: vi.fn() },
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume: consumeMock }),
  clientIp: () => '203.0.113.9',
}))
vi.mock('@/lib/api/same-origin', () => ({ isSameOriginRequest: () => true }))
vi.mock('@/lib/email-domain', async (orig) => ({
  ...(await orig<typeof import('@/lib/email-domain')>()),
  verifyEmailDomain: verifyEmailDomainMock,
}))

import { POST } from './route'

function post(body: Record<string, unknown>) {
  return POST(
    new Request('https://wcpos.com/api/account/email', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  assertViewOnlyMock.mockResolvedValue(undefined)
  consumeMock.mockResolvedValue({ status: 'allowed' })
  verifyEmailDomainMock.mockResolvedValue('deliverable')
  requestEmailChangeMock.mockResolvedValue(undefined)
})

describe('POST /api/account/email', () => {
  it('requires an email address', async () => {
    const response = await post({})
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      errorCode: 'email_required',
    })
  })

  it('rejects an undeliverable domain before calling the backend', async () => {
    // The typo case: catch it here so the message is localized and we never
    // send a confirmation to a mailbox that cannot receive it.
    verifyEmailDomainMock.mockResolvedValue('no_such_domain')

    const response = await post({ email: 'info@layed3d.org.uk' })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      errorCode: 'email_undeliverable',
    })
    expect(requestEmailChangeMock).not.toHaveBeenCalled()
  })

  it('lets an unverified domain through', async () => {
    // Fail-soft: a resolver blip must not stop someone fixing their address.
    verifyEmailDomainMock.mockResolvedValue('unverified')

    const response = await post({ email: 'new@example.com' })

    expect(response.status).toBe(202)
    expect(requestEmailChangeMock).toHaveBeenCalled()
  })

  it('refuses during a read-only inspection', async () => {
    const { ViewOnlyError } = await import('@/lib/impersonation')
    assertViewOnlyMock.mockRejectedValue(new ViewOnlyError())

    const response = await post({ email: 'new@example.com' })

    expect(response.status).toBe(403)
    expect(requestEmailChangeMock).not.toHaveBeenCalled()
  })

  it('maps a backend rejection to its own code', async () => {
    requestEmailChangeMock.mockRejectedValue(new FakeRejected('email_taken', 409))

    const response = await post({ email: 'taken@example.com' })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ errorCode: 'email_taken' })
  })

  it('maps a wrong password', async () => {
    requestEmailChangeMock.mockRejectedValue(
      new FakeRejected('invalid_password', 401)
    )

    const response = await post({ email: 'new@example.com', password: 'no' })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      errorCode: 'invalid_password',
    })
  })

  it('does not forward an empty password', async () => {
    await post({ email: 'new@example.com', password: '' })

    expect(requestEmailChangeMock).toHaveBeenCalledWith({
      email: 'new@example.com',
    })
  })

  it('fails closed when the limiter store is unreachable', async () => {
    // Every accepted request sends a real email to a caller-chosen address.
    // A limiter outage must not turn this into an open relay for
    // confirmation mail.
    consumeMock.mockResolvedValue({ status: 'unavailable' })

    const response = await post({ email: 'new@example.com' })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      errorCode: 'rate_limit_unavailable',
    })
    expect(requestEmailChangeMock).not.toHaveBeenCalled()
  })

  it('rate limits', async () => {
    consumeMock.mockResolvedValue({ status: 'limited' })

    const response = await post({ email: 'new@example.com' })

    expect(response.status).toBe(429)
    expect(requestEmailChangeMock).not.toHaveBeenCalled()
  })
})
