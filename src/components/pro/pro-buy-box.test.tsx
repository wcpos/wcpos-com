import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProBuyBox, type ProBuyBoxOption } from './pro-buy-box'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
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

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

import { trackClientEvent } from '@/lib/analytics/client-events'

const options: ProBuyBoxOption[] = [
  {
    planId: 'yearly',
    handle: 'wcpos-pro-yearly',
    title: 'Yearly',
    subtitle: 'Updates & support for 1 year',
    badgeLabel: 'Most Popular',
    priceText: '$129',
    priceSuffix: '/yr',
    ctaNote: 'One-time payment — never auto-renews.',
    checkoutHref:
      '/pro/checkout?product=wcpos-pro-yearly&variant=variant_123&exp=pro_checkout_v1&exp_variant=control',
  },
  {
    planId: 'lifetime',
    handle: 'wcpos-pro-lifetime',
    title: 'Lifetime',
    subtitle: 'Updates forever',
    badgeLabel: null,
    priceText: '$399',
    priceSuffix: ' once',
    ctaNote: 'About 3 years of Yearly — then $0 forever.',
    checkoutHref:
      '/pro/checkout?product=wcpos-pro-lifetime&variant=variant_456&exp=pro_checkout_v1&exp_variant=control',
  },
]

describe('ProBuyBox', () => {
  it('selects the first option by default and links its checkout href', () => {
    render(
      <ProBuyBox
        options={options}
        ctaLabel="Get Started"
        experimentVariant="control"
      />
    )

    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')

    const cta = screen.getByRole('link', { name: 'Get Started' })
    expect(cta.getAttribute('href')).toContain('product=wcpos-pro-yearly')
    expect(
      screen.getByText('One-time payment — never auto-renews.')
    ).toBeInTheDocument()
  })

  it('switches CTA href and note when the other term is selected', () => {
    render(
      <ProBuyBox
        options={options}
        ctaLabel="Get Started"
        experimentVariant="control"
      />
    )

    fireEvent.click(screen.getByRole('radio', { name: /Lifetime/ }))

    expect(
      screen.getByRole('radio', { name: /Lifetime/ })
    ).toHaveAttribute('aria-checked', 'true')
    const cta = screen.getByRole('link', { name: 'Get Started' })
    expect(cta.getAttribute('href')).toContain('product=wcpos-pro-lifetime')
    expect(
      screen.getByText('About 3 years of Yearly — then $0 forever.')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('One-time payment — never auto-renews.')
    ).not.toBeInTheDocument()
  })

  it('moves selection with arrow keys and keeps only the selected row tabbable', () => {
    render(
      <ProBuyBox
        options={options}
        ctaLabel="Get Started"
        experimentVariant="control"
      />
    )

    const yearly = screen.getByRole('radio', { name: /Yearly/ })
    const lifetime = screen.getByRole('radio', { name: /Lifetime/ })

    expect(yearly).toHaveAttribute('tabIndex', '0')
    expect(lifetime).toHaveAttribute('tabIndex', '-1')

    yearly.focus()
    fireEvent.keyDown(yearly, { key: 'ArrowDown' })

    expect(lifetime).toHaveAttribute('aria-checked', 'true')
    expect(yearly).toHaveAttribute('tabIndex', '-1')
    expect(lifetime).toHaveAttribute('tabIndex', '0')
    expect(lifetime).toHaveFocus()

    fireEvent.keyDown(lifetime, { key: 'ArrowUp' })

    expect(yearly).toHaveAttribute('aria-checked', 'true')
    expect(yearly).toHaveFocus()
  })

  it('tracks the checkout click with the selected plan', () => {
    render(
      <ProBuyBox
        options={options}
        ctaLabel="Get Started"
        experimentVariant="value_copy"
      />
    )

    fireEvent.click(screen.getByRole('radio', { name: /Lifetime/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Get Started' }))

    expect(trackClientEvent).toHaveBeenCalledWith('click_start_checkout', {
      experiment: 'pro_checkout_v1',
      variant: 'value_copy',
      product: 'wcpos-pro-lifetime',
      plan: 'lifetime',
    })
  })

  it('links the guarantee to the refunds policy', () => {
    render(
      <ProBuyBox
        options={options}
        ctaLabel="Get Started"
        experimentVariant="control"
      />
    )

    expect(
      screen.getByRole('link', { name: '14-day money-back guarantee' })
    ).toHaveAttribute('href', '/refunds')
  })
})
