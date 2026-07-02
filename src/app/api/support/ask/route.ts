import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { apiLogger } from '@/lib/logger'
import { askAide, OpenclawError } from '@/lib/openclaw/client'
import { verifyTurnstile } from '@/lib/support/turnstile'
import { consumeRateLimit, consumeDailyBudget } from '@/lib/support/rate-limit'

// Grounded answers can take ~20s — extend the function budget. Node is the
// default runtime; an explicit `export const runtime` is incompatible with the
// app's cacheComponents config, so it is intentionally omitted.
export const maxDuration = 60

const GATEWAY_TIMEOUT_MS = 45_000

const RATE_LIMIT_MESSAGE =
  "You're asking a lot of questions — please wait a few minutes, or hop into Discord."

const bodySchema = z.object({
  question: z.string().trim().min(1).max(1000),
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
    return NextResponse.json(
      { error: 'Please enter a question (up to 1000 characters).' },
      { status: 400 }
    )
  }
  const { question, sessionId, turnstileToken } = parsed.data
  const ip = clientIp(request)

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json(
      { error: 'Bot check failed. Please reload and try again.' },
      { status: 403 }
    )
  }

  const ipLimit = await consumeRateLimit(ip)
  if (!ipLimit.success) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }
  const budget = await consumeDailyBudget(utcDay())
  if (!budget.success) {
    return NextResponse.json(
      { error: 'The assistant is busy right now. Please try Discord for a faster answer.' },
      { status: 429 }
    )
  }

  const resolvedSessionId = sessionId ?? randomUUID()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS)
  try {
    const { answer, model, answered, sources } = await askAide({
      question,
      sessionId: resolvedSessionId,
      signal: controller.signal,
    })
    // The contract guarantees a non-empty answer (escalations carry the
    // hand-off message), so an empty one is a malformed gateway payload.
    if (!answer) {
      apiLogger.error`Support ask got an empty answer from the gateway. ip=${ip}`
      return NextResponse.json(
        { error: 'The assistant is temporarily unavailable. Please try Discord while we get it back.' },
        { status: 502 }
      )
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
      return NextResponse.json(
        { error: gatewayError.message || RATE_LIMIT_MESSAGE },
        { status: 429 }
      )
    }
    const code = gatewayError?.code ?? 'unknown'
    const message =
      code === 'timeout'
        ? 'That took too long. Please try again, or ask in Discord.'
        : 'The assistant is temporarily unavailable. Please try Discord while we get it back.'
    apiLogger.error`Support ask failed. code=${code} ip=${ip} error=${err}`
    return NextResponse.json({ error: message }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}
