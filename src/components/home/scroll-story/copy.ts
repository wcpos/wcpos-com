/**
 * Copy for the scroll-story acts — single source shared by the pinned
 * choreography and the reduced-motion static variant.
 *
 * Hardcoded English by convention: marketing sections (home, downloads) are
 * not translated; messages/*.json covers site chrome only. If marketing i18n
 * lands, this module migrates wholesale to message keys.
 */
export const storyCopy = {
  act1: {
    kicker: 'Point of Sale for WooCommerce',
    heading: 'Your WooCommerce store, at the counter.',
    body: 'WCPOS turns the tablet into your register — same catalog, same stock, same prices, even offline.',
    demoCta: { label: 'Try Live Demo', href: 'https://demo.wcpos.com/pos' },
    downloadCta: {
      label: 'Download Free',
      href: 'https://wordpress.org/plugins/woocommerce-pos/',
    },
    scrollHint: 'Scroll',
    trustBadges: ['5,000+ Active Stores', 'Free & Open Source', 'Since 2014'],
  },
  act2: {
    kicker: 'Every screen you own',
    heading: 'One POS. Web, desktop, iOS & Android.',
    body: 'Run the register on the tablet at the counter, the phone on the shop floor, or the laptop in the back office — same store, same data.',
    platforms: ['Web', 'Windows', 'macOS', 'iOS', 'Android'],
  },
  act3: {
    kicker: 'Bring your own hardware',
    heading: 'Works with the equipment you already have.',
    body: 'Card terminals, thermal receipt printers, barcode scanners — WCPOS doesn’t lock you into proprietary hardware. Plug in what’s already on your counter.',
  },
  act4: {
    kicker: 'Your store, your data',
    heading: 'Synced with WooCommerce. Yours, even offline.',
    body: 'Every sale lands in your WooCommerce store — you own the data, no middleman. Internet drops? Keep selling; WCPOS syncs when you’re back online.',
  },
} as const
