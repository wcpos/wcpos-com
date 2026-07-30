'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { resolveTurnstileSiteKey } from '@/lib/support/turnstile-keys'

/**
 * Shared Turnstile gating for the password-registration forms (the register
 * page and checkout's inline account step).
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
  /** Latest token; send '' to the register API while null. */
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

export function useTurnstileGate(): TurnstileGate {
  const [token, setToken] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const siteKey = useSyncExternalStore(
    subscribeNever,
    () => resolveTurnstileSiteKey(window.location.host),
    () => undefined
  )
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  // A blocked script fires no callback at all, so silence past the deadline
  // counts as failure — unless the visitor is mid-challenge.
  useEffect(() => {
    if (!siteKey || token || failed || interacting) return
    const id = setTimeout(() => setFailed(true), TURNSTILE_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [siteKey, token, failed, interacting])

  return {
    token,
    verifying:
      !failed && (siteKey === undefined || (Boolean(siteKey) && !token)),
    failed,
    reset: () => {
      // Deliberately leaves `failed` alone: clearing it would re-grey the
      // button for another full timeout. A later onSuccess clears it.
      setToken(null)
      turnstileRef.current?.reset()
    },
    widget: siteKey ? (
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={(value) => {
          setToken(value)
          setFailed(false)
          setInteracting(false)
        }}
        onError={() => {
          setToken(null)
          setFailed(true)
        }}
        onExpire={() => setToken(null)}
        onUnsupported={() => setFailed(true)}
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
