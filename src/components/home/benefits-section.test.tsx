import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BenefitsSection } from './benefits-section'

vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/components/ui/section', () => ({
  Section: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}))

vi.mock('@/components/ui/section-heading', () => ({
  SectionHeading: ({ title, id }: { title: React.ReactNode; id?: string }) => (
    <h2 id={id}>{title}</h2>
  ),
}))

const formatUsd = (amount: number) =>
  new Intl.NumberFormat('fr', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

const byNormalizedText = (expected: string) => (_: string, element?: Element | null) =>
  element?.textContent?.replace(/\s+/g, ' ') === expected.replace(/\s+/g, ' ')

describe('BenefitsSection visuals', () => {
  it('formats sync visual prices with the active locale', () => {
    render(<BenefitsSection />)

    expect(screen.getAllByText(byNormalizedText(formatUsd(24))).length).toBeGreaterThan(0)
    expect(screen.getAllByText(byNormalizedText(formatUsd(18))).length).toBeGreaterThan(0)
    expect(screen.getAllByText(byNormalizedText(formatUsd(9))).length).toBeGreaterThan(0)
    expect(screen.queryByText('$24')).not.toBeInTheDocument()
  })
})
