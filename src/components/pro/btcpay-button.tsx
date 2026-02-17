'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bitcoin } from 'lucide-react'

interface BTCPayButtonProps {
  cartId: string
  onSuccess: (orderId: string) => void
  onError: (error: string) => void
}

export function BTCPayButton({ cartId, onError }: BTCPayButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)

    try {
      // Select BTCPay as payment provider
      const response = await fetch('/api/store/cart/payment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          provider_id: 'btcpay',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initialize Bitcoin payment')
      }

      const { cart } = await response.json()

      // Get the BTCPay checkout link
      const checkoutLink = cart?.payment_session?.data?.checkoutLink
      if (!checkoutLink) {
        throw new Error('No checkout link returned')
      }

      // Redirect to BTCPayServer checkout
      window.location.href = checkoutLink
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to initialize Bitcoin payment')
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
