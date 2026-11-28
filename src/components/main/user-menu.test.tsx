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

const labels = {
  account: 'Translated account',
  licenses: 'Translated licenses',
  proDownloads: 'Translated pro downloads',
  orders: 'Translated orders',
  profile: 'Translated profile',
}

describe('UserMenu', () => {
  it('uses translated labels for the trigger and account link', () => {
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" labels={labels} />)

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
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" labels={labels} />)

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Translated account menu' })
    )

    expect(
      screen.getByRole('menuitem', { name: /Translated sign out/ })
    ).toBeInTheDocument()
  })

  it('lists every account page, with Pro downloads named apart from the public Downloads', () => {
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" labels={labels} />)

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Translated account menu' })
    )

    expect(
      screen.getAllByRole('menuitem').map((item) => item.getAttribute('href'))
    ).toEqual([
      '/account',
      '/account/licenses',
      '/account/downloads',
      '/account/orders',
      '/account/profile',
      null,
    ])
    expect(
      screen.getByRole('menuitem', { name: /Translated pro downloads/ })
    ).toHaveAttribute('href', '/account/downloads')
  })

  it('draws sign-out as a quiet muted row, not a red or destructive one', () => {
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" labels={labels} />)

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Translated account menu' })
    )

    const signOut = screen.getByRole('menuitem', { name: /Translated sign out/ })
    expect(signOut).toHaveClass(
      'text-muted-foreground',
      'focus:bg-accent',
      'focus:text-foreground'
    )
    expect(signOut.className).not.toContain('text-destructive')
    expect(signOut.className).not.toContain('text-wcpos-red-accent')
  })

  it('posts sign-out to the localized login fallback', () => {
    render(<UserMenu email="user@example.com" avatarUrl="" initials="UE" labels={labels} />)

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Translated account menu' })
    )

    expect(document.body.querySelector('form')).toHaveAttribute(
      'action',
      '/api/auth/logout?to=%2Ffr%2Flogin'
    )
  })
})
