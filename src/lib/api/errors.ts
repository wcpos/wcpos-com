/**
 * Typed errors for the API route layer.
 *
 * Routes hand-roll `try/catch -> NextResponse.json({ error }, { status })`. The
 * variation is mostly in the (status, message) pair, but a couple of errors are
 * *machine-readable*: the client branches on a `code` (currently ACCOUNT_EXISTS
 * and order_pending). For those, carry the HTTP encoding on a typed error so a
 * single adapter (`toErrorResponse`) owns the wire contract and is tested once.
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
 * `status` is the HTTP status; `code` is an optional machine-readable token that
 * is included in the body ONLY when present — most errors are display-only and
 * carry no code.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * The email is already registered.
 *
 * Maps to `409` + `code: 'ACCOUNT_EXISTS'` — the one error code the register
 * client branches on (see register-page-client.tsx). Thrown at the Medusa
 * adapter seam in `register()` so the route never has to re-sniff provider
 * strings.
 */
export class AccountExistsError extends ApiError {
  constructor(message = 'An account with this email already exists') {
    super(409, message, 'ACCOUNT_EXISTS')
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
    super(401, message)
    this.name = 'InvalidCredentialsError'
  }
}

/**
 * A password-reset token was rejected by Medusa (HTTP 401) — expired, already
 * used, or tampered with.
 *
 * Classified at the Medusa adapter seam in `resetPassword()` for the same
 * reason as InvalidCredentialsError: an expired link is routine user behaviour
 * (logged at info), not an alert-worthy failure. Display-only, no code.
 */
export class InvalidResetTokenError extends ApiError {
  constructor(
    message = 'This password reset link is invalid or has expired. Please request a new one.'
  ) {
    super(401, message)
    this.name = 'InvalidResetTokenError'
  }
}
