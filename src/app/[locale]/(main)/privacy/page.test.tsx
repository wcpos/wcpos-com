import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import en from '../../../../../messages/en.json'
import PrivacyPage from './page'

const privacy = en.legal.privacy

function resolve(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      privacy,
    )
  return typeof value === 'string' ? value : key
}

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () =>
    Object.assign((key: string) => resolve(key), {
      rich: (key: string) => resolve(key),
    }),
  ),
  setRequestLocale: vi.fn(),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

async function renderPage() {
  render(await PrivacyPage({ params: Promise.resolve({ locale: 'en' }) }))
}

function telemetrySection() {
  const heading = screen.getByRole('heading', {
    level: 2,
    name: privacy.telemetry.title,
  })
  return heading.closest('section')
}

describe('PrivacyPage', () => {
  it('puts the telemetry section at the stable plugin-telemetry anchor', async () => {
    await renderPage()

    expect(telemetrySection()?.id).toBe('plugin-telemetry')
  })

  it('renders every telemetry row, the exclusions and the opt-out inside that section', async () => {
    await renderPage()

    const text = telemetrySection()?.textContent ?? ''
    for (const item of Object.values(privacy.telemetry.items)) {
      expect(text).toContain(item.label)
      expect(text).toContain(item.body)
    }
    expect(text).toContain(privacy.telemetry.exclusions)
    expect(text).toContain(privacy.telemetry.destinations)
    expect(text).toContain(privacy.telemetry.optOut)
  })

  it('places the section between retention and rights', async () => {
    await renderPage()

    const heading = (name: string) =>
      screen.getByRole('heading', { level: 2, name })
    const retention = heading(privacy.retention.title)
    const telemetry = heading(privacy.telemetry.title)
    const rights = heading(privacy.rights.title)

    expect(
      retention.compareDocumentPosition(telemetry) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      telemetry.compareDocumentPosition(rights) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
