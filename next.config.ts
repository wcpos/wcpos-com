import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Report-Only CSP: logs violations to the browser console without blocking
// anything. Origins cover Stripe, PayPal, PostHog, Sentry, and the WidgetBot
// Discord embed. Promote to an enforcing Content-Security-Policy header once
// it has been verified clean against real checkout/analytics traffic.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://m.stripe.com https://m.stripe.network https://www.paypal.com https://www.sandbox.paypal.com https://*.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://www.paypal.com https://www.sandbox.paypal.com https://*.widgetbot.io https://discord.com",
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
