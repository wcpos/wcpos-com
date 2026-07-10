import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockTrackClientEvent = vi.fn()
const mockGetPostHogSessionId = vi.fn()
const mockReadAnalyticsConsent = vi.fn()
const mockFetch = vi.fn()

vi.mock('./client-events', () => ({
  trackClientEvent: (...args: unknown[]) => mockTrackClientEvent(...args),
}))
vi.mock('./posthog-browser', () => ({
  getPostHogSessionId: () => mockGetPostHogSessionId(),
}))
vi.mock('./consent', () => ({
  readAnalyticsConsent: () => mockReadAnalyticsConsent(),
}))
vi.stubGlobal('fetch', mockFetch)

import {
  beginCheckoutPaymentAttempt,
  isCheckoutConsentWithdrawalBlocked,
} from './checkout-payment-lifecycle'

const SESSION_ID = '01890f3e-8b3a-7cc2-98c4-dc0c0c0c0c0c'

function context(cartId: string) {
  return {
    cartId,
    paymentProvider: 'stripe' as const,
    plan: 'yearly',
    experiment: 'pro_checkout_v1',
    variant: 'control',
    locale: 'en',
  }
}

function refreshResponse(attributed: boolean) {
  return {
    ok: true,
    json: async () => ({ attributed }),
  }
}

describe('checkout payment lifecycle consent state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadAnalyticsConsent.mockReturnValue('granted')
    mockGetPostHogSessionId.mockReturnValue(SESSION_ID)
  })

  it('blocks whenever explicit withdrawal cannot be acknowledged', async () => {
    mockReadAnalyticsConsent.mockReturnValue('denied')
    mockGetPostHogSessionId.mockReturnValue(undefined)
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const attempt = beginCheckoutPaymentAttempt(context('cart_withdrawal'))
    await expect(attempt).rejects.toSatisfy(isCheckoutConsentWithdrawalBlocked)
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
  })

  it('allows a positively acknowledged withdrawal and clears local ownership', async () => {
    mockFetch.mockResolvedValueOnce(refreshResponse(true))
    await beginCheckoutPaymentAttempt(context('cart_cleared'))

    mockTrackClientEvent.mockClear()
    mockReadAnalyticsConsent.mockReturnValue('denied')
    mockGetPostHogSessionId.mockReturnValue(undefined)
    mockFetch.mockResolvedValueOnce(refreshResponse(false))

    await expect(
      beginCheckoutPaymentAttempt(context('cart_cleared'))
    ).resolves.toBeUndefined()
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
  })

  it('blocks when consent becomes denied during a refresh that marked the cart', async () => {
    mockFetch.mockResolvedValueOnce(refreshResponse(true))
    mockReadAnalyticsConsent.mockReturnValue('denied')

    await expect(
      beginCheckoutPaymentAttempt(context('cart_denied_during_refresh'))
    ).rejects.toSatisfy(isCheckoutConsentWithdrawalBlocked)
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
  })

  it('never blocks an unmarked cart for a general refresh outage', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'))

    await expect(
      beginCheckoutPaymentAttempt(context('cart_never_marked'))
    ).resolves.toBeUndefined()
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
  })
})
