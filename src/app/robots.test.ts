import { describe, it, expect } from 'vitest'
import robots from './robots'

describe('robots', () => {
  const result = robots()
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules
  const disallow = Array.isArray(rules?.disallow)
    ? rules.disallow
    : [rules?.disallow]

  it('disallows private and auth routes', () => {
    expect(disallow).toContain('/account')
    expect(disallow).toContain('/api/')
    expect(disallow).toContain('/login')
    expect(disallow).toContain('/register')
  })

  it('disallows locale-prefixed private routes', () => {
    expect(disallow).toContain('/*/login')
    expect(disallow).toContain('/*/account')
  })

  it('references the sitemap', () => {
    expect(result.sitemap).toBe('https://wcpos.com/sitemap.xml')
  })
})
