/**
 * Browser-sent Origin must match the request host for credential-bearing
 * POSTs (login/register). Blocks login-CSRF (an attacker page silently
 * signing the victim into an attacker-controlled account); requests without
 * an Origin header (server-to-server, tests, curl) pass — the protection
 * targets browsers, which always send Origin on cross-origin fetch.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true

  const host = request.headers.get('host')
  if (!host) return false

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
