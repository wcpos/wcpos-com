'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bitcoin } from 'lucide-react'
import {
  createPaymentFailure,
  BTCPAY_INIT_FAILED_MESSAGE,
  type CheckoutFailure,
} from './checkout-errors'

interface BTCPayButtonProps {
  cartId: string
  checkoutLink?: string | null
  /**
   * Reports payment failures to the parent (null clears a previous failure
   * when the customer retries). Failure messages are already customer-safe.
   */
  onFailure: (failure: CheckoutFailure | null) => void
}

export function BTCPayButton({ cartId, checkoutLink, onFailure }: BTCPayButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    onFailure(null)

    try {
      if (checkoutLink) {
        window.location.href = checkoutLink
        return
      }

      // Select BTCPay as payment provider
      const response = await fetch('/api/store/cart/payment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          provider_id: 'pp_btcpay_btcpay',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initialize Bitcoin payment')
      }

      const { cart } = await response.json()

      const pendingBTCPaySession = cart?.payment_collection?.payment_sessions?.find(
        (session: {
          provider_id?: string
          data?: { checkoutLink?: string }
        }) => session.provider_id === 'pp_btcpay_btcpay'
      )

      const nextCheckoutLink =
        pendingBTCPaySession?.data?.checkoutLink || cart?.payment_session?.data?.checkoutLink

      if (!nextCheckoutLink) {
        throw new Error('No checkout link returned')
      }

      // Redirect to BTCPayServer checkout
      window.location.href = nextCheckoutLink
    } catch (err) {
      // No payment has happened yet — safe to retry.
      onFailure(
        createPaymentFailure(BTCPAY_INIT_FAILED_MESSAGE, {
          source: 'btcpay_init',
          details: { cartId, error: err instanceof Error ? err.message : err },
        })
      )
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full bg-[#f7931a] hover:bg-[#e8850f] text-white"
      size="lg"
    >
      {isLoading ? (
        <>
          <Bitcoin className="h-4 w-4 mr-2 opacity-80" />
          Preparing Bitcoin payment...
        </>
      ) : (
        <>
          <Bitcoin className="h-4 w-4 mr-2" />
          Pay with Bitcoin
        </>
      )}
    </Button>
  )
}
