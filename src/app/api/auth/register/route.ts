import { NextResponse } from 'next/server'
import { register, setAuthToken } from '@/lib/medusa-auth'
import { ApiError } from '@/lib/api/errors'
import { toErrorResponse } from '@/lib/api/to-error-response'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import {
  isPasswordTooShort,
  PASSWORD_TOO_SHORT_MESSAGE,
} from '@/lib/password-policy'

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Malformed JSON is client-caused: fall through to the 400 below instead of
  // treating it as a registration failure.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    password?: unknown
    firstName?: unknown
    lastName?: unknown
  }
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName : undefined
  const lastName = typeof body.lastName === 'string' ? body.lastName : undefined

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  if (isPasswordTooShort(password)) {
    return NextResponse.json(
      { error: PASSWORD_TOO_SHORT_MESSAGE },
      { status: 400 }
    )
  }

  try {
    const { token, customer } = await register({
      email,
      password,
      firstName,
      lastName,
    })
    await setAuthToken(token)

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    // Typed domain errors (AccountExistsError -> 409 ACCOUNT_EXISTS) carry their
    // own status/code via the adapter. They are routine user-caused rejections,
    // so log at info — error level fans out to alerts.
    if (error instanceof ApiError) {
      authLogger.info`Registration rejected: ${error.message}`
      return toErrorResponse(error)
    }
    // Everything else is an unclassified registration failure surfaced as a
    // 400 with its message (unchanged) — but unexpected, so log at error.
    authLogger.error`Registration failed unexpectedly: ${error}`
    const message =
      error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
