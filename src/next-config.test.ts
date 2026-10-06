import { describe, expect, it } from 'vitest'
import nextConfig from '../next.config'
import { locales } from './i18n/config'

describe('nextConfig redirects', () => {
  it('redirects the bare and locale-prefixed Discord vanity URLs', async () => {
    const redirects = await nextConfig.redirects?.()

    expect(redirects).toContainEqual({
      source: '/discord',
      destination: 'https://discord.gg/GCEeEVpEvX',
      statusCode: 302,
    })
    expect(redirects).toContainEqual({
      source: `/:locale(${locales.join('|')})/discord`,
      destination: 'https://discord.gg/GCEeEVpEvX',
      statusCode: 302,
    })
  })

  it('sends legacy docs pages that moved straight to their final docs URL', async () => {
    const redirects = await nextConfig.redirects?.()
    expect(redirects).toContainEqual({
      source: '/docs/cart',
      destination: 'https://docs.wcpos.com/pos/cart',
      statusCode: 301,
    })
    expect(redirects).toContainEqual({
      source: '/docs/products/barcode-scanning',
      destination: 'https://docs.wcpos.com/pos/product-panel/barcode-scanning',
      statusCode: 301,
    })
    expect(redirects).not.toContainEqual({
      source: '/docs/cart',
      destination: 'https://docs.wcpos.com/cart',
      statusCode: 301,
    })
    expect(redirects).not.toContainEqual({
      source: '/docs/products/barcode-scanning',
      destination: 'https://docs.wcpos.com/products/barcode-scanning',
      statusCode: 301,
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
