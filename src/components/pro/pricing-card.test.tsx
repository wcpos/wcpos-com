import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PricingCard } from './pricing-card'
import type { MedusaProduct } from '@/types/medusa'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockProduct: MedusaProduct = {
  id: 'prod_123',
  title: 'WCPOS Pro Yearly',
  handle: 'wcpos-pro-yearly',
  variants: [
    {
      id: 'variant_123',
      title: 'Default',
      prices: [{ currency_code: 'usd', amount: 129 }],
      options: [],
      product_id: 'prod_123',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      deleted_at: null,
      metadata: null,
    },
  ],
  collection_id: null,
  categories: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  metadata: null,
}

describe('PricingCard', () => {
  it('includes experiment metadata in checkout link', () => {
    render(
      <PricingCard
        product={mockProduct}
        experimentVariant="value_copy"
      />
    )

    const cta = screen.getByRole('link', { name: 'Get Instant Access' })
    const href = cta.getAttribute('href')

    expect(href).toContain('/pro/checkout?')
    expect(href).toContain('variant=variant_123')
    expect(href).toContain('product=wcpos-pro-yearly')
    expect(href).toContain('exp=pro_checkout_v1')
    expect(href).toContain('exp_variant=value_copy')
  })
})
