/**
 * The analytics recorder seam.
 *
 * Modelled on the logging "sink" seam (src/lib/sinks): one small interface,
 * one or more adapters behind it, composed once at a wiring point. Callers
 * depend on {@link AnalyticsRecorder} and never name PostHog — exactly as log
 * callers depend on a logger and never name Discord/Loki/Sentry.
 *
 * `capture` is intentionally synchronous and fire-and-forget, like a LogTape
 * Sink: it must never throw into a caller and never block a request. The
 * underlying clients buffer (posthog-js in the browser, posthog-node on the
 * server), so "send" is enqueue, not await.
 *
 * Two runtimes, one shape: there is a browser adapter and a server adapter,
 * each gated by consent once at its own seam (the runtimes read consent
 * differently — see docs/adr/0011). Feature-flag/experiment resolution is a
 * latency-bound *read* and deliberately NOT part of this write interface.
 */
export interface AnalyticsEvent {
  /** Event name, e.g. 'checkout_completed', 'cta_clicked'. */
  name: string
  /** Arbitrary event properties forwarded to the backend. */
  properties?: Record<string, unknown>
  /**
   * Explicit distinct id. The server sets this; the browser omits it and lets
   * posthog-js manage identity from its own persisted distinct id.
   */
  distinctId?: string
}

export interface AnalyticsRecorder {
  /** Record one event. Fire-and-forget: never throws, never awaits. */
  capture(event: AnalyticsEvent): void
}
