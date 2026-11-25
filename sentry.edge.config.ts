import * as Sentry from '@sentry/nextjs'
import { stripRequest } from '@/lib/sentry-scrub/request'
import { scrubBreadcrumb, scrubEvent } from '@/lib/sentry-scrub/scrub'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    beforeSend(event) {
      return scrubEvent(stripRequest(event))
    },

    beforeBreadcrumb(breadcrumb) {
      return scrubBreadcrumb(breadcrumb)
    },
  })
}
