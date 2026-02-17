export function trackClientEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === 'undefined') {
    return
  }

  const posthog = (window as Window & {
    posthog?: {
      capture?: (name: string, props?: Record<string, unknown>) => void
    }
  }).posthog

  posthog?.capture?.(event, properties)
}
