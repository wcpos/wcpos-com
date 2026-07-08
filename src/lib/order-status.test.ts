import { describe, expect, it } from 'vitest'
import { getOrderDisplayStatus } from './order-status'

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
