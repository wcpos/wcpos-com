import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import {
  createDiscordReconcileDependencies,
  reconcileDiscordDirectory,
} from '@/lib/discord/default-sync'
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
    return NextResponse.json({ errorCode: 'unauthorized' }, { status: 401 })
  }

  try {
    const summary = await reconcileDiscordProRoles(createDiscordReconcileDependencies())
    infraLogger.info`Discord role reconciliation complete: ${JSON.stringify(summary)}`

    // The directory full pass rides the same cron (#522). Null until
    // DISCORD_DIRECTORY_CHANNEL_ID is configured; a directory failure must
    // not mask a completed role reconcile, so it reports instead of throwing.
    let directory = null
    try {
      directory = await reconcileDiscordDirectory()
      if (directory) {
        infraLogger.info`Discord directory reconciliation complete: ${JSON.stringify(directory)}`
      }
    } catch (directoryError) {
      infraLogger.error`Discord directory reconciliation failed: ${directoryError}`
      directory = { error: 'directory_reconciliation_failed' }
    }

    return NextResponse.json({ ok: true, summary, directory })
  } catch (error) {
    infraLogger.error`Discord role reconciliation failed: ${error}`
    return NextResponse.json({ errorCode: 'reconciliation_failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
