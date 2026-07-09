// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ModalModule = typeof import('./btcpay-modal')

// The module caches the script-load promise, so each test gets a fresh copy.
async function freshModule(): Promise<ModalModule> {
  vi.resetModules()
  return import('./btcpay-modal')
}

function makeBtcpayGlobal() {
  return {
    showInvoice: vi.fn(),
    hideFrame: vi.fn(),
    onModalReceiveMessage: vi.fn(),
    onModalWillLeave: vi.fn(),
  }
}

describe('btcpay-modal seam', () => {
  beforeEach(() => {
    delete (window as { btcpay?: unknown }).btcpay
    document.head.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives the BTCPay origin from a checkout link', async () => {
    const { btcpayOriginFromCheckoutLink } = await freshModule()

    expect(btcpayOriginFromCheckoutLink('https://btcpay.wcpos.com/i/abc123')).toBe(
      'https://btcpay.wcpos.com'
    )
    // http would frame an insecure origin into a secure page — refuse.
    expect(btcpayOriginFromCheckoutLink('http://btcpay.wcpos.com/i/abc')).toBeNull()
    expect(btcpayOriginFromCheckoutLink('not a url')).toBeNull()
  })

  it('extracts the invoice id from the /i/ permalink', async () => {
    const { invoiceIdFromCheckoutLink } = await freshModule()

    expect(invoiceIdFromCheckoutLink('https://btcpay.wcpos.com/i/AbC123xyz')).toBe(
      'AbC123xyz'
    )
    expect(
      invoiceIdFromCheckoutLink('https://btcpay.wcpos.com/invoice?id=abc')
    ).toBeNull()
  })

  it('recognises every paid-ish invoice status, case-insensitively', async () => {
    const { isPaidStatus } = await freshModule()

    for (const status of ['Processing', 'Settled', 'complete', 'PAID', 'confirmed']) {
      expect(isPaidStatus(status)).toBe(true)
    }
    for (const status of ['New', 'Expired', 'Invalid', '']) {
      expect(isPaidStatus(status)).toBe(false)
    }
  })

  it('opens the invoice and relays status + close events', async () => {
    const { openBtcpayModal } = await freshModule()
    const events: unknown[] = []

    const promise = openBtcpayModal('https://btcpay.wcpos.com', 'inv_1', (e) =>
      events.push(e)
    )

    const script = document.head.querySelector('script')
    expect(script?.getAttribute('src')).toBe('https://btcpay.wcpos.com/modal/btcpay.js')

    const btcpay = makeBtcpayGlobal()
    ;(window as { btcpay?: unknown }).btcpay = btcpay
    script?.onload?.(new Event('load'))
    await promise

    expect(btcpay.showInvoice).toHaveBeenCalledWith('inv_1')

    const onMessage = btcpay.onModalReceiveMessage.mock.calls[0][0]
    onMessage({ data: { invoiceId: 'inv_1', status: 'Processing' } })
    onMessage({ data: 'loaded' }) // relay noise — must be ignored
    // Another invoice's status must not drive this checkout.
    onMessage({ data: { invoiceId: 'inv_other', status: 'Settled' } })
    const onLeave = btcpay.onModalWillLeave.mock.calls[0][0]
    onLeave()

    expect(events).toEqual([
      { kind: 'status', invoiceId: 'inv_1', status: 'Processing' },
      { kind: 'close' },
    ])
  })

  it('rejects when the script fails to load, so callers can fall back', async () => {
    const { openBtcpayModal } = await freshModule()

    const promise = openBtcpayModal('https://btcpay.wcpos.com', 'inv_1', () => {})
    const script = document.head.querySelector('script')
    script?.onerror?.(new Event('error'))

    await expect(promise).rejects.toThrow('BTCPAY_MODAL_LOAD_FAILED')
  })

  it('reuses an already-present btcpay global without reinjecting', async () => {
    const { openBtcpayModal } = await freshModule()
    const btcpay = makeBtcpayGlobal()
    ;(window as { btcpay?: unknown }).btcpay = btcpay

    await openBtcpayModal('https://btcpay.wcpos.com', 'inv_2', () => {})

    expect(document.head.querySelector('script')).toBeNull()
    expect(btcpay.showInvoice).toHaveBeenCalledWith('inv_2')
  })
})
