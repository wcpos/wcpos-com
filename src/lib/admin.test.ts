import { describe, expect, it } from 'vitest'
import { isAdmin, ADMIN_EMAILS } from './admin'

describe('isAdmin', () => {
  it('includes the owner in the allowlist', () => {
    expect(ADMIN_EMAILS).toContain('paul@kilbot.com')
  })

  it('matches an allowlisted email case-insensitively, trimming whitespace', () => {
    expect(isAdmin('Paul@Kilbot.com')).toBe(true)
    expect(isAdmin('  paul@kilbot.com ')).toBe(true)
  })

  it('rejects non-allowlisted or missing emails (fail closed)', () => {
    expect(isAdmin('someone@else.com')).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
    expect(isAdmin('')).toBe(false)
  })
})
