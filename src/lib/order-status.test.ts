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
})
