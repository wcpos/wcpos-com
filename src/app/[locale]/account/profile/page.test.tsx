import { Children, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Locale } from '@/i18n/config'

const { getCustomerMock, getCustomerAuthMethodsMock } = vi.hoisted(() => ({
  getCustomerMock: vi.fn(async () => ({
    id: 'cus_1',
    email: 'customer@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
    phone: '',
    has_account: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    metadata: {},
    addresses: [],
  })),
  getCustomerAuthMethodsMock: vi.fn(async () => null),
}))

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}))
vi.mock('@/lib/medusa-auth', () => ({ getCustomer: getCustomerMock }))
vi.mock('@/lib/auth-methods', () => ({
  getCustomerAuthMethods: getCustomerAuthMethodsMock,
}))
vi.mock('@/lib/customer-profile-metadata', () => ({
  projectProfileMetadataForClient: () => ({}),
}))
vi.mock('@/lib/billing-profile', () => ({
  billingDetailsFromCustomer: () => null,
}))
vi.mock('@/lib/date-format', () => ({
  formatDateForLocale: () => 'January 1, 2026',
}))
vi.mock('@/lib/login-redirect', () => ({
  redirectToLoginClearingSession: vi.fn(),
}))
vi.mock('@/components/account/profile-edit-form', () => ({
  ProfileEditForm: () => null,
}))
vi.mock('@/components/account/change-email-card', () => ({
  ChangeEmailCard: ({ hasPassword }: { hasPassword: boolean }) => (
    <span data-testid="change-email-has-password">{String(hasPassword)}</span>
  ),
}))
vi.mock('@/components/account/delete-account-card', () => ({
  DeleteAccountCard: () => null,
}))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))

import ProfilePage from './page'

describe('ProfilePage', () => {
  it('requires a password when auth-method discovery is unavailable', async () => {
    const page = (await ProfilePage({
      params: Promise.resolve({ locale: 'en' }),
    })) as ReactElement<{ children: React.ReactNode }>
    const suspense = Children.toArray(page.props.children)[1] as ReactElement<{
      children: ReactElement<{ locale: Locale }>
    }>
    const content = suspense.props.children
    const renderContent = content.type as (props: {
      locale: Locale
    }) => Promise<ReactElement<{ children: React.ReactNode }>>

    const profile = await renderContent(content.props)
    const cards = Children.toArray(profile.props.children)

    expect(cards[1]).toMatchObject({ props: { hasPassword: true } })
  })
})
