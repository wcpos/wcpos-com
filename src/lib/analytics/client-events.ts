import { readAnalyticsConsent } from './consent'

export function trackClientEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === 'undefined') {
    return
  }

  // GDPR: no client-side capture without explicit analytics consent.
  if (readAnalyticsConsent() !== 'granted') {
    return
  }

  const posthog = (window as Window & {
    posthog?: {
      capture?: (name: string, props?: Record<string, unknown>) => void
    }
  }).posthog

  posthog?.capture?.(event, properties)
}
