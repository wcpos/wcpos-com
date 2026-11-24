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

  it('draws sign-out in the readable red, not the dark-theme destructive red', () => {
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" />)

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Translated account menu' })
    )

    // text-destructive is 2.0:1 on the dark popover; wcpos-red-accent on the
    // primary/10 tint is at least 4.5:1 in both themes.
    const signOut = screen.getByRole('menuitem', { name: /Translated sign out/ })
    expect(signOut).toHaveClass(
      'text-wcpos-red-accent',
      'focus:bg-primary/10',
      'focus:text-wcpos-red-accent'
    )
    expect(signOut.className).not.toContain('text-destructive')
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
