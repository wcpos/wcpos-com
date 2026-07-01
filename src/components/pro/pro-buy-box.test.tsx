import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProBuyBox } from './pro-buy-box'
import type { ProBuyBoxOption } from './pro-buy-box-options'

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
    title: 'Yearly',
    subtitle: 'Updates & support for 1 year',
    badgeLabel: 'Most Popular',
    priceText: '$129',
    priceSuffix: '/yr',
    ctaNote: 'One-time payment — never auto-renews.',
    checkoutHref:
      '/pro/checkout?product=wcpos-pro-yearly&variant=variant_123&exp=pro_checkout_v1&exp_variant=control',
    eventProperties: {
      experiment: 'pro_checkout_v1',
      variant: 'control',
      product: 'wcpos-pro-yearly',
      plan: 'yearly',
    },
  },
  {
    planId: 'lifetime',
    title: 'Lifetime',
    subtitle: 'Updates forever',
    badgeLabel: null,
    priceText: '$399',
    priceSuffix: ' once',
    ctaNote: 'About 3 years of Yearly — then $0 forever.',
    checkoutHref:
      '/pro/checkout?product=wcpos-pro-lifetime&variant=variant_456&exp=pro_checkout_v1&exp_variant=control',
    eventProperties: {
      experiment: 'pro_checkout_v1',
      variant: 'control',
      product: 'wcpos-pro-lifetime',
      plan: 'lifetime',
    },
  },
]

function renderBuyBox(overrides: Partial<Parameters<typeof ProBuyBox>[0]> = {}) {
  return render(
    <ProBuyBox
      options={options}
      ctaLabel="Get Started"
      heading="Get Pro"
      subheading="One license, all features."
      termAriaLabel="License term"
      footer={<p>14-day money-back guarantee</p>}
      {...overrides}
    />
  )
}

describe('ProBuyBox', () => {
  it('selects the first option by default and links its checkout href', () => {
    renderBuyBox()

    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')

    const cta = screen.getByRole('link', { name: 'Get Started' })
    expect(cta.getAttribute('href')).toContain('product=wcpos-pro-yearly')
    expect(
      screen.getByText('One-time payment — never auto-renews.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('14-day money-back guarantee')
    ).toBeInTheDocument()
  })

  it('switches CTA href and note when the other term is selected', () => {
    renderBuyBox()

    const lifetime = screen.getByRole('radio', { name: /Lifetime/ })
    fireEvent.click(lifetime)

    expect(lifetime).toHaveAttribute('aria-checked', 'true')
    expect(lifetime).toHaveFocus()
    const cta = screen.getByRole('link', { name: 'Get Started' })
    expect(cta.getAttribute('href')).toContain('product=wcpos-pro-lifetime')
    expect(
      screen.getByText('About 3 years of Yearly — then $0 forever.')
    ).toBeInTheDocument()
  })

  it('implements the radio keyboard model: roving tabindex and arrow keys', () => {
    renderBuyBox()

    const radios = screen.getAllByRole('radio')
    // Single tab stop: only the selected radio is tabbable.
    expect(radios[0]).toHaveAttribute('tabindex', '0')
    expect(radios[1]).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(radios[0], { key: 'ArrowDown' })
    expect(
      screen.getByRole('radio', { name: /Lifetime/ })
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /Lifetime/ })).toHaveFocus()

    // Wraps around.
    fireEvent.keyDown(screen.getByRole('radio', { name: /Lifetime/ }), {
      key: 'ArrowRight',
    })
    expect(
      screen.getByRole('radio', { name: /Yearly/ })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('falls back to the first option when the selected plan disappears', () => {
    const { rerender } = renderBuyBox()

    fireEvent.click(screen.getByRole('radio', { name: /Lifetime/ }))
    // A revalidated payload drops the lifetime offer while client state
    // still says 'lifetime' — the box must not crash.
    rerender(
      <ProBuyBox
        options={[options[0]]}
        ctaLabel="Get Started"
        heading="Get Pro"
        subheading="One license, all features."
        termAriaLabel="License term"
      />
    )

    const cta = screen.getByRole('link', { name: 'Get Started' })
    expect(cta.getAttribute('href')).toContain('product=wcpos-pro-yearly')
    expect(
      screen.getByRole('radio', { name: /Yearly/ })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('tracks the checkout click with the selected plan payload', () => {
    renderBuyBox()

    fireEvent.click(screen.getByRole('radio', { name: /Lifetime/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Get Started' }))

    expect(trackClientEvent).toHaveBeenCalledWith('click_start_checkout', {
      experiment: 'pro_checkout_v1',
      variant: 'control',
      product: 'wcpos-pro-lifetime',
      plan: 'lifetime',
    })
  })
})
