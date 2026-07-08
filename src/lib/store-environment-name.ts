/**
 * Pure host → store-environment mapping, shared by server code
 * (store-environment.ts) and client code that must resolve the environment
 * from `window.location` (e.g. the support chat's Turnstile site key on the
 * statically prerendered support page). No server-only imports here.
 *
 * Fail-safe direction: an unknown host can never reach live — only the
 * canonical production hostnames resolve to the live environment.
 */

export type StoreEnvironmentName = 'live' | 'test' | 'dev'

const LIVE_HOSTNAMES = new Set(['wcpos.com', 'www.wcpos.com'])
const TEST_HOSTNAME_SUFFIXES = ['.vercel.app']
const TEST_HOSTNAMES = new Set(['beta.wcpos.com'])

/** Pure host → environment mapping (exported for tests). */
export function resolveStoreEnvironmentName(
  host: string | null | undefined
): StoreEnvironmentName {
  const hostname = (host ?? '').trim().toLowerCase().split(':')[0]

  if (LIVE_HOSTNAMES.has(hostname)) return 'live'
  if (TEST_HOSTNAMES.has(hostname)) return 'test'
  if (TEST_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return 'test'
  }
  return 'dev'
}
