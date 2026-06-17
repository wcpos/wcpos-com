import 'server-only'
import type { AnalyticsRecorder } from '@/lib/analytics/types'
import { getPostHogServerClient } from '@/services/core/external/posthog-node-client'

/**
 * Server PostHog adapter for the analytics recorder seam.
 *
 * Capture only — the latency-bound feature-flag read stays in posthog-service.
 * No-ops when no PostHog client is configured, mirroring the logging sinks that
 * silently drop when their backend is absent.
 *
 * Consent is NOT checked here: server consent is an async, request-scoped read
 * (cookies()), so the gate lives in trackServerEvent, the single server seam.
 * See docs/adr/0011.
 */
export function createPostHogServerRecorder(
  env: NodeJS.ProcessEnv
): AnalyticsRecorder {
  return {
    capture(event) {
      const ph = getPostHogServerClient(env)
      if (!ph) return
      if (!event.distinctId) return

      try {
        ph.capture({
          distinctId: event.distinctId,
          event: event.name,
          properties: event.properties,
        })
      } catch {
        // AnalyticsRecorder is fire-and-forget: never throw to callers.
      }
    },
  }
}
