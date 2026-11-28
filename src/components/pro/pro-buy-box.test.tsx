import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProBuyBox } from './pro-buy-box'
import type { ProBuyBoxOption } from './pro-buy-box-options'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    prefetch,
    ...props
  }: {
    children: React.ReactNode
    href: string
    prefetch?: boolean
    [key: string]: unknown
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
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
    priceText: '$129',
    currencyCode: 'USD',
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
    priceText: '$399',
    currencyCode: 'USD',
    priceSuffix: 'once',
    ctaNote: 'Pay once — updates forever.',
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
      ctaLabel="Buy Pro"
      heading="Get Pro"
      subheading="One license, all features."
      termAriaLabel="License term"
      footer={<p>Try the free version first</p>}
      {...overrides}
    />
  )
}

describe('ProBuyBox', () => {
  it('prints each currency code once for English and Italian prices', () => {
    const { unmount } = renderBuyBox({
      options: [
        { ...options[0], priceText: '$129', currencyCode: 'USD', priceSuffix: '/yr' },
      ],
    })
    const englishText = screen.getByRole('radio', { name: /Yearly/ }).textContent ?? ''
    expect(englishText).toContain('$129')
    expect(englishText.split('USD').length - 1).toBe(1)

    unmount()
    renderBuyBox({
      options: [
        { ...options[0], priceText: '129 USD', currencyCode: 'USD', priceSuffix: '/anno' },
      ],
    })
    const italianText = screen.getByRole('radio', { name: /Yearly/ }).textContent ?? ''
    expect(italianText).toContain('129 USD')
    expect(italianText.split('USD').length - 1).toBe(1)
  })

  it('rings the selected radio dot with a valid card colour', () => {
    renderBuyBox()

    // --card holds bare HSL components, so a bare var(--card) is not a colour
    // and the browser drops the whole box-shadow.
    const [selectedDot, idleDot] = screen
      .getAllByRole('radio')
      .map((radio) => radio.querySelector('span[aria-hidden]')!)
    expect(selectedDot.className).toContain(
      '[box-shadow:inset_0_0_0_2.5px_hsl(var(--card))]'
    )
    expect(selectedDot.className).not.toMatch(/_var\(--card\)/)
    expect(idleDot.className).not.toContain('box-shadow')
  })

  it('selects the first option by default and links its checkout href', () => {
    renderBuyBox()

    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')

    const cta = screen.getByRole('link', { name: 'Buy Pro' })
    expect(cta.getAttribute('href')).toContain('product=wcpos-pro-yearly')
    expect(
      screen.getByText('One-time payment — never auto-renews.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Try the free version first')
    ).toBeInTheDocument()
  })

  it('does not prefetch checkout links because they resolve auth at request time', () => {
    renderBuyBox()

    expect(screen.getByRole('link', { name: 'Buy Pro' })).toHaveAttribute(
      'data-prefetch',
      'false'
    )
  })

  it('switches CTA href and note when the other term is selected', () => {
    renderBuyBox()

    const lifetime = screen.getByRole('radio', { name: /Lifetime/ })
    fireEvent.click(lifetime)

    expect(lifetime).toHaveAttribute('aria-checked', 'true')
    expect(lifetime).toHaveFocus()
    const cta = screen.getByRole('link', { name: 'Buy Pro' })
    expect(cta.getAttribute('href')).toContain('product=wcpos-pro-lifetime')
    expect(
      screen.getByText('Pay once — updates forever.')
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
        ctaLabel="Buy Pro"
        heading="Get Pro"
        subheading="One license, all features."
        termAriaLabel="License term"
      />
    )

    const cta = screen.getByRole('link', { name: 'Buy Pro' })
    expect(cta.getAttribute('href')).toContain('product=wcpos-pro-yearly')
    expect(
      screen.getByRole('radio', { name: /Yearly/ })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('carries no popularity badge on any term', () => {
    const { container } = renderBuyBox()
    expect(container).not.toHaveTextContent('Most Popular')
  })

  it('renders nothing for an empty options list', () => {
    const { container } = renderBuyBox({ options: [] })
    expect(container).toBeEmptyDOMElement()
  })

  it('tracks the checkout click with the selected plan payload', () => {
    renderBuyBox()

    fireEvent.click(screen.getByRole('radio', { name: /Lifetime/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Buy Pro' }))

    expect(trackClientEvent).toHaveBeenCalledWith('click_start_checkout', {
      experiment: 'pro_checkout_v1',
      variant: 'control',
      product: 'wcpos-pro-lifetime',
      plan: 'lifetime',
    })
  })

  it('renders the title as a level-2 heading', () => {
    renderBuyBox()

    const heading = screen.getByRole('heading', { level: 2, name: 'Get Pro' })
    expect(heading).toBeInTheDocument()
    expect(screen.getByTestId('pro-buy-box')).toContainElement(heading)
  })

  it('keeps each price beside its term with the suffix under the figure', () => {
    renderBuyBox()

    for (const option of options) {
      const figure = screen.getByText(option.priceText)
      const suffix = screen.getByText(option.priceSuffix)
      expect(figure.parentElement).toBe(suffix.parentElement)
      expect(suffix).toHaveClass('block')
    }
  })

  it('draws Lifetime as the quieter second row, highlighted only when chosen', () => {
    renderBuyBox()

    const [yearly, lifetime] = screen.getAllByRole('radio')
    expect(yearly).toHaveClass('py-3', 'lg:py-4', 'border-primary')
    expect(lifetime).toHaveClass('py-2', 'lg:py-2.5', 'border-border')
    expect(lifetime).not.toHaveClass('border-primary')
    // The idle dot is a full-strength ring in dark mode so it reads on the card.
    expect(lifetime.querySelector('span[aria-hidden]')).toHaveClass(
      'border-muted-foreground/40',
      'dark:border-muted-foreground'
    )

    fireEvent.click(lifetime)
    expect(lifetime).toHaveClass('border-primary', 'bg-primary/5')
  })

  it('shows skeleton figures and a visible status while prices load, with a working button', () => {
    renderBuyBox({
      loadingLabel: 'Loading prices…',
      options: options.map(({ eventProperties, ...option }) => ({
        ...option,
        priceText: '',
        currencyCode: '',
        checkoutHref: `/pro/checkout?product=${eventProperties?.product}`,
      })),
    })

    expect(screen.getByTestId('pro-buy-box-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('pro-buy-box')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Loading prices…')
    expect(screen.queryByText('USD')).toBeNull()

    const cta = screen.getByRole('link', { name: 'Buy Pro' })
    expect(cta).toHaveAttribute('href', '/pro/checkout?product=wcpos-pro-yearly')
    fireEvent.click(screen.getByRole('radio', { name: /Lifetime/ }))
    expect(cta).toHaveAttribute('href', '/pro/checkout?product=wcpos-pro-lifetime')

    // The placeholder never reports a checkout click.
    vi.mocked(trackClientEvent).mockClear()
    fireEvent.click(cta)
    expect(trackClientEvent).not.toHaveBeenCalled()
  })

  it('places a notice above the plans and a buy note above the button', () => {
    renderBuyBox({
      notice: <p>Prices could not be confirmed just now</p>,
      buyNote: 'This buys a second license.',
    })

    const notice = screen.getByText('Prices could not be confirmed just now')
    const firstRadio = screen.getAllByRole('radio')[0]
    expect(
      notice.compareDocumentPosition(firstRadio) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    const note = screen.getByText('This buys a second license.')
    const cta = screen.getByRole('link', { name: 'Buy Pro' })
    expect(note.nextElementSibling).toBe(cta)
  })
})
