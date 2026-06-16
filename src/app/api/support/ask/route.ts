import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { askAide, OpenclawError } from '@/lib/openclaw/client'
import { verifyTurnstile } from '@/lib/support/turnstile'
import { consumeRateLimit, consumeDailyBudget } from '@/lib/support/rate-limit'

// agent_session executions are slow — extend the function budget. Node is the
// default runtime; an explicit `export const runtime` is incompatible with the
// app's cacheComponents config, so it is intentionally omitted.
export const maxDuration = 60

const GATEWAY_TIMEOUT_MS = 45_000

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
    return NextResponse.json(
      { error: "You're asking a lot of questions — please wait a few minutes, or hop into Discord." },
      { status: 429 }
    )
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
    const { answer, model } = await askAide({
      question,
      sessionId: resolvedSessionId,
      signal: controller.signal,
    })
    if (!answer) {
      return NextResponse.json(
        { error: "Aide couldn't find an answer to that. Try rephrasing, or ask in Discord." },
        { status: 502 }
      )
    }
    return NextResponse.json({ answer, model, sessionId: resolvedSessionId }, { status: 200 })
  } catch (err) {
    const code = err instanceof OpenclawError ? err.code : 'unknown'
    const message =
      code === 'timeout'
        ? 'That took too long. Please try again, or ask in Discord.'
        : 'The assistant is temporarily unavailable. Please try Discord while we get it back.'
    console.error('support/ask failed', { code, ip })
    return NextResponse.json({ error: message }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}
