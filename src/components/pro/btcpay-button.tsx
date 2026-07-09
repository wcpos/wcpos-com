'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Bitcoin } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import {
  btcpayOriginFromCheckoutLink,
  invoiceIdFromCheckoutLink,
  isPaidStatus,
  openBtcpayModal,
} from '@/lib/btcpay-modal'
import { createPaymentFailure, type CheckoutFailure } from './checkout-safety'

interface BTCPaySession {
  provider_id?: string
  data?: {
    checkoutLink?: string
    btc_invoice?: { id?: string; checkoutLink?: string }
  }
}

interface BTCPayInvoiceRef {
  origin: string
  invoiceId: string
  link: string
}

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
  const t = useTranslations('pro.checkout.payment.btcpayButton')
  const tErrors = useTranslations('pro.checkout.errors')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  // The modal streams events after handleClick returns; refs keep the
  // paid-then-closed sequencing race-free without re-registering listeners.
  const sawPaidStatus = useRef(false)
  const navigated = useRef(false)

  // The BTCPay session (and its invoice) survives a closed modal — remember
  // it so another click reopens the same invoice instead of minting a new one.
  const invoiceRef = useRef<BTCPayInvoiceRef | null>(null)

  useEffect(() => {
    invoiceRef.current = null
    sawPaidStatus.current = false
    navigated.current = false
  }, [cartId])

  const goToProcessing = () => {
    if (navigated.current) {
      return
    }
    navigated.current = true
    router.push({ pathname: '/processing', query: { cart: cartId } })
  }

  const resolveInvoice = async (): Promise<BTCPayInvoiceRef> => {
    if (invoiceRef.current) {
      return invoiceRef.current
    }

    let link = checkoutLink ?? null
    let invoiceId: string | null = null

    if (!link) {
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
        throw new Error('BTCPAY_INIT_FAILED')
      }

      const { cart } = await response.json()

      const session = cart?.payment_collection?.payment_sessions?.find(
        (s: BTCPaySession) => s.provider_id === 'pp_btcpay_btcpay'
      ) as BTCPaySession | undefined

      link =
        session?.data?.checkoutLink ||
        session?.data?.btc_invoice?.checkoutLink ||
        cart?.payment_session?.data?.checkoutLink ||
        null
      invoiceId = session?.data?.btc_invoice?.id ?? null
    }

    if (!link) {
      throw new Error('BTCPAY_CHECKOUT_LINK_MISSING')
    }

    const origin = btcpayOriginFromCheckoutLink(link)
    invoiceId = invoiceId ?? invoiceIdFromCheckoutLink(link)
    if (!origin || !invoiceId) {
      throw new Error('BTCPAY_CHECKOUT_LINK_MISSING')
    }

    invoiceRef.current = { origin, invoiceId, link }
    return invoiceRef.current
  }

  const handleClick = async () => {
    setIsLoading(true)
    onFailure(null)

    let invoice: BTCPayInvoiceRef
    try {
      invoice = await resolveInvoice()
    } catch (err) {
      // No payment has happened yet — safe to retry.
      onFailure(
        createPaymentFailure(tErrors('btcpayInitFailed'), {
          source: 'btcpay_init',
          details: { cartId, error: err instanceof Error ? err.message : err },
        })
      )
      setIsLoading(false)
      return
    }

    try {
      await openBtcpayModal(invoice.origin, invoice.invoiceId, (event) => {
        if (event.kind === 'status' && isPaidStatus(event.status)) {
          // BTCPay has seen the payment — hand over to /processing, which
          // tracks confirmation and forwards to the success page once the
          // webhook completes the order.
          sawPaidStatus.current = true
          goToProcessing()
          return
        }
        if (event.kind === 'close') {
          if (sawPaidStatus.current) {
            goToProcessing()
            return
          }
          // Closed without paying: the invoice stays valid, nothing was
          // charged — quietly return the button to its resting state.
          setIsLoading(false)
        }
      })
    } catch {
      // Modal script unavailable (blocked, offline, server hiccup): the
      // pre-modal full-page flow still works — never strand the customer.
      window.location.href = invoice.link
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
          {t('preparing')}
        </>
      ) : (
        <>
          <Bitcoin className="h-4 w-4 mr-2" />
          {t('pay')}
        </>
      )}
    </Button>
  )
}
