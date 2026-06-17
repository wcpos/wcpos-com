import { NextResponse } from 'next/server'
import { ApiError } from './errors'

/**
 * The single place the API error wire contract is defined: `{ error: string }`
 * plus an optional `code`, never a `status` field in the body.
 *
 * - `ApiError` (and subclasses) map to their own status, with `code` included
 *   only when set.
 * - Anything else maps to a generic `500` that never leaks the underlying
 *   message. Callers that delegate an *unknown* error here should log it first
 *   (this adapter is intentionally silent and side-effect free so it stays
 *   trivially testable); routes with a deliberate non-500 fallback for
 *   unclassified errors (e.g. register's 400 + message) keep that branch
 *   themselves rather than routing unknowns through here.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, ...(error.code ? { code: error.code } : {}) },
      { status: error.status }
    )
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
