/**
 * The Medusa customer session cookie name.
 *
 * Runtime-neutral on purpose: this module imports NOTHING (no `server-only`,
 * no `next/headers`), so it can be imported from BOTH the server module
 * (`medusa-auth.ts`, which reads/writes the cookie) AND the edge middleware
 * (`middleware.ts`, which only reads it). The httpOnly write options live in
 * `medusa-auth.ts` because only the server ever sets the cookie.
 */
export const MEDUSA_TOKEN_COOKIE = 'medusa-token'
