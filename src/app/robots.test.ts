import { describe, it, expect } from 'vitest'
import robots from './robots'

describe('robots', () => {
  const result = robots()
  const ruleList = Array.isArray(result.rules) ? result.rules : [result.rules]
  const wildcard = ruleList.find((r) => r.userAgent === '*')
  const disallow = Array.isArray(wildcard?.disallow)
    ? wildcard.disallow
    : [wildcard?.disallow]

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

  // AI answer engines must stay welcome: retrieval bots gate citation
  // eligibility, and training bots gate brand presence in model corpora.
  it.each([
    'OAI-SearchBot',
    'GPTBot',
    'PerplexityBot',
    'Claude-SearchBot',
    'Claude-User',
    'Google-Extended',
    'Bingbot',
  ])('grants %s the same access as the wildcard group', (bot) => {
    const rule = ruleList.find((r) => r.userAgent === bot)
    expect(rule).toBeDefined()
    expect(rule?.allow).toBe('/')
    // A named group replaces `*` for that bot, so it must repeat the
    // private-route disallows or the bot would crawl them.
    expect(rule?.disallow).toEqual(disallow)
  })
})
