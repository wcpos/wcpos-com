import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above module-scope consts, so the mock fns must be
// created inside vi.hoisted() to be available when the factory runs.
const { fatalMock, errorMock } = vi.hoisted(() => ({
  fatalMock: vi.fn(),
  errorMock: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  saleLogger: { fatal: fatalMock, error: errorMock },
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
  beforeEach(() => { fatalMock.mockReset() })

  it('logs money-at-risk kinds at fatal and returns 204', async () => {
    const res = await POST(req({
      kind: 'order_pending', reference: 'WCPOS-AAA-BBBB',
      source: 'stripe_complete_cart', cartId: 'cart_1',
    }))
    expect(res.status).toBe(204)
    expect(fatalMock).toHaveBeenCalledTimes(1)
  })

  it('ignores unknown kinds without logging fatal (still 204, never errors the client)', async () => {
    const res = await POST(req({ kind: 'banana', reference: 'x' }))
    expect(res.status).toBe(204)
    expect(fatalMock).not.toHaveBeenCalled()
  })

  it('tolerates malformed JSON', async () => {
    const bad = new Request('http://localhost/api/checkout/report-failure', { method: 'POST', body: '{' })
    const res = await POST(bad)
    expect(res.status).toBe(204)
  })
})
