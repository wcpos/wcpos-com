import { describe, expect, it } from 'vitest'
import nextConfig from '../next.config'
import { locales } from './i18n/config'

describe('nextConfig redirects', () => {
  it('redirects the bare and locale-prefixed Discord vanity URLs', async () => {
    const redirects = await nextConfig.redirects?.()

    expect(redirects).toContainEqual({
      source: '/discord',
      destination: 'https://discord.gg/MV3E9dSUD',
      statusCode: 302,
    })
    expect(redirects).toContainEqual({
      source: `/:locale(${locales.join('|')})/discord`,
      destination: 'https://discord.gg/MV3E9dSUD',
      statusCode: 302,
    })
  })

  it('redirects the legacy 2025 Pro icon to the canonical asset', async () => {
    const redirects = await nextConfig.redirects?.()

    expect(redirects).toContainEqual({
      source: '/wp-content/uploads/2025/07/wcpos-pro-icon.png',
      destination: '/images/wcpos-pro.png',
      statusCode: 301,
    })
  })
})
