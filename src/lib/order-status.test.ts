import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ORDER_STATUS_LABELS,
  getOrderDisplayStatus,
  getOrderStatusLabelKey,
} from './order-status'

describe('getOrderDisplayStatus', () => {
  it('prefers payment status when order status is pending', () => {
    expect(
      getOrderDisplayStatus({
        status: 'pending',
        payment_status: 'captured',
      })
    ).toBe('Paid')
  })

  it('falls back to order status when payment status is unavailable', () => {
    expect(
      getOrderDisplayStatus({
        status: 'completed',
      })
    ).toBe('Completed')
  })



  it('uses caller-provided labels for known customer-facing statuses', () => {
    expect(
      getOrderDisplayStatus(
        {
          status: 'pending',
          payment_status: 'requires_action',
        },
        {
          actionRequired: 'Translated action required',
          authorized: 'Translated authorized',
          canceled: 'Translated canceled',
          paid: 'Translated paid',
          partiallyRefunded: 'Translated partially refunded',
          pending: 'Translated pending',
          refunded: 'Translated refunded',
          unknown: 'Translated unknown',
        }
      )
    ).toBe('Translated action required')
  })

  it('returns Unknown for empty values', () => {
    expect(getOrderDisplayStatus({})).toBe('Unknown')
    expect(getOrderDisplayStatus({ status: '   ' })).toBe('Unknown')
  })

  it('humanizes unknown status values', () => {
    expect(
      getOrderDisplayStatus({
        status: 'awaiting_fulfillment',
      })
    ).toBe('Awaiting Fulfillment')
  })
})

describe('getOrderStatusLabelKey', () => {
  it('resolves the same status the display label uses, as a key', () => {
    expect(getOrderStatusLabelKey({ payment_status: 'captured' })).toBe('paid')
    expect(getOrderStatusLabelKey({ payment_status: 'requires_action' })).toBe(
      'actionRequired'
    )
    expect(getOrderStatusLabelKey({ status: 'canceled' })).toBe('canceled')
  })

  it('prefers payment_status over status, matching the label', () => {
    expect(
      getOrderStatusLabelKey({ status: 'canceled', payment_status: 'paid' })
    ).toBe('paid')
  })

  it('returns unknown for empty and null for unmapped statuses', () => {
    expect(getOrderStatusLabelKey({})).toBe('unknown')
    expect(getOrderStatusLabelKey({ status: '   ' })).toBe('unknown')
    expect(getOrderStatusLabelKey({ status: 'awaiting_fulfillment' })).toBeNull()
  })
})

describe('zero-total orders', () => {
  // Medusa cannot capture a $0 payment ("Capture amount must be greater than
  // 0"), so a comp order's payment_status is permanently "not_paid" — which
  // used to render as "Pending" forever on an order that is already complete.
  const comp = { status: 'completed', payment_status: 'not_paid', total: 0 }

  it('presents a zero-total unpaid order as paid', () => {
    expect(getOrderStatusLabelKey(comp)).toBe('paid')
    expect(getOrderDisplayStatus(comp)).toBe('Paid')
  })

  it('uses the caller-supplied localized paid label', () => {
    expect(
      getOrderDisplayStatus(comp, {
        ...DEFAULT_ORDER_STATUS_LABELS,
        paid: 'Bezahlt',
      })
    ).toBe('Bezahlt')
  })

  it('leaves an already-paid zero-total order alone', () => {
    expect(
      getOrderStatusLabelKey({ payment_status: 'captured', total: 0 })
    ).toBe('paid')
  })

  it('never relabels a canceled zero-total order as paid', () => {
    // payment_status wins the raw resolution (existing, deliberate precedence
    // — see "prefers payment_status over status" above), so this shape lands on
    // pending. The guard's only job is to stop the zero-total rule turning that
    // into "Paid", which would read worse than the bug being fixed. Making
    // cancellation outrank payment_status outright would change every canceled
    // order, zero-total or not, and belongs in its own change.
    expect(
      getOrderStatusLabelKey({
        status: 'canceled',
        payment_status: 'not_paid',
        total: 0,
      })
    ).not.toBe('paid')
    // Migrated orders express cancellation through order.status alone.
    expect(getOrderStatusLabelKey({ status: 'canceled', total: 0 })).toBe(
      'canceled'
    )
    expect(
      getOrderDisplayStatus({ status: 'canceled', total: 0 })
    ).toBe('Canceled')
  })

  it('still reports a refunded zero-total order', () => {
    expect(
      getOrderStatusLabelKey({ payment_status: 'refunded', total: 0 })
    ).toBe('refunded')
  })

  it('does not touch a non-zero unpaid order — that really is pending', () => {
    const owed = { status: 'pending', payment_status: 'not_paid', total: 129 }
    expect(getOrderStatusLabelKey(owed)).toBe('pending')
    expect(getOrderDisplayStatus(owed)).toBe('Pending')
  })

  it('does not treat a missing total as zero', () => {
    expect(getOrderStatusLabelKey({ payment_status: 'not_paid' })).toBe(
      'pending'
    )
  })
})
