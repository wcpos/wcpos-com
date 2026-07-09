import { capturePostHogBrowser } from './posthog-browser'
import type { AnalyticsRecorder } from './types'

/**
 * Browser PostHog adapter for the analytics recorder seam.
 *
 * Delegates to capturePostHogBrowser, which reads the posthog-js instance at
 * capture time (not at construction) so it picks up an instance created later in
 * the same session — e.g. when consent is granted via the banner — and queues
 * captures fired while the SDK's dynamic import is still in flight. Identity is
 * left to posthog-js, so event.distinctId is ignored here.
 *
 * Consent is NOT checked here; compose with withConsent() at the wiring point.
 */
export function createPostHogBrowserRecorder(): AnalyticsRecorder {
  return {
    capture(event) {
      try {
        capturePostHogBrowser(event.name, event.properties)
      } catch {
        // AnalyticsRecorder is fire-and-forget: never throw to callers.
      }
    },
  }
}
