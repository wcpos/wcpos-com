import { isAnalyticsGranted } from './consent'
import { withConsent } from './with-consent'
import { createPostHogBrowserRecorder } from './posthog-browser-recorder'

/**
 * The browser analytics recorder: the PostHog browser adapter wrapped in the
 * consent gate, composed once here. Consent is enforced at this seam, so
 * callers of trackClientEvent never re-check it — the same way log callers
 * never re-decide which sinks an error reaches. Mirrors the logging seam wired
 * in client-logger.ts.
 */
const recorder = withConsent(createPostHogBrowserRecorder(), isAnalyticsGranted)

export function trackClientEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  recorder.capture({ name: event, properties })
}
