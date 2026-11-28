import { deferSentryClient } from '@/lib/defer-sentry-client'

// The SDK is the largest first-load chunk. Queue early errors and fetch it after load.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  deferSentryClient(() => import('@/lib/sentry-client-entry'))
}
