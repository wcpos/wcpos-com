import { describe, expect, it } from 'vitest'
import { getOrderDisplayStatus, getOrderStatusLabelKey } from './order-status'

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
