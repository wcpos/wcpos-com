import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: vi.fn(),
  applyProOfferCatalogCachePolicy: vi.fn(),
}))

import { getProOfferCatalog } from '@/lib/pro-offer-catalog'
import { ProPriceLine } from './pro-price-line'

const mockGetProOfferCatalog = vi.mocked(getProOfferCatalog)

function renderWithIntl(ui: ReactElement | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <div data-testid="host">{ui}</div>
    </NextIntlClientProvider>
  )
}

describe('ProPriceLine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the starting price and currency from the yearly offer', async () => {
    mockGetProOfferCatalog.mockResolvedValue({
      offers: [
        { planId: 'yearly', price: { compactNarrow: '$129', currencyCode: 'usd' } },
        { planId: 'lifetime', price: { compactNarrow: '$399', currencyCode: 'usd' } },
      ],
      source: 'medusa',
    } as unknown as Awaited<ReturnType<typeof getProOfferCatalog>>)

    renderWithIntl(await ProPriceLine({ locale: 'en' }))

    const line = screen.getByText(/one-time payment/)
    expect(line).toHaveTextContent(
      'From $129 (USD) — one-time payment, never auto-renews.'
    )
    expect(line.textContent).toContain('$129')
    expect(line.textContent).toContain('USD')
    expect(line.textContent).not.toMatch(/\/yr|per year/)
  })

  it('renders nothing without a yearly offer', async () => {
    mockGetProOfferCatalog.mockResolvedValue({
      offers: [
        { planId: 'lifetime', price: { compactNarrow: '$399', currencyCode: 'usd' } },
      ],
      source: 'medusa',
    } as unknown as Awaited<ReturnType<typeof getProOfferCatalog>>)

    const result = await ProPriceLine({ locale: 'en' })
    expect(result).toBeNull()
    renderWithIntl(result)
    expect(screen.getByTestId('host')).toBeEmptyDOMElement()
  })
})
