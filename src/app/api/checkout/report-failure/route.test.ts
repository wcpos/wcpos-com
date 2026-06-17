import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above module-scope consts, so the mock fns must be
// created inside vi.hoisted() to be available when the factory runs.
const { fatalMock, errorMock, routineErrorMock, consumeMock } = vi.hoisted(() => ({
  fatalMock: vi.fn(),
  errorMock: vi.fn(),
  routineErrorMock: vi.fn(),
  consumeMock: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  saleLogger: { fatal: fatalMock, error: errorMock },
  routineSaleLogger: { error: routineErrorMock },
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume: (...args: unknown[]) => consumeMock(...args) }),
  clientIp: () => '1.2.3.4',
}))

import { POST } from './route'

function req(body: unknown) {
  return new Request('http://localhost/api/checkout/report-failure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/checkout/report-failure', () => {
  beforeEach(() => {
    fatalMock.mockReset()
    errorMock.mockReset()
    routineErrorMock.mockReset()
    consumeMock.mockReset()
    consumeMock.mockResolvedValue({ success: true, remaining: 29 })
  })

  it('logs money-at-risk kinds at fatal and returns 204', async () => {
    const res = await POST(req({
      kind: 'order_pending', reference: 'WCPOS-AAA-BBBB',
      source: 'stripe_complete_cart', cartId: 'cart_1',
    }))
    expect(res.status).toBe(204)
    expect(fatalMock).toHaveBeenCalledTimes(1)
  })

  it('logs payment_uncertain at fatal and returns 204', async () => {
    const res = await POST(req({
      kind: 'payment_uncertain', reference: 'WCPOS-CCC-DDDD',
      source: 'stripe_unexpected_status', cartId: 'cart_2',
    }))
    expect(res.status).toBe(204)
    expect(fatalMock).toHaveBeenCalledTimes(1)
  })

  it('sanitizes the attacker-controlled reference before logging', async () => {
    const res = await POST(req({
      kind: 'order_pending',
      reference: 'WCPOS-AAA\n@everyone **pwn**',
    }))
    expect(res.status).toBe(204)
    expect(fatalMock).toHaveBeenCalledTimes(1)
    // Tagged-template call: fatal(strings, ...values). The reference value must
    // be stripped of newlines/markdown — only [A-Za-z0-9-] survive.
    const values = fatalMock.mock.calls[0].slice(1)
    expect(values.join('|')).not.toMatch(/[\n*@]/)
    expect(values.join('|')).toContain('WCPOS-AAA')
  })

  it('logs routine payment_failed at error (not fatal) and returns 204', async () => {
    const res = await POST(req({
      kind: 'payment_failed', reference: 'WCPOS-EEE-FFFF',
      source: 'stripe_confirm_payment',
    }))
    expect(res.status).toBe(204)
    expect(routineErrorMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
    expect(fatalMock).not.toHaveBeenCalled()
  })

  it('drops over-limit callers silently (204, no log)', async () => {
    consumeMock.mockResolvedValueOnce({ success: false, remaining: 0 })
    const res = await POST(req({
      kind: 'order_pending', reference: 'WCPOS-GGG-HHHH',
    }))
    expect(res.status).toBe(204)
    expect(fatalMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
    expect(routineErrorMock).not.toHaveBeenCalled()
  })

  it('ignores unknown kinds without logging (still 204, never errors the client)', async () => {
    const res = await POST(req({ kind: 'banana', reference: 'x' }))
    expect(res.status).toBe(204)
    expect(fatalMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
    expect(routineErrorMock).not.toHaveBeenCalled()
  })

  it('tolerates malformed JSON', async () => {
    const bad = new Request('http://localhost/api/checkout/report-failure', { method: 'POST', body: '{' })
    const res = await POST(bad)
    expect(res.status).toBe(204)
  })

  it('drops oversized payloads without a valid content-length header', async () => {
    const oversized = new Request('http://localhost/api/checkout/report-failure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'payment_failed',
        reference: 'WCPOS-III-JJJJ',
        details: 'x'.repeat(3_000),
      }),
    })

    const res = await POST(oversized)

    expect(res.status).toBe(204)
    expect(fatalMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
    expect(routineErrorMock).not.toHaveBeenCalled()
  })
})
