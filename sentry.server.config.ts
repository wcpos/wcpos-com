import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Only enable profiling in production
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive environment variables
      if (event.contexts?.runtime?.env) {
        const env = event.contexts.runtime.env
        delete env.GITHUB_PRIVATE_KEY
        delete env.KEYGEN_API_TOKEN
        delete env.MEDUSA_PUBLISHABLE_KEY
        delete env.LOKI_API_KEY
        delete env.RESEND_API_KEY
      }
      return event
    },
  })
}
