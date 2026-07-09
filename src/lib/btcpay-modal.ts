/**
 * The only place that knows BTCPay's modal script exists.
 *
 * BTCPay Server ships `{origin}/modal/btcpay.js`: it injects a fullscreen
 * iframe that renders the invoice with `?view=modal` (QR, on-chain/Lightning
 * tabs, wallet deep links) and relays the checkout's postMessages — the same
 * third-party-popover pattern as the PayPal SDK. The checkout posts `loaded`,
 * `close`, and `{ invoiceId, status }` where status is the raw Greenfield
 * invoice status (New / Processing / Settled / Expired / Invalid).
 */

interface BtcpayGlobal {
  showInvoice: (invoiceId: string) => void
  hideFrame: () => void
  onModalReceiveMessage: (cb: (event: MessageEvent) => void) => void
  onModalWillLeave: (cb: () => void) => void
}

declare global {
  interface Window {
    btcpay?: BtcpayGlobal
  }
}

export type BtcpayModalEvent =
  | { kind: 'status'; invoiceId: string; status: string }
  | { kind: 'close' }

const SCRIPT_LOAD_TIMEOUT_MS = 8000

// One load per page: btcpay.js warns and bails if initialized twice, so the
// promise is cached — including across buttons — keyed by nothing more than
// "first origin wins" (a page only ever talks to one BTCPay server).
let scriptPromise: Promise<BtcpayGlobal> | null = null

/**
 * The BTCPay origin is derived from the invoice's own checkoutLink
 * (`https://btcpay.example/i/abc123`) — zero config and automatically right
 * for whatever server issued the invoice.
 */
export function btcpayOriginFromCheckoutLink(checkoutLink: string): string | null {
  try {
    const url = new URL(checkoutLink)
    if (url.protocol !== 'https:') {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

/** `/i/{invoiceId}` is the invoice permalink — the id fallback when session
 * data doesn't carry `btc_invoice.id`. */
export function invoiceIdFromCheckoutLink(checkoutLink: string): string | null {
  try {
    const url = new URL(checkoutLink)
    const match = url.pathname.match(/^\/i\/([^/]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

function loadModalScript(origin: string): Promise<BtcpayGlobal> {
  if (window.btcpay) {
    return Promise.resolve(window.btcpay)
  }
  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise<BtcpayGlobal>((resolve, reject) => {
    const fail = (reason: string) => {
      scriptPromise = null
      reject(new Error(reason))
    }
    const timeout = setTimeout(() => fail('BTCPAY_MODAL_TIMEOUT'), SCRIPT_LOAD_TIMEOUT_MS)

    const script = document.createElement('script')
    script.src = `${origin}/modal/btcpay.js`
    script.async = true
    script.onload = () => {
      clearTimeout(timeout)
      if (window.btcpay) {
        resolve(window.btcpay)
      } else {
        fail('BTCPAY_MODAL_MISSING_GLOBAL')
      }
    }
    script.onerror = () => {
      clearTimeout(timeout)
      fail('BTCPAY_MODAL_LOAD_FAILED')
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

/**
 * Open the BTCPay invoice in the modal overlay and stream its events.
 *
 * Resolves once the modal is open. Throws when the script can't load —
 * callers fall back to the full-page redirect, so Bitcoin never breaks
 * harder than the pre-modal behavior.
 */
export async function openBtcpayModal(
  origin: string,
  invoiceId: string,
  onEvent: (event: BtcpayModalEvent) => void
): Promise<void> {
  const btcpay = await loadModalScript(origin)

  btcpay.onModalReceiveMessage((event: MessageEvent) => {
    // btcpay.js already origin-checks before relaying; filter to the shapes
    // the checkout actually posts, and only for the invoice we opened — a
    // stale or unrelated same-origin status must not drive this checkout.
    const data: unknown = event.data
    if (data && typeof data === 'object' && 'status' in data && 'invoiceId' in data) {
      const { invoiceId: id, status } = data as { invoiceId: unknown; status: unknown }
      if (id === invoiceId && typeof status === 'string') {
        onEvent({ kind: 'status', invoiceId: id, status })
      }
    }
  })
  btcpay.onModalWillLeave(() => {
    onEvent({ kind: 'close' })
  })

  btcpay.showInvoice(invoiceId)
}

/**
 * Take the fullscreen invoice frame down.
 *
 * btcpay.js mounts the iframe outside React, directly under `<body>`, so a
 * route change on its own leaves it covering whatever renders next.
 */
export function hideBtcpayModal(): void {
  window.btcpay?.hideFrame()
}

/** Statuses that mean BTCPay has seen the payment (settled or on the way). */
const PAID_STATUSES = new Set(['processing', 'settled', 'complete', 'confirmed', 'paid'])

export function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.has(status.toLowerCase())
}

/**
 * `Invalid` is not "unpaid": BTCPay marks an invoice invalid when money did
 * arrive but the payment failed (late, underpaid, or unconfirmed before the
 * monitoring window closed). It needs the same hand-off as a paid invoice —
 * the return page owns the outcome, and never the "you have not been charged"
 * copy that re-enabling checkout implies.
 */
const PAYMENT_ISSUE_STATUSES = new Set(['invalid'])

export function isPaymentIssueStatus(status: string): boolean {
  return PAYMENT_ISSUE_STATUSES.has(status.toLowerCase())
}
