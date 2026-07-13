import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import {
  createDiscordLicenseFleetSnapshot,
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

  const fleet = createDiscordLicenseFleetSnapshot()

  // The directory full pass rides the same cron (#522). Null until
  // DISCORD_DIRECTORY_CHANNEL_ID is configured. Run both independent passes
  // concurrently so the fleet-wide role scan cannot consume the function's
  // entire time budget before the directory starts.
  const roleReconciliation = (async () => {
    try {
      const summary = await reconcileDiscordProRoles(createDiscordReconcileDependencies(fleet))
      infraLogger.info`Discord role reconciliation complete: ${JSON.stringify(summary)}`
      return { failed: false as const, summary }
    } catch (error) {
      infraLogger.error`Discord role reconciliation failed: ${error}`
      return { failed: true as const, summary: undefined }
    }
  })()

  const directoryReconciliation = (async () => {
    try {
      const directory = await reconcileDiscordDirectory(fleet.get)
      if (directory) {
        infraLogger.info`Discord directory reconciliation complete: ${JSON.stringify(directory)}`
      }
      return directory
    } catch (directoryError) {
      infraLogger.error`Discord directory reconciliation failed: ${directoryError}`
      return { error: 'directory_reconciliation_failed' }
    }
  })()

  const [role, directory] = await Promise.all([roleReconciliation, directoryReconciliation])

  if (role.failed) {
    return NextResponse.json({ errorCode: 'reconciliation_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, summary: role.summary, directory })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
