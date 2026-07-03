import { NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

// Every accepted request fans out to a real email via the backend's
// password-reset subscriber, so gate this harder than sign-in. Fail-open.
const limiter = createRateLimiter({
  prefix: 'auth:forgot-password:ip',
  limit: 5,
  window: '15 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const { success } = await limiter.consume(clientIp(request))
  if (!success) {
    return NextResponse.json(
      { error: 'Too many reset requests. Please try again later.' },
      { status: 429 }
    )
  }

  // Malformed JSON is client-caused: fall through to the 400 below.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
  }
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    // Medusa itself never reveals whether the email has an account (201
    // either way), so success here carries no enumeration signal.
    await requestPasswordReset(email)
    return NextResponse.json({ success: true })
  } catch (error) {
    // Only Medusa being down / a 4xx-5xx lands here — unexpected, alert-worthy.
    authLogger.error`Password reset request failed unexpectedly: ${error}`
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
