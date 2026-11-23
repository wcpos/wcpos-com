import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Store, Users } from 'lucide-react'
import { locales } from '@/i18n/config'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import { ProFeatureList } from '@/components/pro/pro-features'

describe('/pro features subtitle', () => {
  it('renders the heading followed directly by the features, with no subtitle', () => {
    const { container } = render(
      <ProFeatureList
        heading="What Pro adds"
        features={[
          { Icon: Store, title: 'More stores', description: 'Run several stores.' },
          { Icon: Users, title: 'Customers', description: 'Manage customers.' },
        ]}
      />
    )

    const heading = screen.getByRole('heading', { level: 2, name: 'What Pro adds' })
    expect(heading.nextElementSibling).toBeNull()
    expect(heading.parentElement?.querySelector('p')).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: 'More stores' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Customers' })).toBeInTheDocument()
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it.each(locales)('has no pro.features.subtitle key in %s', (locale) => {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8')
    const messages = JSON.parse(raw) as { pro: { features: Record<string, unknown> } }
    expect(messages.pro.features).not.toHaveProperty('subtitle')
  })
})
