import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { register, setAuthToken } from '@/lib/medusa-auth'
import { ApiError } from '@/lib/api/errors'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import {
  isPasswordTooShort,
} from '@/lib/password-policy'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'
import { trackServerEvent } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { locales } from '@/i18n/config'

// Every accepted request can create a real Medusa customer account, so gate
// this harder than sign-in — a legitimate user registers once. Fail-open.
type RegisterErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'credentials_required'
  | 'password_too_short'
  | 'account_exists'
  | 'registration_failed'

function errorResponse(errorCode: RegisterErrorCode, status: number, extra?: Record<string, string>) {
  return NextResponse.json({ errorCode, ...extra }, { status })
}


function registrationLocale(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const candidates = value
    .split(',')
    .map((part, index) => {
      const [language = '', ...params] = part.trim().split(';')
      const qParam = params.find((param) => param.trim().startsWith('q='))
      const q = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '') : 1
      return {
        language: language.trim(),
        q: Number.isFinite(q) ? q : 0,
        index,
      }
    })
    .filter(({ language, q }) => Boolean(language) && language !== '*' && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)

  for (const { language } of candidates) {
    try {
      const [canonical] = Intl.getCanonicalLocales(language)
      const base = canonical?.split('-')[0]?.toLowerCase()
      if (base && locales.includes(base as (typeof locales)[number])) {
        return canonical
      }
    } catch {
      // Ignore malformed tags and continue through remaining candidates.
    }
  }

  return undefined
}

const limiter = createRateLimiter({
  prefix: 'auth:register:ip',
  limit: 5,
  window: '15 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return errorResponse('invalid_origin', 403)
  }

  const { success } = await limiter.consume(clientIp(request))
  if (!success) {
    return errorResponse('rate_limited', 429)
  }

  // Malformed JSON is client-caused: fall through to the 400 below instead of
  // treating it as a registration failure.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    password?: unknown
    firstName?: unknown
    lastName?: unknown
    locale?: unknown
  }
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName : undefined
  const lastName = typeof body.lastName === 'string' ? body.lastName : undefined
  const locale = registrationLocale(body.locale)

  if (!email || !password) {
    return errorResponse('credentials_required', 400)
  }

  if (isPasswordTooShort(password)) {
    return errorResponse('password_too_short', 400)
  }

  try {
    const { token, customer } = await register({
      email,
      password,
      firstName,
      lastName,
      locale,
    })
    await setAuthToken(token)

    // Top-of-funnel conversion: a visitor just became a (free) account holder.
    // Fire-and-forget, mirroring checkout_completed — trackServerEvent gates on
    // request consent and self-registers delivery, so the response is never
    // blocked and the event survives the post-response freeze. Prefer the
    // landing-page anon id so it stitches onto the same person as their visit;
    // fall back to the unique customer.id (never a shared placeholder, which
    // would merge unrelated signups into one PostHog person and break counts).
    try {
      const cookieStore = await cookies()
      const distinctId = cookieStore.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
      void trackServerEvent('signup_completed', {
        method: 'email',
        customer_id: customer.id,
        distinct_id: distinctId ?? customer.id,
        funnel_step: 'signup_completed',
        page: '/register',
      }).catch((trackingError) => {
        authLogger.warn`Signup tracking failed: ${trackingError}`
      })
    } catch (trackingError) {
      authLogger.warn`Signup tracking failed: ${trackingError}`
    }

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    // Typed domain errors (AccountExistsError -> 409 ACCOUNT_EXISTS) carry their
    // own status/code via the adapter. They are routine user-caused rejections,
    // so log at info — error level fans out to alerts.
    if (error instanceof ApiError) {
      authLogger.info`Registration rejected: ${error.message}`
      if (error.code === 'ACCOUNT_EXISTS') {
        return errorResponse('account_exists', error.status, { code: error.code })
      }
      return errorResponse('registration_failed', error.status)
    }
    // Everything else is an unclassified registration failure surfaced as a
    // 400 with its message (unchanged) — but unexpected, so log at error.
    authLogger.error`Registration failed unexpectedly: ${error}`
    return errorResponse('registration_failed', 400)
  }
}
