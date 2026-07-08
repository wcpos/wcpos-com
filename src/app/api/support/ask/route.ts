import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { apiLogger } from '@/lib/logger'
import { askAide, OpenclawError } from '@/lib/openclaw/client'
import { verifyTurnstile } from '@/lib/support/turnstile'
import { resolveStoreEnvironmentName } from '@/lib/store-environment-name'
import { consumeRateLimit, consumeDailyBudget } from '@/lib/support/rate-limit'
import { locales } from '@/i18n/config'

// Grounded answers can take ~20s — extend the function budget. Node is the
// default runtime; an explicit `export const runtime` is incompatible with the
// app's cacheComponents config, so it is intentionally omitted.
export const maxDuration = 60

const GATEWAY_TIMEOUT_MS = 45_000

type SupportErrorCode =
  | 'invalid_question'
  | 'bot_check_failed'
  | 'rate_limited'
  | 'budget_exhausted'
  | 'empty_answer'
  | 'gateway_rate_limited'
  | 'timeout'
  | 'unavailable'

function errorResponse(errorCode: SupportErrorCode, status: number): NextResponse {
  return NextResponse.json({ errorCode }, { status })
}

const bodySchema = z.object({
  question: z.string().trim().min(1).max(1000),
  locale: z.enum(locales).optional(),
  sessionId: z.string().min(1).optional(),
  turnstileToken: z.string().optional().default(''),
})

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return errorResponse('invalid_question', 400)
  }
  const { question, locale, sessionId, turnstileToken } = parsed.data
  const ip = clientIp(request)
  const host = request.headers.get('host')
  const envScope = resolveStoreEnvironmentName(host)

  if (!(await verifyTurnstile(turnstileToken, host, ip))) {
    return errorResponse('bot_check_failed', 403)
  }

  const ipLimit = await consumeRateLimit(envScope, ip)
  if (!ipLimit.success) {
    return errorResponse('rate_limited', 429)
  }
  const budget = await consumeDailyBudget(envScope, utcDay())
  if (!budget.success) {
    return errorResponse('budget_exhausted', 429)
  }

  const resolvedSessionId = sessionId ?? randomUUID()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS)
  try {
    const { answer, model, answered, sources } = await askAide({
      question,
      locale,
      sessionId: resolvedSessionId,
      signal: controller.signal,
    })
    // The contract guarantees a non-empty answer (escalations carry the
    // hand-off message), so an empty one is a malformed gateway payload.
    if (!answer) {
      apiLogger.error`Support ask got an empty answer from the gateway. ip=${ip}`
      return errorResponse('empty_answer', 502)
    }
    return NextResponse.json(
      { answer, model, answered, sources, sessionId: resolvedSessionId },
      { status: 200 }
    )
  } catch (err) {
    const gatewayError = err instanceof OpenclawError ? err : null
    // The gateway runs its own session/global caps — pass its 429 through
    // (its message distinguishes the per-session cap from the global one)
    // instead of masking it as an outage.
    if (gatewayError?.status === 429) {
      apiLogger.warn`Support ask rate-limited by the gateway. ip=${ip}`
      return errorResponse('gateway_rate_limited', 429)
    }
    const code = gatewayError?.code ?? 'unknown'
    apiLogger.error`Support ask failed. code=${code} ip=${ip} error=${err}`
    return errorResponse(code === 'timeout' ? 'timeout' : 'unavailable', 503)
  } finally {
    clearTimeout(timer)
  }
}
