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
  isExpiredStatus,
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
  /** Null when the link can't host the modal — the caller redirects instead. */
  origin: string | null
  invoiceId: string | null
  link: string
}

interface BTCPayButtonProps {
  cartId: string
  checkoutLink?: string | null
  onAttempt?: () => Promise<void> | void
  /**
   * Reports payment failures to the parent (null clears a previous failure
   * when the customer retries). Failure messages are already customer-safe.
   */
  onFailure: (failure: CheckoutFailure | null) => void
}

export function BTCPayButton({
  cartId,
  checkoutLink,
  onAttempt,
  onFailure,
}: BTCPayButtonProps) {
  const t = useTranslations('pro.checkout.payment.btcpayButton')
  const tErrors = useTranslations('pro.checkout.errors')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  // The modal streams events after handleClick returns; refs keep the
  // status-then-closed sequencing race-free without re-registering listeners.
  const handedOff = useRef(false)
  const navigated = useRef(false)

  // The BTCPay session (and its invoice) survives a closed modal — remember
  // it so another click reopens the same invoice instead of minting a new one.
  const invoiceRef = useRef<BTCPayInvoiceRef | null>(null)

  useEffect(() => {
    invoiceRef.current = null
    handedOff.current = false
    navigated.current = false
  }, [cartId])

  const goToProcessing = () => {
    if (navigated.current) {
      return
    }
    navigated.current = true
    // The frame lives outside React under <body>; leave it up and /processing
    // renders behind a fullscreen invoice, which reads as a stuck handover.
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
        // `payment_issue` (an Invalid invoice) also means money moved — the
        // return page explains it; re-enabling checkout would not.
        if (state === 'completed' || state === 'confirming' || state === 'payment_issue') {
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

    // A link the modal can't host (non-https, or not an `/i/{id}` permalink —
    // mocked checkout serves both) is not an error: it still redirects.
    invoiceRef.current = {
      origin: btcpayOriginFromCheckoutLink(link),
      invoiceId: invoiceId ?? invoiceIdFromCheckoutLink(link),
      link,
    }
    return invoiceRef.current
  }

  const handleClick = async () => {
    setIsLoading(true)
    onFailure(null)

    try {
      await onAttempt?.()
    } catch {
      // Analytics attribution is best-effort and must never block payment.
    }

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

    const { origin, invoiceId, link } = invoice
    if (!origin || !invoiceId) {
      // Nothing to open modally — same outcome as a modal that won't load.
      window.location.href = link
      return
    }

    try {
      await openBtcpayModal(origin, invoiceId, (event) => {
        if (
          event.kind === 'status' &&
          (isPaidStatus(event.status) || isPaymentIssueStatus(event.status))
        ) {
          // BTCPay has seen money move — hand over to /processing, which tracks
          // confirmation and forwards to the success page once the webhook
          // completes the order, or explains an invoice that went Invalid.
          handedOff.current = true
          goToProcessing()
          return
        }
        if (event.kind === 'status' && isExpiredStatus(event.status)) {
          // This invoice can never be paid — forget it so the next click
          // mints a fresh session instead of reopening a dead invoice.
          invoiceRef.current = null
          return
        }
        if (event.kind === 'close') {
          if (handedOff.current) {
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
