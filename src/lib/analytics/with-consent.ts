import type { AnalyticsRecorder } from './types'

/**
 * Wrap a recorder so events are only captured when consent is granted.
 *
 * This is the GDPR gate expressed as a composable adapter — the same idea as a
 * sink that filters by level, but here the filter is consent. Wrapping once at
 * the wiring point means every caller of the resulting recorder is gated
 * without re-deriving "granted" itself.
 *
 * The predicate is synchronous: this decorator is for runtimes where consent
 * is a cheap synchronous read (the browser cookie). The server reads consent
 * asynchronously from request-scoped cookies() and gates at its own seam
 * instead; see docs/adr/0011.
 */
export function withConsent(
  inner: AnalyticsRecorder,
  isGranted: () => boolean
): AnalyticsRecorder {
  return {
    capture(event) {
      if (!isGranted()) return
      inner.capture(event)
    },
  }
}
