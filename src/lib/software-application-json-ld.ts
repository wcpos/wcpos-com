/**
 * Must match the visible `downloads.page.steps.plugin.requirements` copy in
 * messages/en.json; software-application-json-ld.test.ts enforces that.
 */
export const WCPOS_SOFTWARE_REQUIREMENTS = 'WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+'

/** The WCPOS SoftwareApplication JSON-LD object, shared by the home and /downloads pages. */
export function wcposSoftwareApplication(extra: Record<string, unknown> = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WCPOS',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Windows, macOS, Linux, iOS, Android, Web',
    url: 'https://wcpos.com',
    image: 'https://wcpos.com/icon.png',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    softwareRequirements: WCPOS_SOFTWARE_REQUIREMENTS,
    ...extra,
  }
}
