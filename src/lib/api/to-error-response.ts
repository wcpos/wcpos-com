import { NextResponse } from 'next/server'
import { ApiError } from './errors'

/**
 * The single place the API error wire contract is defined: `{ errorCode }`
 * plus an optional legacy `code`, never English display text or a `status`
 * field in the body.
 *
 * - `ApiError` (and subclasses) map to their own status, with `errorCode`
 *   always present and `code` included only when set.
 * - Anything else maps to a generic `500` that never leaks the underlying
 *   message. Callers that delegate an *unknown* error here should log it first
 *   (this adapter is intentionally silent and side-effect free so it stays
 *   trivially testable); routes with a deliberate non-500 fallback for
 *   unclassified errors keep that branch
 *   themselves rather than routing unknowns through here.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { errorCode: error.errorCode, ...(error.code ? { code: error.code } : {}) },
      { status: error.status }
    )
  }

  return NextResponse.json(
    { errorCode: 'internal_server_error' },
    { status: 500 }
  )
}
