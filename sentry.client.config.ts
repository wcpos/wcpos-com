import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Capture unhandled promise rejections
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    // Session replay sampling rates
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove email from user context if present
      if (event.user?.email) {
        event.user.email = '***@***'
      }
      return event
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
