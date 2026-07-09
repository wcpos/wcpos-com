'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Bitcoin } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import {
  btcpayOriginFromCheckoutLink,
  hideBtcpayModal,
  invoiceIdFromCheckoutLink,
  isPaidStatus,
  isPaymentIssueStatus,
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
  /** The hosted checkout page — always usable as a full-page redirect. */
  link: string
  /** Null when the link can't drive the modal (see `canOpenModally`). */
  origin: string | null
  invoiceId: string | null
}

/**
 * The modal needs an HTTPS origin serving `/modal/btcpay.js` and an invoice
 * id. A link that supplies neither (a plain-HTTP dev/e2e server, a permalink
 * that isn't `/i/{id}`) is still a perfectly good hosted checkout page.
 */
function canOpenModally(
  invoice: BTCPayInvoiceRef
): invoice is BTCPayInvoiceRef & { origin: string; invoiceId: string } {
  return Boolean(invoice.origin && invoice.invoiceId)
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
  // handled-then-closed sequencing race-free without re-registering listeners.
  const invoiceHandled = useRef(false)
  const navigated = useRef(false)

  // The BTCPay session (and its invoice) survives a closed modal — remember
  // it so another click reopens the same invoice instead of minting a new one.
  const invoiceRef = useRef<BTCPayInvoiceRef | null>(null)

  useEffect(() => {
    invoiceRef.current = null
    invoiceHandled.current = false
    navigated.current = false
  }, [cartId])

  const goToProcessing = () => {
    if (navigated.current) {
      return
    }
    navigated.current = true
    // /processing is a client-side route; the BTCPay frame lives outside React
    // under document.body and would otherwise cover the page we route to.
    hideBtcpayModal()
    router.push({ pathname: '/processing', query: { cart: cartId } })
  }

  // Closing the modal is NOT proof nothing was paid: a wallet payment can be
  // in flight before BTCPay posts a status. One auth-bound backend check
  // decides between handing over to /processing and quietly resting.
  const settleAfterClose = async () => {
    try {
      const response = await fetch(
        `/api/store/cart/payment-status?cartId=${encodeURIComponent(cartId)}`
      )
      if (response.ok) {
        const { state } = (await response.json()) as { state?: string }
        if (state === 'completed' || state === 'confirming') {
          goToProcessing()
          return
        }
      }
    } catch {
      // Status check unavailable — fall through to the resting state; the
      // webhook still completes any real payment and emails the licence.
    }
    setIsLoading(false)
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

    // A link the modal can't drive is not an init failure — handleClick
    // redirects to it. Only a missing link leaves the customer with nothing.
    invoiceRef.current = {
      link,
      origin: btcpayOriginFromCheckoutLink(link),
      invoiceId: invoiceId ?? invoiceIdFromCheckoutLink(link),
    }
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

    if (!canOpenModally(invoice)) {
      // Nothing to open in-page — same fallback as a modal that won't load.
      window.location.href = invoice.link
      return
    }

    try {
      await openBtcpayModal(invoice.origin, invoice.invoiceId, (event) => {
        if (event.kind === 'status') {
          // Paid: /processing tracks confirmation and forwards to the success
          // page once the webhook completes the order. Invalid: money arrived
          // but the payment failed, and /processing owns that conversation —
          // either way the customer must not pay again from checkout.
          if (isPaidStatus(event.status) || isPaymentIssueStatus(event.status)) {
            invoiceHandled.current = true
            goToProcessing()
          }
          return
        }
        if (event.kind === 'close') {
          if (invoiceHandled.current) {
            goToProcessing()
            return
          }
          void settleAfterClose()
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
