import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { locales } from "./src/i18n/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const discordInviteUrl = "https://discord.gg/MV3E9dSUD";
const localePattern = locales.join("|");

// Report-Only CSP: reports violations to /api/csp-report without blocking
// anything. Origins cover Stripe, PayPal, PostHog, Sentry, and the WidgetBot
// Discord embed. Promote to an enforcing Content-Security-Policy header once
// it has been verified clean against real checkout/analytics traffic.
//
// A report-only policy with no reporting directive is inert (the browser warns
// "the policy will have no effect"), so both reporting mechanisms are wired up:
//   - report-to  → the "csp-endpoint" named in the Reporting-Endpoints header
//     below (Chromium / Reporting API)
//   - report-uri → a direct path fallback for Safari/Firefox, which don't yet
//     honour report-to. Browsers that support report-to ignore report-uri.
//
// PostHog is self-hosted at ph.wcpos.com (NEXT_PUBLIC_POSTHOG_HOST) — the
// browser never talks to PostHog Cloud (*.posthog.com), so that origin is not
// listed. The remote-config/recorder scripts (script) and capture/flags calls
// (connect) both target the self-hosted origin directly; there is no /ingest
// first-party proxy. analytics.wcpos.com is the Umami instance — nothing on
// the site loads it today, but it stays allowed for a future re-add.
const CSP_REPORT_PATH = "/api/csp-report";
const cspReportOnly = [
  "default-src 'self'",
  // btcpay.wcpos.com: the Bitcoin checkout modal (script + invoice iframe).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com https://ph.wcpos.com https://analytics.wcpos.com https://challenges.cloudflare.com https://btcpay.wcpos.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://m.stripe.com https://m.stripe.network https://www.paypal.com https://www.sandbox.paypal.com https://ph.wcpos.com https://analytics.wcpos.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://challenges.cloudflare.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://www.paypal.com https://www.sandbox.paypal.com https://*.widgetbot.io https://discord.com https://challenges.cloudflare.com https://btcpay.wcpos.com",
  "object-src 'none'",
  "base-uri 'self'",
  // discord.com: the licence-card Connect form posts to /api/discord/claim,
  // which 303s to Discord's OAuth authorize page — browsers apply form-action
  // to the whole redirect chain (same reason PayPal is listed).
  "form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com https://discord.com",
  `report-uri ${CSP_REPORT_PATH}`,
  "report-to csp-endpoint",
].join("; ");

const securityHeaders = [
  // Clickjacking protection (legacy header; frame-ancestors is the modern
  // equivalent and ships once the CSP above is enforced).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 2 years; includeSubDomains covers updates.wcpos.com (also HTTPS-only).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  // 'payment' is deliberately left at its default so the Stripe
  // PaymentRequest API keeps working.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Names the "csp-endpoint" group that the CSP's report-to directive targets
  // (Reporting API). Same-origin path so it follows whichever host served the
  // page (wcpos.com / www).
  {
    key: "Reporting-Endpoints",
    value: `csp-endpoint="${CSP_REPORT_PATH}"`,
  },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  // Legacy WordPress URLs (pre-cutover site). SEO via 301s; no content
  // migration — see the cutover decision in the launch ledger.
  async redirects() {
    return [
      // Vanity redirect to the community Discord server (guild 711884517081612298).
      // Includes locale-prefixed variants generated from the shared next-intl
      // locale list. 302 (temporary) rather than 301 so browsers don't permanently
      // cache the invite if it's ever rotated/revoked.
      { source: '/discord', destination: discordInviteUrl, statusCode: 302 },
      { source: `/:locale(${localePattern})/discord`, destination: discordInviteUrl, statusCode: 302 },
      // High-value pages
      { source: '/pricing', destination: '/pro', statusCode: 301 },
      { source: '/shop', destination: '/pro', statusCode: 301 },
      { source: '/cart', destination: '/pro', statusCode: 301 },
      { source: '/checkout', destination: '/pro', statusCode: 301 },
      { source: '/product/:slug*', destination: '/pro', statusCode: 301 },
      { source: '/pro/changelog', destination: '/pro', statusCode: 301 },
      { source: '/my-account/orders', destination: '/account/orders', statusCode: 301 },
      { source: '/my-account/downloads', destination: '/account/downloads', statusCode: 301 },
      { source: '/my-account/:path*', destination: '/account', statusCode: 301 },
      { source: '/privacy-policy', destination: '/privacy', statusCode: 301 },
      { source: '/terms-of-service', destination: '/terms', statusCode: 301 },
      { source: '/refund-policy', destination: '/refunds', statusCode: 301 },
      { source: '/contact', destination: '/support', statusCode: 301 },
      { source: '/about', destination: 'https://wcpos.com/', statusCode: 301 },
      // Old docs pages that exist at the same path on docs.wcpos.com
      { source: '/docs/cart', destination: 'https://docs.wcpos.com/cart', statusCode: 301 },
      { source: '/docs/coupons', destination: 'https://docs.wcpos.com/coupons', statusCode: 301 },
      { source: '/docs/customers', destination: 'https://docs.wcpos.com/customers', statusCode: 301 },
      { source: '/docs/orders', destination: 'https://docs.wcpos.com/orders', statusCode: 301 },
      { source: '/docs/products', destination: 'https://docs.wcpos.com/products', statusCode: 301 },
      { source: '/docs/products/barcode-scanning', destination: 'https://docs.wcpos.com/products/barcode-scanning', statusCode: 301 },
      { source: '/docs/products/pos-only-products', destination: 'https://docs.wcpos.com/products/pos-only-products', statusCode: 301 },
      { source: '/docs/receipts', destination: 'https://docs.wcpos.com/receipts', statusCode: 301 },
      { source: '/docs/reports', destination: 'https://docs.wcpos.com/reports', statusCode: 301 },
      { source: '/docs/stores', destination: 'https://docs.wcpos.com/stores', statusCode: 301 },
      { source: '/docs/support', destination: 'https://docs.wcpos.com/support', statusCode: 301 },
      { source: '/docs/support/performance', destination: 'https://docs.wcpos.com/support/performance', statusCode: 301 },
      // Remaining docs/FAQ content was reorganized — send to the docs root
      { source: '/docs/:path*', destination: 'https://docs.wcpos.com', statusCode: 301 },
      { source: '/faq/:path*', destination: 'https://docs.wcpos.com', statusCode: 301 },
      { source: '/faq', destination: 'https://docs.wcpos.com', statusCode: 301 },
      // 2014-2017 blog archive and taxonomy pages — consolidate to home
      { source: '/blog', destination: 'https://wcpos.com/', statusCode: 301 },
      { source: '/:year(201[4-7])/:month(\\d{2})/:slug*', destination: 'https://wcpos.com/', statusCode: 301 },
      { source: '/category/:slug*', destination: 'https://wcpos.com/', statusCode: 301 },
      { source: '/tag/:slug*', destination: 'https://wcpos.com/', statusCode: 301 },
      { source: '/author/:slug*', destination: 'https://wcpos.com/', statusCode: 301 },
      // Legacy Pro plugin update icon. Old WP-Admin installs still request this
      // pre-cutover media-library path; keep it pointing at the canonical asset
      // so the plugin-update card renders an icon. New releases reference
      // /images/wcpos-pro.png directly (see woocommerce-pos-pro Pro_Plugin_Updater).
      { source: '/wp-content/uploads/2014/06/woopos-pro.png', destination: '/images/wcpos-pro.png', statusCode: 301 },
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },


  // AVIF first for next/image (WebP fallback is implicit). Only local
  // /public images are optimized today, so no remotePatterns.
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // React Compiler: build-time auto-memoization of client components
  // (scroll story, checkout, account tables) — removes re-render work
  // without hand-written useMemo/useCallback.
  reactCompiler: true,

  // Enable PPR via cacheComponents (Next.js 16+)
  // With this enabled, all routes are dynamic by default
  // Use 'use cache' directive to opt into caching
  cacheComponents: true,

  // Define cache profiles for use with cacheLife()
  cacheLife: {
    // 5 minute cache for API responses (GitHub releases, etc.)
    'api-short': {
      stale: 300,      // Serve stale for 5 min
      revalidate: 60,  // Start revalidating after 1 min
      expire: 3600,    // Expire after 1 hour
    },
    // 30 minute cache for roadmap data (revalidated on-demand via webhook)
    'roadmap': {
      stale: 1800,     // Serve stale for 30 min
      revalidate: 300,  // Start revalidating after 5 min
      expire: 7200,    // Expire after 2 hours
    },
    // 1 hour cache for Medusa product data (rarely changes)
    'products': {
      stale: 3600,      // Serve stale for 1 hour
      revalidate: 900,  // Start revalidating after 15 min
      expire: 86400,    // Expire after 24 hours
    },
  },
};

export default withNextIntl(nextConfig);
