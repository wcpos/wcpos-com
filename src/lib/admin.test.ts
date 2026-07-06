import { describe, expect, it } from 'vitest'
import { isAdmin, ADMIN_EMAILS } from './admin'

describe('isAdmin', () => {
  it('includes the owner in the allowlist', () => {
    expect(ADMIN_EMAILS).toContain('paul@kilbot.com.au')
  })

  it('matches an allowlisted email case-insensitively, trimming whitespace', () => {
    expect(isAdmin('Paul@Kilbot.com.au')).toBe(true)
    expect(isAdmin('  paul@kilbot.com.au ')).toBe(true)
  })

  it('rejects non-allowlisted or missing emails (fail closed)', () => {
    expect(isAdmin('someone@else.com')).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
    expect(isAdmin('')).toBe(false)
  })
})
