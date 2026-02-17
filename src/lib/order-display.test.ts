import { describe, it, expect } from 'vitest'
import { formatOrderAmount } from './order-display'

describe('formatOrderAmount', () => {
  it('formats Medusa order totals as display amounts (no cents conversion)', () => {
    expect(formatOrderAmount(129, 'usd')).toBe('$129.00')
  })

  it('formats decimal amounts correctly', () => {
    expect(formatOrderAmount(129.5, 'usd')).toBe('$129.50')
  })
})
