import type { AnalyticsRecorder } from './types'

type WindowWithPostHog = Window & {
  posthog?: {
    capture?: (name: string, props?: Record<string, unknown>) => void
  }
}

/**
 * Browser PostHog adapter for the analytics recorder seam.
 *
 * Reads the posthog-js instance that initPostHogBrowser placed on window at
 * capture time (not at construction), so it picks up an instance created later
 * in the same session — e.g. when consent is granted via the banner. Identity
 * is left to posthog-js, so event.distinctId is ignored here.
 *
 * Consent is NOT checked here; compose with withConsent() at the wiring point.
 */
export function createPostHogBrowserRecorder(): AnalyticsRecorder {
  return {
    capture(event) {
      if (typeof window === 'undefined') return
      const posthog = (window as WindowWithPostHog).posthog
      try {
        posthog?.capture?.(event.name, event.properties)
      } catch {
        // AnalyticsRecorder is fire-and-forget: never throw to callers.
      }
    },
  }
}
