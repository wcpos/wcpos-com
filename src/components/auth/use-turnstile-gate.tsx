'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { trackClientEvent } from '@/lib/analytics/client-events'
import { resolveTurnstileSiteKey } from '@/lib/support/turnstile-keys'

/**
 * Shared Turnstile gating for token-gated forms (the register page,
 * checkout's inline account step, and the support chat).
 *
 * The widget renders `interaction-only` rather than `invisible`: when
 * Cloudflare decides a visitor must solve an interactive challenge (VPNs,
 * low-reputation IPs), an invisible container can never display it, so the
 * visitor could never produce a token. `interaction-only` stays hidden until
 * that moment and then shows the challenge.
 *
 * Failure is never silent. If the widget errors, reports an unsupported
 * browser, or produces nothing before the timeout (an ad-blocker or firewall
 * eating challenges.cloudflare.com fires no callback at all), the gate flips
 * to `failed`: callers surface a hint and stop disabling submit, leaving the
 * server's fail-closed verifyTurnstile as the arbiter — a rejected submit
 * gets the visible bot_check_failed error instead of a forever-greyed button.
 */

// Long enough for slow networks to load the widget; short enough that a
// blocked script doesn't read as a broken form for long.
const TURNSTILE_TIMEOUT_MS = 15_000

// The host is stable for the lifetime of the page.
function subscribeNever() {
  return () => {}
}

export interface TurnstileGate {
  /** Latest token; send '' to the protected API while null. */
  token: string | null
  /** The widget may still produce a token — keep submit disabled. */
  verifying: boolean
  /** The check failed or timed out — show a hint and let submit through. */
  failed: boolean
  /** Drop the token and re-run the widget after a rejected submit. */
  reset: () => void
  /** Render inside the form, near the submit button. */
  widget: React.ReactNode
}

export function useTurnstileGate(enabled = true): TurnstileGate {
  const [token, setToken] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const siteKey = useSyncExternalStore(
    subscribeNever,
    () => resolveTurnstileSiteKey(window.location.host),
    () => undefined
  )
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  // One event per failure episode: onError re-fires on every auto-retry, so
  // dedupe until a success closes the episode. Consent-gated PostHog will
  // undercount here (ad-blockers that break Turnstile usually block analytics
  // too) — the authoritative counter is the server's empty-token
  // bot_check_failed log line; this event exists for session context.
  const reportedRef = useRef(false)
  const fail = useCallback(
    (reason: 'widget_error' | 'unsupported' | 'timeout') => {
      if (!reportedRef.current) {
        reportedRef.current = true
        trackClientEvent('turnstile_gate_failed', { reason })
      }
      setFailed(true)
    },
    []
  )

  useEffect(() => {
    if (!enabled) return
    return () => {
      setToken(null)
      setFailed(false)
      setInteracting(false)
      // Disabling closes any in-flight failure episode with the rest of the
      // gate state, so a failure after re-enabling reports as a fresh one.
      reportedRef.current = false
    }
  }, [enabled])

  // A blocked script fires no callback at all, so silence past the deadline
  // counts as failure — unless the visitor is mid-challenge.
  useEffect(() => {
    if (!enabled || !siteKey || token || failed || interacting) return
    const id = setTimeout(() => fail('timeout'), TURNSTILE_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [enabled, siteKey, token, failed, interacting, fail])

  return {
    token,
    verifying:
      enabled &&
      !failed &&
      (siteKey === undefined || (Boolean(siteKey) && !token)),
    failed,
    reset: () => {
      // Deliberately leaves `failed` alone: clearing it would re-grey the
      // button for another full timeout. A later onSuccess clears it.
      // The telemetry episode marker (reportedRef) survives reset() for the
      // same reason — the hint is still on screen, so a re-failure is the
      // same episode (one event per broken state, not per submit attempt),
      // and a success is genuinely a recovery from it.
      setToken(null)
      turnstileRef.current?.reset()
    },
    widget: enabled && siteKey ? (
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={(value) => {
          // A success after a reported failure means the episode was
          // transient (e.g. an auto-retry landed) — record the recovery so
          // failure counts aren't read as permanently lost signups.
          if (reportedRef.current) {
            trackClientEvent('turnstile_gate_recovered')
            reportedRef.current = false
          }
          setToken(value)
          setFailed(false)
          setInteracting(false)
        }}
        onError={() => {
          setToken(null)
          fail('widget_error')
        }}
        onExpire={() => setToken(null)}
        onUnsupported={() => fail('unsupported')}
        onBeforeInteractive={() => setInteracting(true)}
        onAfterInteractive={() => setInteracting(false)}
        onTimeout={() => {
          // An interactive challenge expired unsolved. The widget reloads
          // itself; re-arm the fallback timer so continued silence still
          // flips to failed instead of re-creating the dead-end.
          setToken(null)
          setInteracting(false)
        }}
        options={{ size: 'flexible', appearance: 'interaction-only' }}
      />
    ) : null,
  }
}
