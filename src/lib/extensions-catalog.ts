// JSON copied from wcpos/extensions catalog.json at source.commit, with no runtime fetch.
import catalog from './extensions-catalog.json'

export const EXTENSIONS_DOCS_URL = 'https://docs.wcpos.com/extensions'

export interface CatalogExtension {
  slug: string
  name: string
  description: string
  category: string
  requiresPro: boolean
  docsUrl: string
}

const DOCS_PATHS: Record<string, string> = {
  'email-invoice-gateway': '/payment/gateways/email-invoice',
  'mercadopago-terminal-for-woocommerce': '/payment/gateways/mercadopago-terminal',
  'mollie-terminal-for-woocommerce': '/payment/gateways/mollie-terminal',
  'payarc-terminal-for-woocommerce': '/payment/gateways/payarc-terminal',
  'paypal-reader-for-woocommerce': '/payment/gateways/paypal-reader',
  'square-terminal-for-woocommerce': '/payment/gateways/square-terminal',
  'stripe-terminal-for-woocommerce': '/payment/gateways/stripe-terminal',
  'sumup-terminal-for-woocommerce': '/payment/gateways/sumup-terminal',
  'windcave-terminal-for-woocommerce': '/payment/gateways/windcave-terminal',
  'wcpos-vipps': '/payment/gateways/vipps-mobilepay',
  'wcpos-atum': '/extensions/atum',
  'wcpos-polylang': '/extensions/polylang',
  'wcpos-storeapps-smart-coupons': '/extensions/storeapps-smart-coupons',
  'wcpos-wp-multilang': '/extensions/wp-multilang',
  'wcpos-wpml': '/extensions/wpml',
}

export const EXTENSIONS_CATALOG_SOURCE: {
  repo: string
  path: string
  commit: string
} = catalog.source

export const EXTENSIONS: CatalogExtension[] = catalog.extensions.map((entry) => ({
  slug: entry.slug,
  name: entry.name,
  description: entry.description,
  category: entry.category,
  requiresPro: entry.requires_pro,
  docsUrl: DOCS_PATHS[entry.slug]
    ? 'https://docs.wcpos.com' + DOCS_PATHS[entry.slug]
    : EXTENSIONS_DOCS_URL,
}))
