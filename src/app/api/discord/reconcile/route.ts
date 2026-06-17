import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { createDiscordReconcileDependencies } from '@/lib/discord/default-sync'
import { reconcileDiscordProRoles } from '@/lib/discord/sync'
import { infraLogger } from '@/lib/logger'

function isAuthorized(request: NextRequest): boolean {
  if (!env.CRON_SECRET) return false
  const authorization = request.headers.get('authorization')
  const cronHeader = request.headers.get('x-cron-secret')
  return authorization === `Bearer ${env.CRON_SECRET}` || cronHeader === env.CRON_SECRET
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await reconcileDiscordProRoles(createDiscordReconcileDependencies())
    infraLogger.info`Discord role reconciliation complete: ${JSON.stringify(summary)}`
    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    infraLogger.error`Discord role reconciliation failed: ${error}`
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
