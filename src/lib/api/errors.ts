/**
 * Typed errors for the API route layer.
 *
 * Routes hand-roll `try/catch -> NextResponse.json({ errorCode }, { status })`.
 * A couple of older callers also branch on a legacy `code` (currently
 * ACCOUNT_EXISTS and order_pending). Carry both tokens on typed errors so the
 * HTTP adapter can expose only stable, translatable codes while messages stay
 * internal for logs/classification.
 *
 * Pure module — no `next/server` import — so these can be thrown from any layer
 * (services, lib, route handlers) without pulling the server runtime into a
 * service. The HTTP mapping lives in `to-error-response.ts`.
 *
 * Scope is deliberately narrow (see docs/adr/0010): this is NOT a universal
 * wrapper for every `{ error }` one-liner, and it does not touch the per-surface
 * auth/redirect contracts of docs/adr/0003.
 */

/**
 * An error that already knows how it should surface over HTTP.
 *
 * `status` is the HTTP status; `errorCode` is the translatable public error
 * token; `code` is an optional legacy branch token included only for callers
 * that still need it. The human message is internal-only.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly errorCode = code?.toLowerCase() ?? 'api_error'
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * The email is already registered.
 *
 * Maps to `409` + `errorCode: 'account_exists'`. The legacy `ACCOUNT_EXISTS`
 * code is still carried for the register client branch while the display copy
 * comes from translations.
 */
export class AccountExistsError extends ApiError {
  constructor(message = 'An account with this email already exists') {
    super(409, message, 'ACCOUNT_EXISTS', 'account_exists')
    this.name = 'AccountExistsError'
  }
}

/**
 * Email/password sign-in was rejected by Medusa (HTTP 401).
 *
 * Classified at the Medusa adapter seam in `login()` so the login route can
 * tell a routine wrong-password rejection (logged at info) apart from an
 * unexpected failure (logged at error, which fans out to alerts) without
 * re-sniffing provider strings.
 */
export class InvalidCredentialsError extends ApiError {
  constructor(message = 'Invalid email or password') {
    super(401, message, undefined, 'invalid_credentials')
    this.name = 'InvalidCredentialsError'
  }
}

/**
 * A password-reset token was rejected by Medusa (HTTP 401) — expired, already
 * used, or tampered with.
 *
 * Classified at the Medusa adapter seam in `resetPassword()` for the same
 * reason as InvalidCredentialsError: an expired link is routine user behaviour
 * (logged at info), not an alert-worthy failure.
 */
export class InvalidResetTokenError extends ApiError {
  constructor(
    message = 'This password reset link is invalid or has expired. Please request a new one.'
  ) {
    super(401, message, undefined, 'invalid_reset_token')
    this.name = 'InvalidResetTokenError'
  }
}
