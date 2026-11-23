import * as Sentry from '@sentry/nextjs'
import { scrubBreadcrumb, scrubEvent } from '@/lib/sentry-scrub/scrub'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

// Errors only: session replay and tracing were removed on 2026-11-23; bringing them back is a privacy/cookie-notice decision for Paul.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove email from user context if present
      if (event.user?.email) {
        event.user.email = '***@***'
      }
      return scrubEvent(event)
    },

    beforeBreadcrumb(breadcrumb) {
      return scrubBreadcrumb(breadcrumb)
    },

    // Ignore common errors that aren't actionable
    ignoreErrors: [
      // Network errors that are user-side
      'NetworkError',
      'Network request failed',
      // Browser extension errors
      'chrome-extension://',
      'moz-extension://',
    ],
  })
}
