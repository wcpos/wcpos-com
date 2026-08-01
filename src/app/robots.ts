import type { MetadataRoute } from 'next'

// Routes with no public content — auth, account, checkout and API endpoints.
const disallow = [
  '/account',
  '/api/',
  '/login',
  '/register',
  '/pro/checkout',
  // Locale-prefixed variants (e.g. /fr/login)
  '/*/account',
  '/*/login',
  '/*/register',
  '/*/pro/checkout',
]

// AI answer engines and their crawlers, named explicitly so access survives any
// future tightening of the `*` group. A named group REPLACES `*` for that bot,
// so each must carry the same disallow list. Training crawlers (GPTBot,
// ClaudeBot, Google-Extended) are deliberately allowed: presence in model
// corpora is what gets a brand recommended by AI answers (wcpos/wcpos-com#594).
const aiCrawlers = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'PerplexityBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'Google-Extended',
  'Bingbot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiCrawlers.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: 'https://wcpos.com/sitemap.xml',
  }
}
