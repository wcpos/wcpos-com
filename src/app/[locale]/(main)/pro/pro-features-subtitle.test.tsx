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
  it('renders the heading with no subtitle, then the feature groups', () => {
    render(
      <ProFeatureList
        heading="What Pro adds"
        groups={[
          {
            title: 'More registers, more stores',
            intro: 'For a second shop.',
            features: [
              { Icon: Store, title: 'More stores', description: 'Run several stores.' },
              { Icon: Users, title: 'Customers', description: 'Manage customers.' },
            ],
          },
        ]}
      />
    )

    const heading = screen.getByRole('heading', { level: 2, name: 'What Pro adds' })
    expect(heading.nextElementSibling).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: 'More registers, more stores' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'More stores' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Customers' })).toBeInTheDocument()
  })

  it.each(locales)('has no pro.features.subtitle key in %s', (locale) => {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8')
    const messages = JSON.parse(raw) as { pro: { features: Record<string, unknown> } }
    expect(messages.pro.features).not.toHaveProperty('subtitle')
  })
})
