import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Report-Only CSP: logs violations to the browser console without blocking
// anything. Origins cover Stripe, PayPal, PostHog, Sentry, and the WidgetBot
// Discord embed. Promote to an enforcing Content-Security-Policy header once
// it has been verified clean against real checkout/analytics traffic.
//
// PostHog is self-hosted at analytics.wcpos.com (NEXT_PUBLIC_POSTHOG_HOST;
// see docs/plans/2026-02-17-posthog-ab-testing-design.md) — the browser never
// talks to PostHog Cloud (*.posthog.com), so that origin is not listed. The
// snippet (script) and capture/flags calls (connect) both target the
// self-hosted origin directly; there is no /ingest first-party proxy.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com https://analytics.wcpos.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://m.stripe.com https://m.stripe.network https://www.paypal.com https://www.sandbox.paypal.com https://analytics.wcpos.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://challenges.cloudflare.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://www.paypal.com https://www.sandbox.paypal.com https://*.widgetbot.io https://discord.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com",
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
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  // Legacy WordPress URLs (pre-cutover site). SEO via 301s; no content
  // migration — see the cutover decision in the launch ledger.
  async redirects() {
    return [
      // High-value pages
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
