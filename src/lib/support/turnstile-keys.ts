import { resolveStoreEnvironmentName } from '@/lib/store-environment-name'

/**
 * Host-keyed Turnstile keys — config in code, git as the flip mechanism
 * (same rationale as the committed Stripe publishable keys in
 * store-environment.ts). The site key is public by design: Cloudflare
 * renders it into client HTML. It lives in code — not a NEXT_PUBLIC_ env
 * var — because NEXT_PUBLIC_TURNSTILE_SITE_KEY was stored Sensitive on
 * Vercel (redacts to "" on `vercel env pull`) and locally prebuilt deploys
 * baked an empty key: the widget never rendered, every visitor posted an
 * empty token, and the server's fail-closed bot check 403'd every support
 * question in production (2026-07-08).
 *
 * This module is client-safe on purpose: the support page is statically
 * prerendered, so the chat resolves its site key from window.location at
 * mount instead of receiving request-time props.
 */

// Cloudflare's official always-pass demo widget (documented dummy keys, safe
// to commit). Test/preview hosts use it so the flow exercises a real widget
// without gating anyone on a challenge.
export const TEST_TURNSTILE_SITE_KEY = '1x00000000000000000000AA'
export const TEST_TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA'

// Public production site key for the wcpos.com widget (recovered from the
// Vercel runtime env via /api/health, 2026-07-08). A valid-looking
// NEXT_PUBLIC_TURNSTILE_SITE_KEY (real widget keys start with "0x") still
// overrides for rotation without a code change on remote builds; anything
// else — empty, redacted, junk — is ignored in favour of this literal.
const LIVE_TURNSTILE_SITE_KEY = '0x4AAAAAADvCTGAkZODVC0NE'

function liveSiteKeyOverride(value: string | undefined): string | null {
  const candidate = value?.trim()
  return candidate?.startsWith('0x') ? candidate : null
}

/**
 * Resolve the Turnstile site key for a host. Live hosts get the production
 * widget; test hosts (beta + Vercel previews) get the always-pass demo
 * widget; dev hosts (localhost, e2e) get no widget at all — the server side
 * (verifyTurnstile) mirrors this and admits dev-host requests untokened.
 */
export function resolveTurnstileSiteKey(
  host: string | null | undefined
): string | null {
  switch (resolveStoreEnvironmentName(host)) {
    case 'live':
      return (
        liveSiteKeyOverride(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) ??
        LIVE_TURNSTILE_SITE_KEY
      )
    case 'test':
      return TEST_TURNSTILE_SITE_KEY
    case 'dev':
      return null
  }
}
