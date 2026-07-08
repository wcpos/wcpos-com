import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PosScreen } from './pos-screen'
import { DeviceTerminal } from './terminal'

vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    if (namespace === 'home.story.pos' && key === 'charge') {
      return `Facturer ${values?.amount ?? ''}`
    }
    if (namespace === 'home.story.terminal' && key === 'tapToPay') {
      return 'Approcher pour payer'
    }
    return key
  },
}))

const formatUsd = (amount: number, maximumFractionDigits: number) =>
  new Intl.NumberFormat('fr', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(amount)

const byNormalizedText = (expected: string) => (_: string, element?: Element | null) =>
  element?.textContent?.replace(/\s+/g, ' ') === expected.replace(/\s+/g, ' ')

describe('homepage POS demo currency formatting', () => {
  it('formats product, cart, subtotal, and charge amounts with the active locale', () => {
    render(<PosScreen variant="tablet" />)

    expect(screen.getByText(byNormalizedText(formatUsd(29, 0)))).toBeInTheDocument()
    expect(screen.getByText(byNormalizedText(formatUsd(69, 2)))).toBeInTheDocument()
    expect(screen.getByText(byNormalizedText(`Facturer ${formatUsd(69, 0)}`))).toBeInTheDocument()
    expect(screen.queryByText('$69.00')).not.toBeInTheDocument()
    expect(screen.queryByText('Facturer $69')).not.toBeInTheDocument()
  })

  it('formats terminal tap-to-pay amounts with the active locale', () => {
    render(<DeviceTerminal />)

    expect(screen.getByText(byNormalizedText(formatUsd(69, 2)))).toBeInTheDocument()
    expect(screen.queryByText('$69.00')).not.toBeInTheDocument()
  })

  it('constrains the smart terminal amount to its screen width', () => {
    render(<DeviceTerminal model={2} />)

    expect(screen.getByText(byNormalizedText(formatUsd(69, 2)))).toHaveClass(
      'w-full',
      'whitespace-nowrap',
      'overflow-hidden',
      'text-sm'
    )
  })
})
