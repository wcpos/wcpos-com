import { NextResponse } from 'next/server'
import { login, setAuthToken } from '@/lib/medusa-auth'
import { InvalidCredentialsError } from '@/lib/api/errors'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Malformed JSON is client-caused: fall through to the 400 below instead of
  // treating it as a login failure.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    password?: unknown
  }
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  try {
    const token = await login(email, password)
    await setAuthToken(token)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Login failed'
    // Wrong email/password is routine user behaviour — keep it at info so it
    // never fans out to alerts. Anything else (Medusa down, 5xx, cookie
    // failure) is unexpected and logged at error.
    if (error instanceof InvalidCredentialsError) {
      authLogger.info`Login rejected: ${message}`
    } else {
      authLogger.error`Login failed unexpectedly: ${error}`
    }
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
