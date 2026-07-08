import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { UserMenu } from './user-menu'

vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      common: {
        account: 'Translated account',
        accountMenu: 'Translated account menu',
        signOut: 'Translated sign out',
      },
    }
    return translations[namespace]?.[key] ?? key
  },
}))

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

describe('UserMenu', () => {
  it('uses translated labels for the trigger and account link', () => {
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" />)

    expect(
      screen.getByRole('button', { name: 'Translated account menu' })
    ).toBeInTheDocument()

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Translated account menu' })
    )

    expect(
      screen.getByRole('menuitem', { name: /Translated account/ })
    ).toHaveAttribute('href', '/account')
  })

  it('uses a translated sign-out label', () => {
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" />)

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Translated account menu' })
    )

    expect(
      screen.getByRole('menuitem', { name: /Translated sign out/ })
    ).toBeInTheDocument()
  })

  it('posts sign-out to the localized login fallback', () => {
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" />)

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Translated account menu' })
    )

    expect(document.body.querySelector('form')).toHaveAttribute(
      'action',
      '/api/auth/logout?to=%2Ffr%2Flogin'
    )
  })
})
