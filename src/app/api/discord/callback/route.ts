import { NextRequest, NextResponse } from 'next/server'
import { DiscordApiClient } from '@/lib/discord/client'
import { getDiscordConfig, isDiscordConfigured } from '@/lib/discord/config'
import { consumeDiscordOAuthState } from '@/lib/discord/oauth-state'
import { claimConnectedDiscordMember } from '@/lib/discord/connected-member-service'
import { createDiscordRoleSyncDependencies } from '@/lib/discord/default-sync'
import { syncDiscordProRoleForMember } from '@/lib/discord/sync'
import { licenseClient } from '@/services/core/external/license-client'
import { infraLogger } from '@/lib/logger'

function callbackRedirect(request: NextRequest, path: string, status: string): NextResponse {
  const url = new URL(path, request.url)
  url.searchParams.set('discord', status)
  return NextResponse.redirect(url)
}

function statusToQuery(status: Awaited<ReturnType<typeof claimConnectedDiscordMember>>['status']): string {
  switch (status) {
    case 'claimed':
    case 'already_connected':
      return 'claimed'
    case 'seat_cap_reached':
      return 'seat_cap_reached'
    case 'blocked':
      return 'blocked'
    case 'license_not_active':
      return 'license_not_active'
    default:
      return 'error'
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const storedState = await consumeDiscordOAuthState()
  const returnTo = storedState?.returnTo ?? '/account/licenses'

  if (!code || !state || !storedState || storedState.state !== state || !storedState.licenseKey) {
    return callbackRedirect(request, returnTo, 'error')
  }

  try {
    const client = new DiscordApiClient(getDiscordConfig())
    const redirectUri = new URL('/api/discord/callback', request.url).toString()
    const accessToken = await client.exchangeCode({ code, redirectUri })
    const discordUser = await client.getCurrentUser(accessToken)

    const result = await claimConnectedDiscordMember({
      licenseKey: storedState.licenseKey,
      identity: {
        id: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar,
      },
      dependencies: {
        now: () => new Date(),
        validateLicenseKey: licenseClient.validateLicenseKey,
        updateLicenseMetadata: licenseClient.updateLicenseMetadata,
      },
    })

    if (isDiscordConfigured() && (result.status === 'claimed' || result.status === 'already_connected')) {
      try {
        await syncDiscordProRoleForMember(
          discordUser.id,
          createDiscordRoleSyncDependencies()
        )
      } catch (syncError) {
        infraLogger.warn`Discord role sync after member claim failed: ${syncError}`
      }
    }

    return callbackRedirect(request, returnTo, statusToQuery(result.status))
  } catch (error) {
    infraLogger.error`Discord member claim callback failed: ${error}`
    return callbackRedirect(request, returnTo, 'error')
  }
}
