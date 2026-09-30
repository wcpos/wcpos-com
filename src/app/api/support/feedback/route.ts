import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiLogger } from '@/lib/logger'
import { sendFeedback, OpenclawError } from '@/lib/openclaw/client'
import { resolveStoreEnvironmentName } from '@/lib/store-environment-name'
import { consumeFeedbackRateLimit } from '@/lib/support/rate-limit'
import { locales } from '@/i18n/config'

const GATEWAY_TIMEOUT_MS = 10_000

// Desk statuses that mean "the vote is recorded, or never will be and that is
// fine": 404 unknown_answer (expired or foreign id) and 409 already_voted.
const ACCEPTED_DESK_STATUSES = new Set([200, 404, 409])

// Strict: only these fields, and never free text.
const bodySchema = z.strictObject({
  answerId: z.uuid(),
  sessionId: z.uuid(),
  vote: z.enum(['up', 'down']),
  locale: z.enum(locales).optional(),
})

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const { answerId, sessionId, vote, locale } = parsed.data
  const ip = clientIp(request)
  const envScope = resolveStoreEnvironmentName(request.headers.get('host'))

  const ipLimit = await consumeFeedbackRateLimit(envScope, ip)
  if (!ipLimit.success) {
    apiLogger.info`Support feedback rejected: rate limited. ip=${ip}`
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS)
  try {
    const status = await sendFeedback({
      answerId,
      sessionId,
      vote,
      locale,
      signal: controller.signal,
    })
    if (ACCEPTED_DESK_STATUSES.has(status)) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    apiLogger.warn`Support feedback refused by the gateway. status=${status}`
    return NextResponse.json({ ok: false }, { status: 503 })
  } catch (err) {
    const code = err instanceof OpenclawError ? err.code : 'unknown'
    apiLogger.warn`Support feedback failed. code=${code}`
    return NextResponse.json({ ok: false }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}
