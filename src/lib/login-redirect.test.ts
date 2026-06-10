import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

import {
  loginPathForLocale,
  redirectToLoginClearingSession,
} from './login-redirect'

describe('loginPathForLocale', () => {
  it('omits the prefix for the default locale (as-needed)', () => {
    expect(loginPathForLocale('en')).toBe('/login')
  })

  it('prefixes other locales', () => {
    expect(loginPathForLocale('fr')).toBe('/fr/login')
    expect(loginPathForLocale('de')).toBe('/de/login')
  })
})

describe('redirectToLoginClearingSession', () => {
  it('routes through the cookie-clearing logout handler with an encoded target', () => {
    redirectToLoginClearingSession('fr')
    expect(mockRedirect).toHaveBeenCalledWith(
      '/api/auth/logout?to=%2Ffr%2Flogin'
    )
  })
})
