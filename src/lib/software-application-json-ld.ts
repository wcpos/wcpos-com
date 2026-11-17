/** The WCPOS SoftwareApplication JSON-LD object, shared by the home and /downloads pages. */
export function wcposSoftwareApplication(extra: Record<string, unknown> = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WCPOS',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Windows, macOS, Linux, iOS, Android',
    url: 'https://wcpos.com',
    image: 'https://wcpos.com/icon.png',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    ...extra,
  }
}
